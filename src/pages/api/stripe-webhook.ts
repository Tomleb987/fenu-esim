import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabase } from "@/lib/supabaseClient";
import { AiraloTopup } from "@/types/airaloTopup";

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
      return res
        .status(200)
        .json({ received: true, status: "payment_not_paid" });
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
      console.log("Package ID:", packageId);
      if (!packageId) {
        console.error(
          "Package ID not found in session metadata for session:",
          session.id,
        );
        throw new Error("Package ID not found in session metadata");
      }

      const customerEmail =
        session.customer_details?.email ||
        session.metadata?.email ||
        "no-email@example.com";

      const { data: packageData, error: packageError } = await supabase
        .from("airalo_packages")
        .select("*")
        .eq("id", packageId.split("-topup")[0])
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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sim_iccid: sim_iccid,
            airalo_package_id: packageId,
          }),
        });

        const topUpApiResult = await topUpResponse.json();

        if (!topUpResponse.ok || !topUpApiResult.success) {
          console.error(
            `Failed to process Airalo top-up via local API: ${topUpResponse.status} - ${topUpApiResult.message || "Unknown API error"}`,
          );
          throw new Error(
            `Failed to process Airalo top-up: ${topUpApiResult.message || topUpResponse.statusText}`,
          );
        }

        console.log(
          "Local Airalo top-up API processed successfully:",
          topUpApiResult,
        );

        const orderToInsert = {
          stripe_session_id: session.id,
          airalo_order_id: packageId,
          email: customerEmail,
          // Use the Airalo top-up ID from the API response as airalo_order_id for consistency in 'orders'
          package_id: packageId.split("-topup")[0],
          status: "completed",
          amount: session.amount_total,
          created_at: new Date().toISOString(),
          package_name: packageData.name,
          data_amount: packageData.data_amount,
          data_unit: packageData.data_unit,
          validity: parseInt(packageData.validity.toString().charAt(0)),
          price: (session.amount_total ?? 0) / 100,
          currency:
            session.currency?.toUpperCase() ||
            packageData.currency?.toUpperCase() ||
            "EUR",
          transaction_type: "topup",
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
          package_id: packageId.split("-topup")[0],
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
        console.log(
          "Top-up details saved to 'airalo_topups' database successfully.",
        );
      } else {
        console.log(
          `Processing new order for package ID: ${packageId}, session: ${session.id}`,
        );
        const edgeFunctionResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/create-airalo-order`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
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

        if (!edgeFunctionResponse.ok) {
          const errorText = await edgeFunctionResponse.text();
          console.error(
            `Failed to create Airalo order via Edge Function: ${edgeFunctionResponse.status} - ${errorText}`,
          );
          throw new Error(
            `Failed to create Airalo order: ${edgeFunctionResponse.status} - ${errorText}`,
          );
        }

        const airaloOrderData = await edgeFunctionResponse.json();
        console.log(
          "Airalo order created successfully via Edge Function:",
          airaloOrderData,
        );

        console.log("Airalo order data:", firstName, lastName);
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
          validity: parseInt(packageData.validity.toString().charAt(0)),
          price: (session.amount_total ?? 0) / 100,
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
          console.error(
            `Failed to save new order to database: ${orderError.message}`,
          );
          throw new Error(
            `Failed to save new order to database: ${orderError.message}`,
          );
        }
        console.log("New order saved to database successfully.");

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
          console.error(
            `Failed to save user esim to database: ${userEsimsError.message}`,
          );
          throw new Error(
            `Failed to save user esim to database: ${userEsimsError.message}`,
          );
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
