import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.headers["x-vercel-cron"] !== "1") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { data: targets, error } = await supabase
      .from("orders")
      .select("email, first_name, package_id, airalo_packages!inner(region_fr, region)")
      .gte("created_at", new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString())
      .lte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .in("status", ["completed", "paid"]);

    if (error) throw error;
    if (!targets || targets.length === 0) {
      return res.status(200).json({ sent: 0, message: "Aucun client à contacter" });
    }

    // Dédoublonner par email
    const uniqueTargets = Object.values(
      targets.reduce((acc: any, order: any) => {
        if (!acc[order.email]) acc[order.email] = order;
        return acc;
      }, {})
    ) as any[];

    // Filtrer assurés
    const { data: insured } = await supabase
      .from("insurances")
      .select("email")
      .in("email", uniqueTargets.map((t) => t.email));
    const insuredEmails = new Set((insured || []).map((i: any) => i.email));

    // Filtrer déjà contactés dans les 7 jours
    const { data: alreadySent } = await supabase
      .from("upsell_emails_sent")
      .select("email")
      .eq("type", "assurance_upsell")
      .gte("sent_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .in("email", uniqueTargets.map((t) => t.email));
    const alreadySentEmails = new Set((alreadySent || []).map((s: any) => s.email));

    const toContact = uniqueTargets.filter(
      (t) => !insuredEmails.has(t.email) && !alreadySentEmails.has(t.email)
    );

    if (toContact.length === 0) {
      return res.status(200).json({ sent: 0, message: "Tous déjà contactés ou assurés" });
    }

    let sent = 0;
    const errors: string[] = [];

    for (const target of toContact) {
      const name = target.first_name || target.email.split("@")[0];
      const destination =
        (target.airalo_packages as any)?.region_fr ||
        (target.airalo_packages as any)?.region ||
        "votre destination";

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Êtes-vous bien assuré pour votre voyage ?</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;line-height:1.6;color:#333;">
  <div style="max-width:600px;margin:0 auto;padding:20px;background-color:#ffffff;">

    <!-- Header -->
    <div style="text-align:center;padding:20px;border-bottom:2px solid #A020F0;">
      <img src="https://www.fenuasim.com/logo.png" alt="FENUA SIM" style="height:50px;margin-bottom:12px;" />
      <h1 style="color:#A020F0;font-size:26px;margin:0;font-weight:bold;">🌺 Votre voyage approche !</h1>
      <p style="font-size:15px;color:#666;margin:10px 0 0 0;">
        Bonjour ${name}, votre eSIM pour <strong>${destination}</strong> est active.<br>Êtes-vous bien protégé ?
      </p>
    </div>

    <div style="padding:24px 20px;">

      <!-- Garanties -->
      <div style="background-color:#f8fafc;padding:20px;border-radius:8px;margin-bottom:24px;border-left:4px solid #A020F0;">
        <h2 style="font-size:18px;margin:0 0 12px 0;color:#374151;">🛡️ Toutes nos formules incluent :</h2>
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr><td style="padding:7px 0;color:#111827;">✅ <strong>Frais médicaux à l'étranger</strong> — consultation, hospitalisation, urgences</td></tr>
          <tr><td style="padding:7px 0;color:#111827;">✅ <strong>Rapatriement d'urgence</strong> — retour pris en charge si nécessaire</td></tr>
          <tr><td style="padding:7px 0;color:#111827;">✅ <strong>Assistance 24h/24</strong> — une équipe disponible partout dans le monde</td></tr>
        </table>
        <p style="font-size:13px;color:#6b7280;margin:12px 0 0 0;">
          Des options complémentaires selon la formule choisie (annulation, bagages...).
        </p>
      </div>

      <!-- Notice -->
      <div style="background-color:#fef3c7;padding:15px;border-radius:8px;margin-bottom:24px;border-left:4px solid #f59e0b;">
        <p style="margin:0;font-size:14px;color:#92400e;">
          <strong>⚠️ Saviez-vous que</strong> les frais médicaux à l'étranger peuvent dépasser 100 000 € ?
          Une assurance voyage vous protège pour quelques euros par jour.
        </p>
      </div>

      <!-- CTA -->
      <div style="background:linear-gradient(135deg,#A020F0 0%,#FF7F11 100%);padding:24px;border-radius:12px;margin-bottom:24px;text-align:center;">
        <h2 style="color:white;font-size:18px;margin:0 0 8px 0;">Souscription en 2 minutes</h2>
        <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:0 0 16px 0;">Depuis votre téléphone, avant votre départ.</p>
        <a href="https://www.fenuasim.com/assurance"
           style="display:inline-block;background-color:white;color:#A020F0;font-weight:bold;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none;">
          Voir les formules →
        </a>
      </div>

      <!-- Footer -->
      <div style="border-top:1px solid #e5e7eb;padding-top:16px;font-size:12px;color:#6b7280;text-align:center;">
        <p style="margin:0 0 6px 0;">FENUA SIM · <a href="https://www.fenuasim.com" style="color:#A020F0;">fenuasim.com</a></p>
        <p style="margin:0;">Vous recevez cet email car vous avez récemment acheté une eSIM FENUA SIM.</p>
        <p style="margin:6px 0 0 0;"><a href="https://www.fenuasim.com" style="color:#6b7280;">Se désabonner</a></p>
      </div>

    </div>
  </div>
</body>
</html>`;

      const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "FENUA SIM", email: "hello@fenuasim.com" },
          to: [{ email: target.email, name }],
          replyTo: { email: "hello@fenuasim.com", name: "FENUA SIM" },
          subject: `🌺 Votre voyage à ${destination} — Êtes-vous bien assuré ?`,
          htmlContent: html,
          tags: ["upsell-assurance"],
          trackOpens: true,
          trackClicks: true,
        }),
      });

      if (!brevoRes.ok) {
        const err = await brevoRes.json();
        errors.push(`${target.email}: ${err.message}`);
        continue;
      }

      await supabase
        .from("upsell_emails_sent")
        .upsert(
          { email: target.email, type: "assurance_upsell", sent_at: new Date().toISOString() },
          { onConflict: "email,type" }
        );

      sent++;
    }

    return res.status(200).json({ sent, total: toContact.length, errors });

  } catch (err: any) {
    console.error("[upsell-assurance] erreur:", err);
    return res.status(500).json({ error: err.message });
  }
}
