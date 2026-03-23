// ============================================================
// FENUA SIM – API : Charger contrat par token (public)
// src/pages/api/get-contract.ts
// GET ?token=xxx
// ============================================================

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { token } = req.query as { token?: string };
  if (!token) return res.status(400).json({ error: "Token requis" });

  const { data: rental, error } = await supabase
    .from("router_rentals")
    .select("id, customer_name, customer_email, rental_start, rental_end, rental_days, rental_amount, deposit_amount, signature_status, signed_at, signed_name, routers(model, serial_number)")
    .eq("signature_token", token)
    .single();

  if (error || !rental) return res.status(404).json({ error: "Contrat introuvable ou lien invalide" });

  // Vérifier expiration (7 jours)
  if (rental.signature_status === "pending") {
    const sentAt = rental.signature_sent_at ? new Date(rental.signature_sent_at) : null;
    if (sentAt) {
      const diffDays = (Date.now() - sentAt.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 7) return res.status(410).json({ error: "Ce lien a expiré. Contactez hello@fenuasim.com." });
    }
  }

  return res.status(200).json(rental);
}
