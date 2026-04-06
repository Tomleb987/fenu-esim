// src/pages/api/referral/get-or-create.ts
// Retourne le code de parrainage du client connecté
// Si pas encore de code, en crée un automatiquement

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

function generateReferralCode(email: string): string {
  const base = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${base}${random}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Récupérer l'utilisateur connecté depuis le header Authorization
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: "Token invalide" });
  }

  try {
    // Chercher si un code existe déjà
    const { data: existing } = await supabase
      .from("referrals")
      .select("referral_code")
      .eq("referrer_email", user.email)
      .maybeSingle();

    if (existing) {
      return res.status(200).json({
        code: existing.referral_code,
        link: `https://www.fenuasim.com/p/${existing.referral_code}`,
      });
    }

    // Créer un nouveau code unique
    let code = generateReferralCode(user.email!);
    let attempts = 0;

    while (attempts < 5) {
      const { data: conflict } = await supabase
        .from("referrals")
        .select("id")
        .eq("referral_code", code)
        .maybeSingle();

      if (!conflict) break;
      code = generateReferralCode(user.email!);
      attempts++;
    }

    const { error: insertError } = await supabase
      .from("referrals")
      .insert({ referrer_email: user.email, referral_code: code });

    if (insertError) throw insertError;

    return res.status(200).json({
      code,
      link: `https://www.fenuasim.com/p/${code}`,
    });

  } catch (err: any) {
    console.error("[get-or-create-referral]", err);
    return res.status(500).json({ error: err.message });
  }
}