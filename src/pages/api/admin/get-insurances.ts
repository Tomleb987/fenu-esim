import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  
  const { data, error } = await supabaseAdmin
    .from("insurances")
    .select("id, user_email, subscriber_first_name, subscriber_last_name, product_type, adhesion_number, contract_number, premium_ava, total_amount, status, start_date, end_date, contract_link, attestation_url, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}
