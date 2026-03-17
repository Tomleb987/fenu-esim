// src/pages/api/create-payment-link.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

export const config = { api: { bodyParser: true } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Non authentifié" });
  const token = authHeader.replace("Bearer ", "");

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Token invalide" });

  const { data: partner, error: partnerError } = await supabaseAdmin
    .from("partner_profiles")
    .select("id, partner_code, advisor_name, promo_code, is_active")
    .eq("email", user.email)
    .single();

  if (partnerError || !partner || !partner.is_active)
    return res.status(403).json({ error: "Compte partenaire introuvable ou inactif" });

  const { packageId, clientFirstName, clientLastName, clientEmail, clientPhone, destination,
    resendOnly, paymentUrl: resendPaymentUrl, packageName: resendPackageName,
    amount: resendAmount, currency: resendCurrency, advisorName: resendAdvisorName } = req.body;

  // ── Mode renvoi email uniquement (pas de nouvelle session Stripe)
  if (resendOnly && resendPaymentUrl && clientEmail) {
    const formattedAmount = `${Math.round(resendAmount || 0).toLocaleString("fr")} ${(resendCurrency || "xpf").toUpperCase()}`;
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp-relay.brevo.com", port: 587, secure: false,
        auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_PASS },
      });
      await transporter.sendMail({
        from: `"FENUA SIM" <hello@fenuasim.com>`,
        to: clientEmail,
        bcc: "clients@fenua-sim.odoo.com",
        replyTo: `"FENUA SIM" <hello@fenuasim.com>`,
        subject: `Rappel — Votre lien de paiement eSIM`,
        html: createEmailHTML({
          clientFirstName, clientLastName, packageName: resendPackageName || "",
          destination: "", dataAmount: "", validityDays: "",
          formattedAmount, paymentUrl: resendPaymentUrl,
          advisorName: resendAdvisorName || partner.advisor_name,
        }),
        text: `Bonjour ${clientFirstName},

Rappel : voici votre lien de paiement eSIM :
${resendPaymentUrl}

Montant : ${formattedAmount}

L'équipe FENUA SIM`,
      });
      console.log("✅ Email renvoyé à:", clientEmail);
    } catch (err: any) {
      console.error("❌ Erreur renvoi email:", err.message);
    }
    return res.status(200).json({ success: true });
  }

  if (!packageId || !clientFirstName || !clientLastName || !clientEmail)
    return res.status(400).json({ error: "Champs requis manquants" });

  const { data: packageData, error: packageError } = await supabaseAdmin
    .from("airalo_packages")
    .select("id, airalo_id, name, price_eur, final_price_eur, price_xpf, final_price_xpf, currency, data_amount, data_unit, validity_days, validity")
    .eq("id", packageId)
    .single();

  if (packageError || !packageData) return res.status(404).json({ error: "Forfait introuvable" });

  const basePrice = packageData.price_xpf || packageData.final_price_xpf || packageData.price_eur || packageData.final_price_eur || 0;

  // ── Appliquer la remise du code promo si présent
  let rawPrice = basePrice;
  console.log("partner.promo_code:", partner.promo_code);
  console.log("basePrice:", basePrice);

  if (partner.promo_code) {
    const { data: promoData, error: promoError } = await supabaseAdmin
      .from("promo_codes")
      .select("discount_percentage, discount_amount, is_active")
      .eq("code", partner.promo_code)
      .maybeSingle();

    console.log("promoData:", JSON.stringify(promoData));
    console.log("promoError:", JSON.stringify(promoError));

    if (promoData?.is_active) {
      if (promoData.discount_percentage) {
        rawPrice = basePrice * (1 - promoData.discount_percentage / 100);
        console.log("Applied discount_percentage:", promoData.discount_percentage, "-> rawPrice:", rawPrice);
      } else if (promoData.discount_amount) {
        rawPrice = Math.max(0, basePrice - promoData.discount_amount);
        console.log("Applied discount_amount:", promoData.discount_amount, "-> rawPrice:", rawPrice);
      }
    }
  }

  // ── Créer la session Stripe
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: clientEmail,
    line_items: [{
      price_data: {
        currency: "xpf",
        product_data: {
          name: packageData.name,
          description: `eSIM ${packageData.data_amount || ""}${packageData.data_unit || ""} — ${packageData.validity_days || packageData.validity || ""} jours`,
        },
        unit_amount: Math.round(rawPrice),
      },
      quantity: 1,
    }],
    metadata: {
      packageId: packageData.id,
      firstName: clientFirstName,
      lastName: clientLastName,
      email: clientEmail,
      promo_code: partner.promo_code || "",
      partner_code: partner.partner_code,
      origin: "partner_dashboard",
    },
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/`,
  });

  // ── Sauvegarder la commande partenaire
  await supabaseAdmin.from("partner_orders").insert({
    partner_code: partner.partner_code,
    advisor_name: partner.advisor_name,
    package_id: packageData.id,
    package_name: packageData.name,
    client_first_name: clientFirstName,
    client_last_name: clientLastName,
    client_email: clientEmail,
    client_phone: clientPhone || null,
    stripe_session_id: session.id,
    payment_url: session.url,
    status: "pending",
    amount: Math.round(rawPrice),
    currency: "xpf",
    created_at: new Date().toISOString(),
  });

  // ── Envoyer l'email automatiquement
  const formattedAmount = `${Math.round(rawPrice).toLocaleString("fr")} XPF`;
  const validityDisplay = packageData.validity_days
    ? `${packageData.validity_days} jours`
    : (() => {
        const v = packageData.validity?.toString() || packageData.name;
        const m = v.match(/(\d+)\s*jours?/i) || v.match(/(\d+)\s*days?/i);
        return m ? `${m[1]} jours` : "";
      })();
  const dataDisplay = packageData.data_unit === "illimité" || packageData.data_unit === "unlimited"
    ? "Illimité"
    : packageData.data_amount
      ? `${packageData.data_amount} ${packageData.data_unit || "Go"}`
      : packageData.data_unit || "Illimité";

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"FENUA SIM" <hello@fenuasim.com>`,
      to: clientEmail,
      bcc: "clients@fenua-sim.odoo.com",
      replyTo: `"FENUA SIM" <hello@fenuasim.com>`,
      subject: `Votre lien de paiement eSIM — ${destination || packageData.name}`,
      html: createEmailHTML({
        clientFirstName, clientLastName, packageName: packageData.name,
        destination: destination || "", dataAmount: dataDisplay,
        validityDays: validityDisplay, formattedAmount,
        paymentUrl: session.url!, advisorName: partner.advisor_name,
      }),
      text: `Bonjour ${clientFirstName},\n\nVoici votre lien de paiement sécurisé pour votre eSIM :\n${session.url}\n\nMontant : ${formattedAmount}\n\nCe lien est valable 24h.\n\nL'équipe FENUA SIM`,
    });
    console.log("✅ Email lien paiement envoyé à:", clientEmail);
  } catch (emailErr: any) {
    // L'email échoue silencieusement — le lien est quand même retourné
    console.error("❌ Erreur envoi email:", emailErr.message);
  }

  return res.status(200).json({
    paymentUrl: session.url,
    sessionId: session.id,
  });
}

function createEmailHTML({ clientFirstName, clientLastName, packageName, destination, dataAmount, validityDays, formattedAmount, paymentUrl, advisorName }: {
  clientFirstName: string; clientLastName: string; packageName: string;
  destination: string; dataAmount: string; validityDays: string;
  formattedAmount: string; paymentUrl: string; advisorName: string;
}) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#A020F0 0%,#FF4D6D 50%,#FF7F11 100%);padding:36px 40px;text-align:center;">
          <div style="font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;">FENUA<span style="opacity:.6;">•</span>SIM</div>
          <div style="color:rgba(255,255,255,0.7);font-size:12px;margin-top:4px;letter-spacing:1px;text-transform:uppercase;">Connectez-vous partout dans le monde</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <p style="font-size:18px;font-weight:600;color:#1a0533;margin:0 0 8px;">Bonjour ${clientFirstName} ${clientLastName} 👋</p>
          <p style="font-size:14px;color:#4a5568;margin:0 0 28px;line-height:1.6;">
            ${advisorName || "Votre conseiller FENUA SIM"} vous a préparé un lien de paiement sécurisé pour votre eSIM. Cliquez ci-dessous pour finaliser votre commande.
          </p>

          <!-- Forfait -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ff;border-radius:12px;border:1.5px solid #e9d5ff;margin-bottom:28px;">
            <tr><td style="padding:20px;">
              <div style="font-size:11px;font-weight:700;color:#A020F0;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">📦 Votre forfait</div>
              <div style="font-size:18px;font-weight:800;color:#1a0533;margin-bottom:14px;">${packageName}</div>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${destination ? `<tr><td style="padding:5px 0;border-bottom:1px solid #e9d5ff;font-size:13px;color:#6b7280;">🌍 Destination</td><td style="text-align:right;font-weight:600;color:#1a0533;font-size:13px;">${destination}</td></tr>` : ""}
                <tr><td style="padding:5px 0;border-bottom:1px solid #e9d5ff;font-size:13px;color:#6b7280;">📶 Données</td><td style="text-align:right;font-weight:600;color:#1a0533;font-size:13px;">${dataAmount}</td></tr>
                <tr><td style="padding:5px 0;border-bottom:1px solid #e9d5ff;font-size:13px;color:#6b7280;">📅 Validité</td><td style="text-align:right;font-weight:600;color:#1a0533;font-size:13px;">${validityDays}</td></tr>
                <tr><td style="padding:10px 0 0;font-size:14px;font-weight:700;color:#A020F0;">💰 Montant total</td><td style="text-align:right;font-size:20px;font-weight:800;color:#A020F0;">${formattedAmount}</td></tr>
              </table>
            </td></tr>
          </table>

          <!-- CTA — compatible Outlook/iPhone (VML + fallback) -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td align="center">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${paymentUrl}" style="height:52px;v-text-anchor:middle;width:240px;" arcsize="15%" strokecolor="#A020F0" fillcolor="#A020F0">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Payer maintenant</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:#A020F0;border-radius:10px;padding:0;">
                    <a href="${paymentUrl}" target="_blank" style="display:inline-block;padding:16px 48px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;background-color:#A020F0;">
                      Payer maintenant
                    </a>
                  </td>
                </tr>
              </table>
              <!--<![endif]-->
            </td></tr>
          </table>

          <!-- Lien texte -->
          <div style="background:#f8fafc;border-radius:8px;padding:14px;margin-bottom:20px;border:1px solid #e2e8f0;">
            <p style="font-size:11px;color:#94a3b8;margin:0 0 5px;">Ou copiez ce lien :</p>
            <p style="font-size:11px;color:#A020F0;margin:0;word-break:break-all;font-family:monospace;">${paymentUrl}</p>
          </div>

          <!-- Sécurité -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;margin-bottom:20px;">
            <tr><td style="padding:14px;">
              <p style="font-size:13px;font-weight:600;color:#15803d;margin:0 0 3px;">🔒 Paiement 100% sécurisé</p>
              <p style="font-size:12px;color:#166534;margin:0;">Traité par Stripe. Vos données bancaires ne sont jamais partagées.</p>
            </td></tr>
          </table>

          <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">⏱ Ce lien est valable <strong>24 heures</strong>.</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#faf5ff;padding:20px 40px;border-top:1px solid #f0e8ff;text-align:center;">
          <p style="font-size:13px;font-weight:700;color:#A020F0;margin:0 0 3px;">FENUA SIM</p>
          <p style="font-size:11px;color:#cbd5e1;margin:0;">
            <a href="https://fenuasim.com" style="color:#A020F0;text-decoration:none;">fenuasim.com</a>
            &nbsp;·&nbsp;
            <a href="mailto:hello@fenuasim.com" style="color:#A020F0;text-decoration:none;">hello@fenuasim.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
