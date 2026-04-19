import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.query.token as string;
  if (!token) return res.status(400).json({ error: "Token requis" });

  const { data: rental, error } = await supabase
    .from("router_rentals")
    .select("id, customer_name, customer_email, rental_start, rental_end, rental_days, rental_amount, deposit_amount, signature_status, signed_at, signed_name, routers(model, serial_number)")
    .eq("signature_token", token)
    .single();

  if (error || !rental) return res.status(404).json({ error: "Contrat introuvable ou lien expiré" });

  res.status(200).json({ rental });
}
