import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { AiraloTopup } from "@/types/airaloTopup";
import { safeJsonParse } from "@/lib/apiResilience";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

export const config = { api: { bodyParser: false } };

async function buffer(readable: any) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"];
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      console.log(`Session ${session.id} not paid yet.`);
      return res.status(200).json({ received: true, status: "payment_not_paid" });
    }

    if (!session.amount_total || session.amount_total === 0) {
      console.warn(`Session ${session.id} has amount_total=0 — commande bloquée.`);
      return res.status(200).json({ received: true, status: "zero_amount_blocked" });
    }

    try {
      const {
        packageId,
        firstName,
        lastName,
        is_top_up,
        sim_iccid,
        promo_code,
        partner_code,
      } = session.metadata || {};

      const topUpFirstName = is_top_up === "true" ? (firstName || session.customer_details?.name?.split(" ")[0] || null) : null;
      const topUpLastName = is_top_up === "true" ? (lastName || session.customer_details?.name?.split(" ").slice(1).join(" ") || null) : null;

      console.log("Package ID:", packageId);
      if (!packageId) {
        console.error("Package ID not found in session metadata for session:", session.id);
        throw new Error("Package ID not found in session metadata");
      }

      const customerEmail =
        session.customer_details?.email ||
        session.metadata?.email ||
        "no-email@example.com";

      const { data: packageData, error: packageError } = await supabase
        .from("airalo_packages")
        .select("*")
        // FIX 3 : ne pas tronquer l'ID avec split("-topup")[0] pour chercher le package
        // On cherche d'abord le package exact, puis en fallback sans le suffixe -topup
        .or(`id.eq.${packageId},id.eq.${packageId.replace(/-topup$/, "")}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (packageError || !packageData) {
        console.error(
          `Failed to retrieve package data for packageId ${packageId}: ${packageError?.message || "not found"}`,
        );
        throw new Error(
          `Failed to retrieve package data: ${packageError?.message || "not found"}`,
        );
      }

      if (is_top_up === "true" && sim_iccid) {
        console.log(
          `Processing top-up for ICCID: ${sim_iccid} with package ID: ${packageId}, session: ${session.id}`,
        );

        const topUpApiRoute = `${process.env.NEXT_PUBLIC_BASE_URL}/api/process-airalo-topup`;
        console.log(`Calling local top-up API: ${topUpApiRoute}`);

        const topUpResponse = await fetch(topUpApiRoute, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sim_iccid: sim_iccid,
            airalo_package_id: packageId,
          }),
        });

        const parseResult = await safeJsonParse<{
          success: boolean;
          message?: string;
          airalo_topup_id?: string;
          airalo_response_data?: any;
        }>(topUpResponse);

        if (!parseResult.success || !parseResult.data) {
          console.error(
            `Failed to parse top-up API response: ${parseResult.error}`,
            parseResult.rawText ? `Raw: ${parseResult.rawText}` : ""
          );
          throw new Error(
            `Failed to process Airalo top-up: ${parseResult.error || "Invalid response"}`,
          );
        }

        const topUpApiResult = parseResult.data;

        if (!topUpApiResult.success) {
          console.error(
            `Failed to process Airalo top-up via local API: ${topUpResponse.status} - ${topUpApiResult.message || "Unknown API error"}`,
          );
          throw new Error(
            `Failed to process Airalo top-up: ${topUpApiResult.message || topUpResponse.statusText}`,
          );
        }

        console.log("Local Airalo top-up API processed successfully:", topUpApiResult);

        const orderToInsert = {
          stripe_session_id: session.id,
          airalo_order_id: packageId,
          email: customerEmail,
          // FIX A : on utilise l'ID du package tel quel, sans tronquer
          package_id: packageId.replace(/-topup$/, ""),
          status: "completed",
          amount: session.amount_total,
          created_at: new Date().toISOString(),
          package_name: packageData.name,
          data_amount: packageData.data_amount,
          data_unit: packageData.data_unit,
          // FIX 1 : parseInt avec radix 10 — évite charAt(0) qui tronque "30" en "3"
          validity: parseInt(packageData.validity.toString(), 10),
          price: (() => {
            const cur = (session.currency || packageData.currency || "EUR").toUpperCase();
            const raw = session.amount_total ?? 0;
            return cur === "XPF" || cur === "CFP" ? raw : raw / 100;
          })(),
          currency:
            session.currency?.toUpperCase() ||
            packageData.currency?.toUpperCase() ||
            "EUR",
          transaction_type: "topup",
          first_name: topUpFirstName,
          last_name: topUpLastName,
          nom: session.customer_details?.name || null,
          prenom: session.customer_details?.name?.split(" ")[0] || null,
          promo_code: promo_code || null,
          partner_code: partner_code || null,
        };

        const { data: newOrderData, error: orderError } = await supabase
          .from("orders")
          .insert(orderToInsert)
          .select("id")
          .single();

        if (orderError || !newOrderData) {
          console.error(
            `Failed to save top-up financial transaction to 'orders' database: ${orderError?.message}`,
          );
          throw new Error(
            `Failed to save top-up financial transaction: ${orderError?.message}`,
          );
        }
        console.log(
          "Top-up financial transaction saved to 'orders' database successfully. Order ID:",
          newOrderData.id,
        );

        /* @ts-ignore */
        const airaloTopupRecord: AiraloTopup = {
          topup_id: topUpApiResult.airalo_topup_id,
          sim_iccid: sim_iccid,
          order_id: newOrderData.id,
          email: customerEmail,
          package_id: packageId.replace(/-topup$/, ""),
          amount: (session.amount_total ?? 0) / 100,
          currency:
            session.currency?.toUpperCase() ||
            packageData.currency?.toUpperCase() ||
            "EUR",
          created_at: new Date().toISOString(),
        };

        const { error: airaloTopupError } = await supabase
          .from("airalo_topups")
          .insert(airaloTopupRecord);

        if (airaloTopupError) {
          console.error(
            `Failed to save top-up details to 'airalo_topups' database: ${airaloTopupError.message}`,
          );
          throw new Error(
            `Failed to save top-up details to airalo_topups: ${airaloTopupError.message}`,
          );
        }
        console.log("Top-up details saved to 'airalo_topups' database successfully.");

        // FIX B : alimenter user_sims pour que DataUsage trouve l'eSIM rechargée
        // Non bloquant — le topup est déjà traité, on ne throw pas si ça échoue
        const { data: existingSim } = await supabase
          .from("user_sims")
          .select("id")
          .eq("user_email", customerEmail)
          .eq("iccid", sim_iccid)
          .maybeSingle();

        if (!existingSim) {
          const { error: simInsertError } = await supabase
            .from("user_sims")
            .insert({
              user_email: customerEmail,
              iccid: sim_iccid,
              name: packageData.name,
              status: "active",
            });

          if (simInsertError) {
            console.error(
              `[webhook] user_sims insert failed (non-blocking): ${simInsertError.message}`
            );
          } else {
            console.log(`[webhook] user_sims updated for ${customerEmail} / ${sim_iccid}`);
          }
        } else {
          console.log(`[webhook] user_sims already has entry for ${sim_iccid} — skipping`);
        }

      } else {
        console.log(
          `Processing new order for package ID: ${packageId}, session: ${session.id}`,
        );
        const edgeFunctionResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/create-airalo-order`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              packageId,
              airalo_id: packageData.id,
              customerEmail,
              customerName: session.customer_details?.name || "Customer",
              customerFirstname:
                session.customer_details?.name?.split(" ")[0] || "Customer",
              quantity: 1,
              description: `Order from Stripe session ${session.id}`,
            }),
          },
        );

        const orderParseResult = await safeJsonParse<{
          order?: { order_id?: string; sim_iccid?: string; qr_code_url?: string };
          order_reference?: string;
          id?: string;
          sim_iccid?: string;
          qr_code?: string;
          error?: string;
        }>(edgeFunctionResponse);

        if (!orderParseResult.success || !orderParseResult.data) {
          console.error(
            `Failed to parse Airalo order response: ${orderParseResult.error}`,
            orderParseResult.rawText ? `Raw: ${orderParseResult.rawText}` : ""
          );
          throw new Error(
            `Failed to create Airalo order: ${orderParseResult.error || "Invalid response"}`,
          );
        }

        if (orderParseResult.data.error) {
          console.error(`Airalo order API returned error: ${orderParseResult.data.error}`);
          throw new Error(`Failed to create Airalo order: ${orderParseResult.data.error}`);
        }

        const airaloOrderData = orderParseResult.data;
        console.log("Airalo order created successfully via Edge Function:", airaloOrderData);
        console.log("First name: ", firstName, "Last name: ", lastName);

        const orderToInsert = {
          stripe_session_id: session.id,
          first_name: firstName,
          last_name: lastName,
          package_id: packageId,
          email: customerEmail,
          airalo_order_id:
            airaloOrderData.order_reference ||
            airaloOrderData.id ||
            `new_order_${session.id}`,
          esim_iccid: airaloOrderData.sim_iccid,
          qr_code_url: airaloOrderData.qr_code,
          status: "completed",
          amount: session.amount_total,
          created_at: new Date().toISOString(),
          package_name: packageData.name,
          data_amount: packageData.data_amount,
          data_unit: packageData.data_unit,
          // FIX 1 : même correction sur le bloc new_order
          validity: parseInt(packageData.validity.toString(), 10),
          price: (() => {
            const cur = (session.currency || packageData.currency || "EUR").toUpperCase();
            const raw = session.amount_total ?? 0;
            return cur === "XPF" || cur === "CFP" ? raw : raw / 100;
          })(),
          currency:
            session.currency?.toUpperCase() ||
            packageData.currency?.toUpperCase() ||
            "EUR",
          transaction_type: "new_order",
          promo_code: promo_code || null,
          partner_code: partner_code || null,
        };

        const { error: orderError } = await supabase
          .from("orders")
          .insert(orderToInsert);

        if (orderError) {
          console.error(`Failed to save new order to database: ${orderError.message}`);
          throw new Error(`Failed to save new order to database: ${orderError.message}`);
        }
        console.log("New order saved to database successfully.");

        // ── FENUASIMBOX notification
        if (session.metadata?.origin === "fenuasimbox") {
          try {
            const nodemailer = require("nodemailer");
            const transporter = nodemailer.createTransport({
              host: "smtp-relay.brevo.com", port: 587, secure: false,
              auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_PASS },
            });
            const qrUrl = airaloOrderData.qr_code || airaloOrderData.order?.qr_code_url || "";
            const iccid = airaloOrderData.sim_iccid || airaloOrderData.order?.sim_iccid || "";
            await transporter.sendMail({
              from: `"FENUA SIM" <hello@fenuasim.com>`,
              to: "hello@fenuasim.com",
              subject: `✅ FENUASIMBOX — eSIM prête pour ${session.metadata.firstName} ${session.metadata.lastName}`,
              html: `
                <div style="font-family:Arial;max-width:600px;">
                  <div style="background:linear-gradient(135deg,#A020F0,#FF7F11);padding:20px;border-radius:12px 12px 0 0;">
                    <h2 style="color:white;margin:0">✅ eSIM FENUASIMBOX — Paiement reçu</h2>
                  </div>
                  <div style="background:#f9f9f9;padding:24px;border-radius:0 0 12px 12px;border:1px solid #eee;">
                    <h3 style="color:#1a0533">Client</h3>
                    <p><strong>${session.metadata.firstName} ${session.metadata.lastName}</strong></p>
                    <p style="color:#666">${customerEmail}${session.metadata.phone ? ` · ${session.metadata.phone}` : ""}</p>
                    <h3 style="color:#1a0533;margin-top:16px">eSIM</h3>
                    <p>${packageData.name} — ${packageData.data_amount}${packageData.data_unit}</p>
                    <p style="color:#666">ICCID : <strong>${iccid}</strong></p>
                    ${qrUrl ? `<p><img src="${qrUrl}" width="180" alt="QR Code eSIM" style="border-radius:8px" /></p>` : ""}
                    ${session.metadata.router_id ? `
                    <h3 style="color:#1a0533;margin-top:16px">Routeur</h3>
                    <p>${session.metadata.rental_days} jours · ${session.metadata.rental_start} → ${session.metadata.rental_end}</p>
                    ` : ""}
                    <div style="margin-top:20px;padding:12px;background:#d1fae5;border-radius:8px;">
                      <p style="margin:0;font-size:13px;color:#065f46">⬆️ Installe cette eSIM sur le routeur avant remise au client.</p>
                    </div>
                  </div>
                </div>
              `,
            });
            console.log("FENUASIMBOX notification email sent to hello@fenuasim.com");
          } catch (emailErr) {
            console.error("Failed to send FENUASIMBOX notification email:", emailErr);
          }
        }

        console.log(airaloOrderData);
        const { data: userEsims, error: userEsimsError } = await supabase
          .from("user_sims")
          .insert([
            {
              user_email: customerEmail,
              iccid: airaloOrderData.order.sim_iccid,
              name: packageData.name,
              status: "completed",
            },
          ])
          .select();

        if (userEsimsError) {
          console.error(`Failed to save user esim to database: ${userEsimsError.message}`);
          throw new Error(`Failed to save user esim to database: ${userEsimsError.message}`);
        }
        console.log("User Esims: ", userEsims);
      }

      if (promo_code) {
        const { data: promoCodeData, error: promoError } = await supabase
          .from("promo_codes")
          .select("*")
          .eq("code", promo_code)
          .single();

        if (!promoError && promoCodeData) {
          const timesUsed = promoCodeData.times_used + 1;
          await supabase
            .from("promo_codes")
            .update({ times_used: timesUsed })
            .eq("code", promoCodeData.code);

          await supabase.from("promo_code_usage").insert({
            promo_code_id: promoCodeData.id,
            order_id: session.id,
            user_email:
              session.customer_details?.email || session.metadata?.email,
            used_at: new Date().toISOString(),
          });
        }
      }

      return res.status(200).json({ received: true, processed: true });
    } catch (error) {
      console.error("Webhook processing error:", error);
      return res.status(500).json({
        received: true,
        processed: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown webhook processing error",
      });
    }
  } else {
    console.log(`Received unhandled event type: ${event.type}`);
  }

  return res
    .status(200)
    .json({ received: true, status: "event_unhandled_or_processed" });
}
