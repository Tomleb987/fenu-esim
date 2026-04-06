// src/pages/api/cron/send-review-emails.ts
// Tourne chaque nuit — envoie un email de demande d'avis Trustpilot
// 48h après l'expiration de l'eSIM, une seule fois par commande

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results = { sent: 0, skipped: 0, errors: 0 };

  try {
    // eSIMs expirées il y a entre 48h et 72h (fenêtre de 24h pour éviter les doublons)
    const now = new Date();
    const from48h = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();
    const to48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

    const { data: orders, error } = await supabase
      .from("airalo_orders")
      .select("id, email, nom, prenom, sim_iccid, expires_at, package_id")
      .not("expires_at", "is", null)
      .gte("expires_at", from48h)
      .lte("expires_at", to48h)
      .not("status", "in", '("cancelled")')
      .limit(50);

    if (error) throw error;
    if (!orders || orders.length === 0) {
      return res.status(200).json({ success: true, message: "Rien à envoyer", ...results });
    }

    console.log(`[send-review-emails] ${orders.length} eSIMs expirées trouvées`);

    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
      },
    });

    for (const order of orders) {
      try {
        // Vérifier si l'email a déjà été envoyé pour cette commande
        const { data: existing } = await supabase
          .from("review_emails_sent")
          .select("id")
          .eq("order_id", order.id)
          .maybeSingle();

        if (existing) {
          console.log(`[send-review-emails] Déjà envoyé pour ${order.id}`);
          results.skipped++;
          continue;
        }

        const customerName = [order.prenom, order.nom].filter(Boolean).join(" ") || "Client";
        const trustpilotUrl = "https://fr.trustpilot.com/evaluate/fenuasim.com";

        const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f8f7ff;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#A020F0 0%,#FF7F11 100%);padding:32px;border-radius:16px 16px 0 0;text-align:center;">
      <div style="font-size:22px;font-weight:800;color:#ffffff;">FENUA<span style="opacity:0.6;">•</span>SIM</div>
      <div style="font-size:36px;margin-top:12px;">🌺</div>
      <h1 style="color:white;font-size:22px;margin:12px 0 4px;">Comment s'est passé votre voyage ?</h1>
      <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:0;">Votre avis compte beaucoup pour nous</p>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:32px;border-radius:0 0 16px 16px;border:1px solid #eee;">
      <p style="font-size:16px;color:#1a0533;font-weight:600;margin:0 0 8px;">Bonjour ${customerName},</p>
      <p style="font-size:14px;color:#4a5568;line-height:1.7;margin:0 0 20px;">
        Votre eSIM FENUA SIM vient d'expirer — nous espérons que votre voyage s'est parfaitement déroulé et que vous êtes rentré connecté du début à la fin !
      </p>
      <p style="font-size:14px;color:#4a5568;line-height:1.7;margin:0 0 24px;">
        Votre expérience aide d'autres voyageurs à choisir la bonne solution. Si vous avez 30 secondes, un avis sur Trustpilot nous aiderait énormément 🙏
      </p>

      <!-- CTA -->
      <div style="text-align:center;margin:28px 0;">
        <a href="${trustpilotUrl}" 
           style="display:inline-block;background:linear-gradient(135deg,#A020F0,#FF7F11);color:white;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">
          ⭐ Laisser mon avis sur Trustpilot
        </a>
      </div>

      <p style="font-size:13px;color:#9ca3af;text-align:center;margin:20px 0 0;">
        Cela prend moins d'une minute — merci d'avance 🌺
      </p>

      <!-- Separator -->
      <div style="border-top:1px solid #f0e8ff;margin:24px 0;"></div>

      <!-- Prochain voyage -->
      <p style="font-size:14px;color:#4a5568;text-align:center;margin:0 0 12px;">
        Préparez déjà votre prochain voyage ?
      </p>
      <div style="text-align:center;">
        <a href="https://www.fenuasim.com/shop"
           style="display:inline-block;border:1.5px solid #A020F0;color:#A020F0;font-weight:bold;font-size:14px;padding:10px 24px;border-radius:10px;text-decoration:none;">
          Voir nos forfaits eSIM →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:16px;font-size:11px;color:#9ca3af;">
      FENUA SIM — 58 rue Monceau, 75008 Paris<br/>
      <a href="mailto:sav@fenuasim.com" style="color:#A020F0;">sav@fenuasim.com</a> · WhatsApp +33 7 49 78 21 01
    </div>
  </div>
</body>
</html>`;

        await transporter.sendMail({
          to: order.email,
          from: `"FENUA SIM" <hello@fenuasim.com>`,
          replyTo: `"FENUA SIM" <hello@fenuasim.com>`,
          subject: "Comment s'est passé votre voyage ? 🌺",
          html: emailHTML,
          text: `Bonjour ${customerName},\n\nVotre eSIM FENUA SIM vient d'expirer — nous espérons que votre voyage s'est bien passé !\n\nSi vous avez 30 secondes, laissez-nous un avis sur Trustpilot : ${trustpilotUrl}\n\nMerci et à bientôt !\nL'équipe FENUA SIM`,
        });

        // Marquer comme envoyé
        await supabase.from("review_emails_sent").insert({
          email: order.email,
          order_id: order.id,
          sim_iccid: order.sim_iccid,
        });

        console.log(`[send-review-emails] ✓ Email envoyé à ${order.email}`);
        results.sent++;

        // Pause 300ms entre chaque envoi
        await new Promise((r) => setTimeout(r, 300));

      } catch (err) {
        console.error(`[send-review-emails] Erreur pour ${order.email}:`, err);
        results.errors++;
      }
    }

    return res.status(200).json({ success: true, ...results });

  } catch (err: any) {
    console.error("[send-review-emails] Erreur critique:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}