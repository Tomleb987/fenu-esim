// ============================================================
// FENUA SIM – API : Envoi lien de signature contrat
// src/pages/api/admin/send-contract-link.ts
// POST { rentalId: string }
// ============================================================

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import nodemailer from "nodemailer";
import crypto from "crypto";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { rentalId } = req.body as { rentalId: string };
  if (!rentalId) return res.status(400).json({ error: "rentalId requis" });

  const { data: rental, error } = await supabase
    .from("router_rentals")
    .select("*, routers(model, serial_number, rental_price_per_day, deposit_amount)")
    .eq("id", rentalId)
    .single();

  if (error || !rental) return res.status(404).json({ error: "Location introuvable" });
  if (!rental.customer_email) return res.status(400).json({ error: "Email client manquant" });

  // Générer un token unique et sécurisé
  const token = crypto.randomBytes(32).toString("hex");
  const signingUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.fenuasim.com"}/signer-contrat?token=${token}`;

  // Sauvegarder le token
  await supabase
    .from("router_rentals")
    .update({
      signature_token: token,
      signature_status: "pending",
      signature_sent_at: new Date().toISOString(),
    })
    .eq("id", rentalId);

  const router = (rental as any).routers;
  const fmtDate = (d: string) => d
    ? (() => { const [y,m,day] = d.split("-"); return new Date(parseInt(y), parseInt(m)-1, parseInt(day)).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }); })()
    : "-";
  const fmtNum = (n: number) => Math.round(n * 100) / 100;
  const fmtEur = (n: number) => { const parts = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "); return parts + " XPF"; };

  // Envoyer l'email au client
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com", port: 587, secure: false,
      auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"FENUA SIM" <hello@fenuasim.com>`,
      to: rental.customer_email,
      replyTo: "hello@fenuasim.com",
      subject: "Votre contrat de location FENUASIM BOX — à signer",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#A020F0,#FF7F11);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="color:white;margin:0;font-size:20px;">Contrat de location</h1>
            <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">FENUASIM BOX — Routeur WiFi portable</p>
          </div>
          <div style="background:white;padding:32px;border-radius:0 0 12px 12px;border:1px solid #eee;">
            <p style="color:#1a0533;font-size:16px;margin:0 0 16px;">Bonjour <strong>${rental.customer_name ?? ""}</strong>,</p>
            <p style="color:#666;line-height:1.6;margin:0 0 20px;">
              Votre contrat de location de routeur WiFi FENUASIM BOX est prêt. Merci de le lire attentivement et de le signer électroniquement avant la remise du matériel.
            </p>

            <div style="background:#f9f9f9;border-radius:10px;padding:20px;margin:0 0 24px;">
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr><td style="padding:4px 0;color:#888;">Routeur</td><td style="font-weight:bold;color:#1a0533;">${router?.model ?? "-"} (S/N ${router?.serial_number ?? "-"})</td></tr>
                <tr><td style="padding:4px 0;color:#888;">Période</td><td style="color:#1a0533;">${fmtDate(rental.rental_start)} → ${fmtDate(rental.rental_end)}</td></tr>
                <tr><td style="padding:4px 0;color:#888;">Durée</td><td style="color:#1a0533;">${rental.rental_days} nuit${rental.rental_days > 1 ? "s" : ""}</td></tr>
                <tr><td style="padding:4px 0;color:#888;">Loyer</td><td style="font-weight:bold;color:#A020F0;">${fmtEur(rental.rental_amount ?? 0)}</td></tr>
                <tr><td style="padding:4px 0;color:#888;">Caution</td><td style="color:#1a0533;">${fmtEur(rental.deposit_amount ?? 0)} (remboursable)</td></tr>
              </table>
            </div>

            <div style="text-align:center;margin:0 0 24px;">
              <a href="${signingUrl}"
                 style="display:inline-block;background:linear-gradient(135deg,#A020F0,#FF7F11);color:white;padding:16px 40px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;">
                Lire et signer le contrat →
              </a>
              <p style="margin:10px 0 0;font-size:12px;color:#999;">Ce lien est valable 7 jours</p>
            </div>

            <div style="background:#fef9f0;border:1px solid #fde68a;border-radius:8px;padding:14px;margin:0 0 20px;">
              <p style="font-size:12px;color:#92400e;margin:0;">
                <strong>Information légale :</strong> La saisie de votre nom complet constitue une signature électronique au sens de l'article 1367 du Code civil français.
              </p>
            </div>

            <p style="color:#888;font-size:13px;margin:0;">
              À bientôt,<br/>
              <strong style="color:#1a0533;">L'équipe FENUA SIM</strong><br/>
              <a href="mailto:hello@fenuasim.com" style="color:#A020F0;">hello@fenuasim.com</a>
            </p>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ success: true, token, signingUrl });
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? "Erreur envoi email" });
  }
}
