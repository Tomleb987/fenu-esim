import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.headers["x-vercel-cron"] !== "1" && req.headers["authorization"] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { date_start, date_end } = req.body;
  if (!date_start || !date_end) {
    return res.status(400).json({ error: "date_start et date_end requis (ISO format)" });
  }

  try {
    const { data: targets, error } = await supabase
      .from("orders")
      .select("email, first_name, package_id")
      .gte("created_at", date_start)
      .lte("created_at", date_end)
      .in("status", ["completed", "paid"]);

    if (error) throw error;
    if (!targets || targets.length === 0) {
      return res.status(200).json({ sent: 0, message: "Aucun client à contacter" });
    }

    const uniqueTargets = Object.values(
      targets.reduce((acc: any, order: any) => {
        if (!acc[order.email]) acc[order.email] = order;
        return acc;
      }, {})
    ) as any[];

    const { data: insured } = await supabase
      .from("insurances")
      .select("user_email")
      .in("user_email", uniqueTargets.map((t) => t.email));
    const insuredEmails = new Set((insured || []).map((i: any) => i.user_email));

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

      const { data: pkgData } = await supabase
        .from("airalo_packages")
        .select("region_fr, region")
        .eq("airalo_id", target.package_id)
        .maybeSingle();
      const destination = pkgData?.region_fr || pkgData?.region || "votre destination";

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
          subject: `Votre voyage a ${destination} - Etes-vous bien assure ?`,
          htmlContent: `<p>Bonjour ${name}, votre eSIM pour ${destination} est active. Etes-vous bien protege ? <a href="https://www.fenuasim.com/assurance">Voir les formules</a></p>`,
          tags: ["upsell-assurance-catchup"],
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
    console.error("[upsell-catchup] erreur:", err);
    return res.status(500).json({ error: err.message });
  }
}