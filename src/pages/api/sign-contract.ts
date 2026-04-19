import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { token, signedName } = req.body as { token: string; signedName: string };
  if (!token || !signedName) return res.status(400).json({ error: "Token et nom requis" });

  const { data: rental, error } = await supabase
    .from("router_rentals")
    .select("id, signature_status, customer_email, customer_name")
    .eq("signature_token", token)
    .single();

  if (error || !rental) return res.status(404).json({ error: "Contrat introuvable" });
  if (rental.signature_status === "signed") return res.status(400).json({ error: "Contrat déjà signé" });

  const { error: updateError } = await supabase
    .from("router_rentals")
    .update({
      signature_status: "signed",
      signed_at: new Date().toISOString(),
      signed_name: signedName,
    })
    .eq("id", rental.id);

  if (updateError) return res.status(500).json({ error: updateError.message });

  res.status(200).json({ success: true });
}
