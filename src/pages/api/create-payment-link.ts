// src/pages/api/partner/create-payment-link.ts
// Crée une Stripe Checkout Session depuis le dashboard partenaire
// Auth : vérifie la session Supabase du partenaire connecté

import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── 1. Authentification : récupérer le partenaire via son JWT Supabase
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: "Token invalide" });
  }

  // ── 2. Vérifier que l'utilisateur est bien un partenaire actif
  const { data: partner, error: partnerError } = await supabaseAdmin
    .from("partner_profiles")
    .select("id, partner_code, advisor_name, promo_code, is_active")
    .eq("email", user.email)
    .single();

  if (partnerError || !partner || !partner.is_active) {
    return res.status(403).json({ error: "Compte partenaire introuvable ou inactif" });
  }

  // ── 3. Valider le body
  const { packageId, clientFirstName, clientLastName, clientEmail, clientPhone } = req.body;

  if (!packageId || !clientFirstName || !clientLastName || !clientEmail) {
    return res.status(400).json({
      error: "Champs requis manquants",
      required: ["packageId", "clientFirstName", "clientLastName", "clientEmail"],
    });
  }

  // ── 4. Récupérer le forfait Airalo depuis Supabase
  const { data: packageData, error: packageError } = await supabaseAdmin
    .from("airalo_packages")
    .select("*")
    .eq("id", packageId)
    .single();

  if (packageError || !packageData) {
    return res.status(404).json({ error: "Forfait introuvable" });
  }

  // ── 5. Déterminer le montant et la devise
  // Votre logique existante dans create-checkout-session.ts
  const currency = (packageData.currency || "eur").toLowerCase();
  let unitAmount: number;
  if (currency === "xpf") {
    unitAmount = Math.round(packageData.price || packageData.final_price_eur);
  } else {
    unitAmount = Math.round((packageData.price || packageData.final_price_eur) * 100);
  }

  // ── 6. Créer la Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: clientEmail,
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: packageData.name,
            description: packageData.description || `eSIM ${packageData.data_amount}${packageData.data_unit} — ${packageData.validity} jours`,
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    // ⚠️ Même format metadata que votre webhook existant — aucune modification du webhook nécessaire
    metadata: {
      packageId: packageData.id,
      firstName: clientFirstName,
      lastName: clientLastName,
      email: clientEmail,
      cartItems: JSON.stringify([{ ...packageData, partner_code: partner.partner_code }]),
      promo_code: partner.promo_code || "",
      partner_code: partner.partner_code,
      // Marqueur pour distinguer les commandes partenaire dans vos stats
      origin: "partner_dashboard",
      partner_advisor: partner.advisor_name || "",
    },
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/`,
    // Lien valable 24h
    expires_at: Math.floor(Date.now() / 1000) + 86400,
  });

  // ── 7. Logger la commande partenaire dans Supabase (statut : pending)
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
    amount: unitAmount,
    currency,
    created_at: new Date().toISOString(),
  });

  return res.status(200).json({
    paymentUrl: session.url,
    sessionId: session.id,
    expiresAt: new Date((session.expires_at ?? 0) * 1000).toISOString(),
  });
}
