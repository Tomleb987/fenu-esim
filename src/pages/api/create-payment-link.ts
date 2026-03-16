// src/pages/api/create-payment-link.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Non authentifié" });
  const token = authHeader.replace("Bearer ", "");

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Token invalide" });

  const { data: partner, error: partnerError } = await supabaseAdmin
    .from("partner_profiles")
    .select("id, partner_code, advisor_name, promo_code, is_active")
    .eq("email", user.email)
    .single();

  if (partnerError || !partner || !partner.is_active)
    return res.status(403).json({ error: "Compte partenaire introuvable ou inactif" });

  const { packageId, clientFirstName, clientLastName, clientEmail, clientPhone } = req.body;
  if (!packageId || !clientFirstName || !clientLastName || !clientEmail)
    return res.status(400).json({ error: "Champs requis manquants" });

  const { data: packageData, error: packageError } = await supabaseAdmin
    .from("airalo_packages")
    .select("id, airalo_id, name, price_eur, final_price_eur, price_xpf, final_price_xpf, currency, data_amount, data_unit, validity_days")
    .eq("id", packageId)
    .single();

  if (packageError || !packageData) return res.status(404).json({ error: "Forfait introuvable" });

  const currency = (packageData.currency || "eur").toLowerCase();
  const rawPrice = packageData.price_xpf || packageData.final_price_xpf || packageData.price_eur || packageData.final_price_eur || 0;
  const unitAmount = currency === "xpf" ? Math.round(rawPrice) : Math.round(rawPrice * 100);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: clientEmail,
    line_items: [{
      price_data: {
        currency: "xpf",
        product_data: {
          name: packageData.name,
          description: `eSIM ${packageData.data_amount || ""}${packageData.data_unit || ""} — ${packageData.validity_days || ""} jours`,
        },
        unit_amount: Math.round(rawPrice),
      },
      quantity: 1,
    }],
    // Metadata allégée — uniquement les champs nécessaires au webhook
    metadata: {
      packageId: packageData.id,
      firstName: clientFirstName,
      lastName: clientLastName,
      email: clientEmail,
      promo_code: partner.promo_code || "",
      partner_code: partner.partner_code,
      origin: "partner_dashboard",
    },
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/`,
  });

  await supabaseAdmin.from("partner_orders").insert({
    partner_code: partner.partner_code,
    advisor_name: partner.advisor_name,
    package_id: packageData.id,
    package_name: packageData.name,
    client_first_name: clientFirstName,
    client_last_name: clientLastName,
    client_email: clientEmail,
    client_phone: clientPhone || null,
    stripe_session_id: session.id,
    payment_url: session.url,
    status: "pending",
    amount: Math.round(rawPrice),
    currency: "xpf",
    created_at: new Date().toISOString(),
  });

  return res.status(200).json({
    paymentUrl: session.url,
    sessionId: session.id,
  });
}
