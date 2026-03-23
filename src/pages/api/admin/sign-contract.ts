// ============================================================
// FENUA SIM – API : Enregistrement signature electronique
// src/pages/api/sign-contract.ts
// POST { token, signedName }
// ============================================================

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import nodemailer from "nodemailer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { token, signedName } = req.body as { token: string; signedName: string };

  if (!token || !signedName?.trim()) {
    return res.status(400).json({ error: "Token et nom requis" });
  }

  // Récupérer la location via le token
  const { data: rental, error } = await supabase
    .from("router_rentals")
    .select("*, routers(model, serial_number, rental_price_per_day, deposit_amount)")
    .eq("signature_token", token)
    .single();

  if (error || !rental) return res.status(404).json({ error: "Contrat introuvable ou lien expiré" });
  if (rental.signature_status === "signed") return res.status(400).json({ error: "Ce contrat a déjà été signé" });

  // Capturer IP et user-agent
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    ?? req.socket?.remoteAddress
    ?? "inconnue";
  const userAgent = req.headers["user-agent"] ?? "inconnu";
  const signedAt = new Date().toISOString();

  // Enregistrer la signature
  await supabase
    .from("router_rentals")
    .update({
      signature_status: "signed",
      signed_at: signedAt,
      signed_name: signedName.trim(),
      signed_ip: ip,
      signed_user_agent: userAgent,
    })
    .eq("id", rental.id);

  // Notifier l'admin
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com", port: 587, secure: false,
      auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_PASS },
    });

    const router = (rental as any).routers;
    const signedDateFr = new Date(signedAt).toLocaleString("fr-FR", { timeZone: "Pacific/Tahiti" });

    await transporter.sendMail({
      from: `"FENUA SIM" <hello@fenuasim.com>`,
      to: "hello@fenuasim.com",
      subject: "Contrat signé — " + (rental.customer_name ?? rental.customer_email),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:20px;border-radius:12px 12px 0 0;text-align:center;">
            <h2 style="color:white;margin:0;">✓ Contrat signé</h2>
          </div>
          <div style="background:white;padding:24px;border-radius:0 0 12px 12px;border:1px solid #eee;">
            <table style="width:100%;font-size:14px;border-collapse:collapse;">
              <tr><td style="padding:5px 0;color:#888;">Locataire</td><td style="font-weight:bold;">${rental.customer_name ?? "-"}</td></tr>
              <tr><td style="padding:5px 0;color:#888;">Email</td><td>${rental.customer_email ?? "-"}</td></tr>
              <tr><td style="padding:5px 0;color:#888;">Routeur</td><td>${router?.model ?? "-"} S/N ${router?.serial_number ?? "-"}</td></tr>
              <tr><td style="padding:5px 0;color:#888;">Nom signé</td><td style="font-weight:bold;color:#16a34a;">${signedName.trim()}</td></tr>
              <tr><td style="padding:5px 0;color:#888;">Date</td><td>${signedDateFr} (heure Tahiti)</td></tr>
              <tr><td style="padding:5px 0;color:#888;">IP</td><td style="font-family:monospace;font-size:12px;">${ip}</td></tr>
            </table>
            <p style="margin:16px 0 0;font-size:11px;color:#aaa;">
              Signature électronique enregistrée conformément à l'article 1367 du Code civil.
            </p>
          </div>
        </div>
      `,
    });
  } catch (mailErr) {
    console.error("Email notification error:", mailErr);
  }

  return res.status(200).json({ success: true });
}
