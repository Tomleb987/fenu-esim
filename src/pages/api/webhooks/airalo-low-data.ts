import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: false } };

async function buffer(readable: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function verifyAiraloSignature(rawBody: Buffer, signature: string): boolean {
  const secret = process.env.AIRALO_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[airalo-low-data] AIRALO_WEBHOOK_SECRET non défini — signature non vérifiée");
    return true;
  }
  const expected = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "HEAD") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const rawBody = await buffer(req);
  const signature = req.headers["airalo-signature"] as string;

  if (signature && !verifyAiraloSignature(rawBody, signature)) {
    console.error("[airalo-low-data] Signature invalide");
    return res.status(401).json({ message: "Invalid signature" });
  }

  let payload: {
    level: "75%" | "90%" | "3days" | "1days";
    package_name: string;
    remaining_percentage: number;
    iccid: string;
  };

  try {
    payload = JSON.parse(rawBody.toString("utf-8"));
  } catch {
    return res.status(400).json({ message: "Invalid JSON" });
  }

  const { level, iccid, package_name, remaining_percentage } = payload;
  console.log(`[airalo-low-data] ${level} pour ICCID ${iccid} (${remaining_percentage}% restant)`);

  // Init Supabase à l'intérieur du handler pour garantir les variables d'env
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data: simData, error: simError } = await supabase
      .from("airalo_orders")
      .select("email, nom, prenom, first_name, last_name")
      .eq("sim_iccid", iccid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (simError || !simData) {
      console.error(`[airalo-low-data] ICCID ${iccid} introuvable dans airalo_orders`, simError);
      return res.status(200).json({ received: true });
    }

    const customerEmail = simData.email;
    const customerName = (
      simData.first_name ||
      simData.prenom ||
      simData.nom ||
      "Client"
    ).trim();

    if (level === "1days") {
      await supabase
        .from("user_sims")
        .update({ status: "expiring_soon" })
        .eq("iccid", iccid);

      await supabase
        .from("airalo_orders")
        .update({ status: "expiring_soon" })
        .eq("sim_iccid", iccid);

      console.log(`[airalo-low-data] Statut mis à jour → expiring_soon pour ${iccid}`);
    }

    await sendLowDataEmail({
      email: customerEmail,
      name: customerName,
      iccid,
      level,
      packageName: package_name,
      remainingPercentage: remaining_percentage,
    });

    return res.status(200).json({ received: true });

  } catch (err) {
    console.error("[airalo-low-data] Erreur traitement:", err);
    return res.status(200).json({ received: true, error: "processing_error" });
  }
}

interface LowDataEmailParams {
  email: string;
  name: string;
  iccid: string;
  level: string;
  packageName: string;
  remainingPercentage: number;
}

function getLevelMessage(level: string): { subject: string; headline: string; body: string; urgent: boolean } {
  switch (level) {
    case "75%":
      return {
        subject: "⚠️ Vous avez consommé 75% de votre forfait FENUA SIM",
        headline: "75% de votre forfait utilisé",
        body: "Il vous reste 25% de données. Pensez à prévoir une recharge pour ne pas être coupé.",
        urgent: false,
      };
    case "90%":
      return {
        subject: "🔴 Plus que 10% de données restantes — FENUA SIM",
        headline: "Attention : 90% de votre forfait utilisé",
        body: "Il vous reste seulement 10% de données. Rechargez maintenant pour rester connecté.",
        urgent: true,
      };
    case "3days":
      return {
        subject: "📅 Votre eSIM FENUA SIM expire dans 3 jours",
        headline: "Votre forfait expire dans 3 jours",
        body: "Votre eSIM expirera dans 3 jours. Rechargez dès maintenant pour continuer à profiter de votre connexion.",
        urgent: false,
      };
    case "1days":
      return {
        subject: "🚨 Votre eSIM FENUA SIM expire demain !",
        headline: "Votre forfait expire demain",
        body: "Votre eSIM expire dans moins de 24 heures. Rechargez immédiatement pour ne pas perdre votre connexion.",
        urgent: true,
      };
    default:
      return {
        subject: "Notification FENUA SIM — votre forfait",
        headline: "Mise à jour de votre forfait",
        body: "Votre forfait approche de sa limite.",
        urgent: false,
      };
  }
}

async function sendLowDataEmail(params: LowDataEmailParams) {
  const { email, name, iccid, level, remainingPercentage } = params;
  const { subject, headline, body, urgent } = getLevelMessage(level);
  const dashboardUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/my-esims`;
  const accentColor = urgent ? "#E24B4A" : "#D251D8";

  try {
    const nodemailer = require("nodemailer");
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
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #A020F0, #FF7F11); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">FENUA SIM</h1>
          </div>
          <div style="background: #f9f9f9; padding: 28px; border-radius: 0 0 12px 12px; border: 1px solid #eee;">
            <h2 style="color: ${accentColor}; margin-top: 0;">${headline}</h2>
            <p style="color: #444;">Bonjour ${name},</p>
            <p style="color: #444;">${body}</p>
            <div style="background: white; border: 1px solid #eee; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; font-size: 13px; color: #888;">eSIM concernée</p>
              <p style="margin: 4px 0 0; font-family: monospace; color: #333; font-size: 14px;">
                …${iccid.slice(-8)}
              </p>
              ${remainingPercentage > 0 ? `
              <p style="margin: 8px 0 0; font-size: 13px; color: #888;">
                Données restantes : <strong style="color: ${accentColor}">${remainingPercentage}%</strong>
              </p>` : ""}
            </div>
            <a
              href="${dashboardUrl}"
              style="display: inline-block; background: linear-gradient(135deg, #A020F0, #FF7F11); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; margin-top: 8px;"
            >
              Recharger mon eSIM →
            </a>
            <p style="color: #999; font-size: 12px; margin-top: 24px;">
              Besoin d'aide ? Contactez-nous à
              <a href="mailto:sav@fenuasim.com" style="color: #A020F0;">sav@fenuasim.com</a>
              ou sur WhatsApp au +33 7 56 86 08 01.
            </p>
          </div>
        </div>
      `,
    });

    console.log(`[airalo-low-data] Email envoyé à ${email} pour level=${level}`);
  } catch (err) {
    console.error(`[airalo-low-data] Échec envoi email à ${email}:`, err);
  }
}