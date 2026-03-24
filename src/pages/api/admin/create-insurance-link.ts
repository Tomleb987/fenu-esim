// src/pages/api/admin/create-insurance-link.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createAvaAdhesion } from "@/lib/ava";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const FRAIS_DISTRIBUTION = 10; // € frais FENUASIM

export const config = { api: { bodyParser: true } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ── Authentification admin
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

  const { quoteData, clientEmail, clientNote, packageId } = req.body;

  // ══════════════════════════════════════════════════
  // CAS 1 : Flux eSIM partenaire (packageId présent)
  // ══════════════════════════════════════════════════
  if (packageId) {
    const { clientFirstName, clientLastName, clientPhone, destination, sellerName } = req.body;

    if (!clientFirstName || !clientLastName || !clientEmail)
      return res.status(400).json({ error: "Champs requis manquants" });

    const { data: packageData, error: packageError } = await supabaseAdmin
      .from("airalo_packages")
      .select("id, airalo_id, name, price_eur, final_price_eur, price_xpf, final_price_xpf, currency, data_amount, data_unit, validity_days, validity")
      .eq("id", packageId)
      .single();

    if (packageError || !packageData) return res.status(404).json({ error: "Forfait introuvable" });

    let rawPrice = packageData.price_xpf || packageData.final_price_xpf || packageData.price_eur || packageData.final_price_eur || 0;

    if (partner.promo_code) {
      const { data: promoData } = await supabaseAdmin
        .from("promo_codes")
        .select("discount_percentage, discount_amount, is_active")
        .eq("code", partner.promo_code)
        .maybeSingle();

      if (promoData?.is_active) {
        if (promoData.discount_percentage) rawPrice = rawPrice * (1 - promoData.discount_percentage / 100);
        else if (promoData.discount_amount) rawPrice = Math.max(0, rawPrice - promoData.discount_amount);
      }
    }

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
      seller_name: sellerName || null,
      created_at: new Date().toISOString(),
    });

    return res.status(200).json({ paymentUrl: session.url, sessionId: session.id });
  }

  // ══════════════════════════════════════════════════
  // CAS 2 : Flux Assurance AVA (quoteData présent)
  // ══════════════════════════════════════════════════
  if (!quoteData || !clientEmail) {
    return res.status(400).json({ error: "quoteData et clientEmail requis pour l'assurance" });
  }

  try {
    const internalRef = `ADMIN-${Date.now()}`;

    // 1️⃣ Création adhésion AVA (brouillon)
    const avaResult = await createAvaAdhesion({
      ...quoteData,
      internalReference: internalRef,
    });

    const adhesionNumber = avaResult.adhesion_number;
    const contractNumber = avaResult.contract_number || null;
    const contractLink = avaResult.contract_link || null;

    if (!adhesionNumber) {
      return res.status(400).json({
        error: "Numéro d'adhésion manquant dans la réponse AVA",
        details: avaResult.raw ?? avaResult,
      });
    }

    // 2️⃣ Montant : priorité à manualAmount (saisi par l'admin), sinon réponse AVA
    let premiumAva = typeof quoteData.manualAmount === "number" && quoteData.manualAmount > 0
      ? quoteData.manualAmount
      : typeof avaResult.montant_total === "number"
        ? avaResult.montant_total
        : 0;

    premiumAva = Number(premiumAva);

    if (!Number.isFinite(premiumAva) || premiumAva <= 0) {
      return res.status(400).json({ error: "Montant de prime invalide", details: { montant_total: avaResult.montant_total, manualAmount: quoteData.manualAmount } });
    }

    const totalTtc = premiumAva + FRAIS_DISTRIBUTION;

    // 3️⃣ Enregistrement Supabase
    const { data: insertData, error: supaError } = await supabaseAdmin
      .from("insurances")
      .insert({
        user_email: clientEmail,
        subscriber_first_name: quoteData.subscriber?.firstName ?? null,
        subscriber_last_name: quoteData.subscriber?.lastName ?? null,
        product_type: quoteData.productType,
        adhesion_number: adhesionNumber,
        contract_number: contractNumber,
        premium_ava: premiumAva,
        frais_distribution: FRAIS_DISTRIBUTION,
        total_amount: totalTtc,
        contract_link: contractLink,
        cg_link: avaResult.cg_link || null,
        ipid_link: avaResult.ipid_link || null,
        ficp_link: avaResult.ficp_link || null,
        status: "pending_payment",
        start_date: quoteData.startDate ?? null,
        end_date: quoteData.endDate ?? null,
        internal_note: clientNote || null,
        created_by: "admin",
        ava_raw: avaResult.raw ?? null,
      })
      .select()
      .single();

    if (supaError) {
      console.error("❌ Supabase insert error:", supaError);
      return res.status(500).json({ error: "Erreur enregistrement Supabase", details: supaError });
    }

    // 4️⃣ Session Stripe Checkout
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) return res.status(500).json({ error: "NEXT_PUBLIC_BASE_URL manquant" });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Assurance AVA – ${adhesionNumber}`,
              description: contractNumber ? `Contrat ${contractNumber}` : undefined,
            },
            unit_amount: Math.round(premiumAva * 100),
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: "eur",
            product_data: { name: "Frais de distribution FENUASIM" },
            unit_amount: Math.round(FRAIS_DISTRIBUTION * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/assurance/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/assurance`,
      customer_email: clientEmail,
      metadata: {
        type: "insurance_ava",
        adhesion_number: adhesionNumber,
        contract_number: contractNumber || "",
        insurance_id: insertData?.id?.toString() ?? "",
        internal_ref: internalRef,
        origin: "admin",
      },
    });

    // 5️⃣ Email au client avec le lien de paiement
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp-relay.brevo.com",
        port: 587,
        secure: false,
        auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_PASS },
      });

      const productLabels: Record<string, string> = {
        ava_tourist_card: "AVA Tourist Card",
        ava_carte_sante: "AVA Carte Santé",
        avantages_pom: "AVAntages POM",
        avantages_360: "AVAntages 360",
      };
      const productLabel = productLabels[quoteData.productType] ?? "Assurance Voyage AVA";
      const firstName = quoteData.subscriber?.firstName || "";
      const lastName = quoteData.subscriber?.lastName || "";

      await transporter.sendMail({
        from: `"FENUA SIM" <hello@fenuasim.com>`,
        to: clientEmail,
        bcc: "clients@fenua-sim.odoo.com",
        replyTo: `"FENUA SIM" <hello@fenuasim.com>`,
        subject: `Votre lien de paiement — ${productLabel}`,
        html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8f7ff;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7ff;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#A020F0,#FF4D6D,#FF7F11);padding:32px 40px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:#fff;">FENUA SIM</div>
          <div style="color:rgba(255,255,255,0.75);font-size:12px;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Assurance Voyage — Partenaire AVA</div>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="font-size:17px;font-weight:600;color:#1a0533;margin:0 0 12px;">Bonjour ${firstName} ${lastName},</p>
          <p style="font-size:14px;color:#4a5568;line-height:1.6;margin:0 0 24px;">
            Votre conseiller FENUA SIM a préparé votre devis <strong>${productLabel}</strong>.<br>
            Cliquez ci-dessous pour finaliser votre souscription en toute sécurité.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ff;border-radius:12px;border:1.5px solid #e9d5ff;margin-bottom:24px;">
            <tr><td style="padding:20px;">
              <div style="font-size:11px;font-weight:700;color:#A020F0;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">🛡️ Votre contrat</div>
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
                <tr><td style="color:#6b7280;padding:5px 0;border-bottom:1px solid #e9d5ff;">Produit</td><td style="text-align:right;font-weight:600;color:#1a0533;">${productLabel}</td></tr>
                <tr><td style="color:#6b7280;padding:5px 0;border-bottom:1px solid #e9d5ff;">N° Adhésion</td><td style="text-align:right;font-family:monospace;font-weight:700;color:#A020F0;">${adhesionNumber}</td></tr>
                <tr><td style="color:#6b7280;padding:10px 0 0;">Montant total TTC</td><td style="text-align:right;font-size:18px;font-weight:800;color:#A020F0;">${totalTtc.toFixed(2)} €</td></tr>
              </table>
            </td></tr>
          </table>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
            <tr><td style="background:#A020F0;border-radius:10px;">
              <a href="${session.url}" target="_blank" style="display:inline-block;padding:16px 48px;font-size:16px;font-weight:700;color:#fff;text-decoration:none;">
                Payer et souscrire →
              </a>
            </td></tr>
          </table>
          <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">⏱ Ce lien est valable 24 heures</p>
          ${clientNote ? `<div style="margin-top:20px;background:#f0fdf4;border-radius:8px;padding:14px;border:1px solid #bbf7d0;"><p style="font-size:13px;color:#15803d;margin:0;"><strong>Note :</strong> ${clientNote}</p></div>` : ""}
        </td></tr>
        <tr><td style="background:#faf5ff;padding:16px 40px;border-top:1px solid #f0e8ff;text-align:center;">
          <p style="font-size:11px;color:#cbd5e1;margin:0;">
            <a href="https://fenuasim.com" style="color:#A020F0;text-decoration:none;">fenuasim.com</a> · 
            <a href="mailto:hello@fenuasim.com" style="color:#A020F0;text-decoration:none;">hello@fenuasim.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      });
      console.log("✅ Email lien paiement assurance envoyé à:", clientEmail);
    } catch (emailErr: any) {
      console.error("❌ Erreur envoi email assurance:", emailErr.message);
    }

    return res.status(200).json({
      paymentUrl: session.url,
      sessionId: session.id,
      adhesionNumber,
      contractNumber,
    });

  } catch (error: any) {
    console.error("❌ Erreur create-insurance-link (assurance):", error);
    return res.status(500).json({
      error: "Erreur serveur lors de la création du contrat",
      details: error?.message ?? error,
    });
  }
}
