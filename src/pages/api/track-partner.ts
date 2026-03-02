import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// Server-side only - uses service_role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { code } = req.query;

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Missing partner code" });
    }

    // 1. Look up the partner profile by code
    const { data: partner, error: partnerError } = await supabase
      .from("partner_profiles")
      .select("partner_code, advisor_name, promo_code, is_active")
      .eq("partner_code", code.toUpperCase())
      .single();

    if (partnerError || !partner) {
      console.error("Partner not found:", code, partnerError?.message);
      return res.status(404).json({ error: "Partenaire introuvable" });
    }

    if (!partner.is_active) {
      return res.status(404).json({ error: "Ce partenaire n'est plus actif" });
    }

    // 2. Record the click in link_clicks
    const rawIp =
      req.headers["x-forwarded-for"] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      "";
    const ip = Array.isArray(rawIp)
      ? rawIp[0]
      : String(rawIp).split(",")[0].trim();
    const userAgent = req.headers["user-agent"] || "";

    const { error: clickError } = await supabase.from("link_clicks").insert([
      {
        ref: partner.partner_code,
        code: partner.promo_code || null,
        ip_address: ip,
        user_agent: userAgent,
        // clicked_at defaults to now() in the DB
      },
    ]);

    if (clickError) {
      // Log but don't fail the redirect - click tracking is secondary
      console.error("Failed to record click:", clickError.message);
    }

    // 3. Return partner data for redirect
    return res.status(200).json({
      partner_code: partner.partner_code,
      advisor_name: partner.advisor_name,
      promo_code: partner.promo_code,
    });
  } catch (err) {
    console.error("Error in track-partner:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}