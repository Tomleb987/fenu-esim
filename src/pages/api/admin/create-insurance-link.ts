// src/pages/api/admin/create-insurance-link.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createAvaAdhesion } from "@/lib/ava";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });
const FRAIS_DISTRIBUTION = 10;
const ADMIN_EMAIL = "admin@fenuasim.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Auth check
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Non authentifie" });
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user || user.email !== ADMIN_EMAIL) return res.status(403).json({ error: "Acces refuse" });

  const { quoteData, clientEmail, clientNote } = req.body;
  if (!quoteData || !clientEmail) return res.status(400).json({ error: "quoteData et clientEmail requis" });

  try {
    const internalRef = `ADMIN-${Date.now()}`;

    // 1. Creer adhesion AVA
    const avaResult = await createAvaAdhesion({ ...quoteData, internalReference: internalRef });
    console.log("AVA result:", JSON.stringify(avaResult));

    const adhesionNumber = avaResult.adhesion_number;
    if (!adhesionNumber) return res.status(400).json({ error: "Numero adhesion manquant", details: avaResult });

    const contractNumber = avaResult.contract_number || null;
    const contractLink = avaResult.contract_link || null;

    let premiumAva = typeof avaResult.montant_total === "number" ? avaResult.montant_total : quoteData.manualAmount || 0;
    premiumAva = Number(premiumAva);
    if (!Number.isFinite(premiumAva) || premiumAva <= 0) return res.status(400).json({ error: "Montant invalide", details: avaResult.montant_total });

    const totalTtc = premiumAva + FRAIS_DISTRIBUTION;

    // 2. Sauvegarder dans Supabase
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
        status: "pending_payment",
        start_date: quoteData.startDate ?? null,
        end_date: quoteData.endDate ?? null,
        ava_raw: avaResult.raw ?? null,
      })
      .select()
      .single();

    if (supaError) return res.status(500).json({ error: "Erreur Supabase", details: supaError });

    // 3. Creer session Stripe
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: clientEmail,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: `Assurance AVA - ${adhesionNumber}`, description: contractNumber ? `Contrat ${contractNumber}` : undefined },
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
      // expires_at: Stripe limite a 24h maximum - lien valable 24h par defaut
      success_url: `${baseUrl}/assurance/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/assurance`,
      metadata: {
        type: "insurance_ava",
        adhesion_number: adhesionNumber,
        contract_number: contractNumber || "",
        insurance_id: insertData?.id?.toString() ?? "",
        internal_ref: internalRef,
        origin: "admin_manual",
        note: clientNote || "",
      },
    });

    // 4. Envoyer email avec le lien de paiement
    const productLabels: Record<string, string> = {
      ava_tourist_card: "Tourist Card",
      ava_carte_sante: "Carte Sante",
      avantages_pom: "AVAntages POM",
    };
    const productLabel = productLabels[quoteData.productType] || quoteData.productType;
    const firstName = quoteData.subscriber?.firstName || "";
    const lastName = quoteData.subscriber?.lastName || "";

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
        subject: `Votre lien de paiement assurance voyage - FENUA SIM`,
        html: createPaymentLinkEmailHtml({
          firstName, lastName, adhesionNumber, productLabel,
          premiumAva, totalTtc, paymentUrl: session.url!,
          startDate: quoteData.startDate, endDate: quoteData.endDate,
        }),
        text: `Bonjour ${firstName},

Voici votre lien de paiement pour votre assurance voyage AVA ${productLabel} :
${session.url}

Montant : ${totalTtc.toFixed(2)} EUR

L'equipe FENUA SIM`,
      });
      console.log("✅ Email assurance envoye a:", clientEmail);
    } catch (emailErr: any) {
      console.error("❌ Erreur envoi email assurance:", emailErr.message);
    }

    return res.status(200).json({
      paymentUrl: session.url,
      sessionId: session.id,
      adhesionNumber,
      premiumAva,
      totalTtc,
    });
  } catch (error: any) {
    console.error("Admin insurance error:", error);
    return res.status(500).json({ error: "Erreur serveur", details: error?.message });
  }
}

function createPaymentLinkEmailHtml({ firstName, lastName, adhesionNumber, productLabel, premiumAva, totalTtc, paymentUrl, startDate, endDate }: {
  firstName: string; lastName: string; adhesionNumber: string; productLabel: string;
  premiumAva: number; totalTtc: number; paymentUrl: string; startDate?: string; endDate?: string;
}) {
  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString("fr-FR") : "-";
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#A020F0 0%,#FF4D6D 50%,#FF7F11 100%);padding:32px 40px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:#fff;">FENUA<span style="opacity:.5;">•</span>SIM</div>
          <div style="color:rgba(255,255,255,0.7);font-size:12px;margin-top:4px;letter-spacing:1px;text-transform:uppercase;">Assurance Voyage</div>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="font-size:17px;font-weight:600;color:#1a0533;margin:0 0 6px;">Bonjour ${firstName} ${lastName},</p>
          <p style="font-size:14px;color:#4a5568;margin:0 0 24px;line-height:1.6;">Votre demande d'assurance a bien ete enregistree. Finalisez votre souscription en cliquant sur le bouton ci-dessous.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ff;border-radius:12px;border:1.5px solid #e9d5ff;margin-bottom:28px;">
            <tr><td style="padding:20px;">
              <div style="font-size:11px;font-weight:700;color:#A020F0;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">🛡️ Votre contrat</div>
              <div style="font-size:16px;font-weight:800;color:#1a0533;margin-bottom:14px;">AVA ${productLabel}</div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:5px 0;border-bottom:1px solid #e9d5ff;font-size:13px;color:#6b7280;">📋 Reference</td><td style="text-align:right;font-weight:600;color:#1a0533;font-size:13px;">${adhesionNumber}</td></tr>
                ${startDate ? `<tr><td style="padding:5px 0;border-bottom:1px solid #e9d5ff;font-size:13px;color:#6b7280;">📅 Depart</td><td style="text-align:right;font-weight:600;color:#1a0533;font-size:13px;">${formatDate(startDate)}</td></tr>` : ""}
                ${endDate ? `<tr><td style="padding:5px 0;border-bottom:1px solid #e9d5ff;font-size:13px;color:#6b7280;">📅 Retour</td><td style="text-align:right;font-weight:600;color:#1a0533;font-size:13px;">${formatDate(endDate)}</td></tr>` : ""}
                <tr><td style="padding:5px 0;border-bottom:1px solid #e9d5ff;font-size:13px;color:#6b7280;">Prime AVA</td><td style="text-align:right;font-weight:600;color:#1a0533;font-size:13px;">${premiumAva.toFixed(2)} EUR</td></tr>
                <tr><td style="padding:10px 0 0;font-size:14px;font-weight:700;color:#A020F0;">Total TTC</td><td style="text-align:right;font-size:18px;font-weight:800;color:#A020F0;">${totalTtc.toFixed(2)} EUR</td></tr>
              </table>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr><td style="background-color:#A020F0;border-radius:10px;padding:0;">
                  <a href="${paymentUrl}" target="_blank" style="display:inline-block;padding:16px 48px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;background-color:#A020F0;">
                    Payer maintenant
                  </a>
                </td></tr>
              </table>
            </td></tr>
          </table>
          <div style="background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:16px;border:1px solid #e2e8f0;">
            <p style="font-size:11px;color:#94a3b8;margin:0 0 4px;">Ou copiez ce lien :</p>
            <p style="font-size:11px;color:#A020F0;margin:0;word-break:break-all;font-family:monospace;">${paymentUrl}</p>
          </div>
          <div style="background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;padding:12px;">
            <p style="font-size:13px;font-weight:600;color:#15803d;margin:0 0 2px;">🔒 Paiement 100% securise</p>
            <p style="font-size:12px;color:#166534;margin:0;">Traite par Stripe. Apres paiement, vos documents d'assurance vous seront envoyes automatiquement.</p>
          </div>
        </td></tr>
        <tr><td style="background:#faf5ff;padding:16px 40px;border-top:1px solid #f0e8ff;text-align:center;">
          <p style="font-size:12px;color:#A020F0;font-weight:700;margin:0 0 2px;">FENUA SIM</p>
          <p style="font-size:11px;color:#cbd5e1;margin:0;"><a href="https://fenuasim.com" style="color:#A020F0;text-decoration:none;">fenuasim.com</a> &nbsp;·&nbsp; <a href="mailto:hello@fenuasim.com" style="color:#A020F0;text-decoration:none;">hello@fenuasim.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
