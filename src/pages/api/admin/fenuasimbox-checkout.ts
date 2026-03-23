// ============================================================
// FENUA SIM – API : Tunnel FENUASIMBOX
// src/pages/api/admin/fenuasimbox-checkout.ts
//
// POST {
//   clientFirstName, clientLastName, clientEmail, clientPhone,
//   packageId,           // ID Supabase du forfait eSIM
//   routerId,            // ID du routeur (optionnel)
//   rentalStart,         // date début location
//   rentalEnd,           // date fin location
//   rentalDays,          // nombre de jours
//   rentalAmount,        // loyer calculé
//   depositAmount,       // caution (défaut 12000 XPF)
//   currency,            // "eur" ou "xpf"
//   notes,
// }
// ============================================================

import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

const DEPOSIT_XPF = 12000;
const DEPOSIT_EUR = 100;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const {
    clientFirstName, clientLastName, clientEmail, clientPhone,
    packageId, routerId,
    rentalStart, rentalEnd, rentalDays,
    rentalAmount, currency, notes,
  } = req.body;

  if (!clientEmail || !clientFirstName || !clientLastName || !packageId) {
    return res.status(400).json({ error: "Champs obligatoires manquants" });
  }

  // ── Récupérer le forfait eSIM
  const { data: pkg, error: pkgErr } = await supabase
    .from("airalo_packages")
    .select("id, airalo_id, name, price_eur, final_price_eur, price_xpf, final_price_xpf, currency, data_amount, data_unit, validity_days, validity")
    .eq("id", packageId)
    .single();

  if (pkgErr || !pkg) return res.status(404).json({ error: "Forfait introuvable" });

  // ── Récupérer le routeur si sélectionné
  let router = null;
  if (routerId) {
    const { data } = await supabase.from("routers").select("*").eq("id", routerId).single();
    router = data;
  }

  const useCurrency = (currency || "eur").toLowerCase();
  const isXpf = useCurrency === "xpf";

  // Prix eSIM
  const esimPrice = isXpf
    ? (pkg.price_xpf || pkg.final_price_xpf || Math.round((pkg.price_eur || pkg.final_price_eur || 0) * 119.33))
    : (pkg.price_eur || pkg.final_price_eur || 0);

  // Prix location routeur en centimes
  const rentalAmountCents = router && rentalAmount
    ? isXpf ? Math.round(rentalAmount) : Math.round(rentalAmount * 100)
    : 0;
  const depositCents = router
    ? isXpf ? DEPOSIT_XPF : DEPOSIT_EUR * 100
    : 0;

  const esimAmountCents = isXpf ? Math.round(esimPrice) : Math.round(esimPrice * 100);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://fenuasim.com";

  // ── Construire les line_items Stripe
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: useCurrency,
        product_data: {
          name: `eSIM — ${pkg.name}`,
          description: `${pkg.data_amount}${pkg.data_unit} · ${pkg.validity_days || pkg.validity} jours`,
        },
        unit_amount: esimAmountCents,
      },
      quantity: 1,
    },
  ];

  if (router && rentalAmountCents > 0) {
    lineItems.push({
      price_data: {
        currency: useCurrency,
        product_data: {
          name: `Location routeur ${router.model}`,
          description: `${rentalDays} jour${rentalDays > 1 ? "s" : ""} · ${rentalStart} → ${rentalEnd}`,
        },
        unit_amount: rentalAmountCents,
      },
      quantity: 1,
    });
    lineItems.push({
      price_data: {
        currency: useCurrency,
        product_data: {
          name: "Caution routeur (remboursable)",
          description: "Remboursée au retour du routeur en bon état",
        },
        unit_amount: depositCents,
      },
      quantity: 1,
    });
  }

  // ── Créer la session Stripe
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: clientEmail,
    line_items: lineItems,
    metadata: {
      packageId: pkg.id,
      firstName: clientFirstName,
      lastName: clientLastName,
      email: clientEmail,
      phone: clientPhone || "",
      origin: "fenuasimbox",
      router_id: routerId || "",
      rental_start: rentalStart || "",
      rental_end: rentalEnd || "",
      rental_days: String(rentalDays || 0),
      rental_amount: String(rentalAmount || 0),
      deposit_amount: String(router ? (isXpf ? DEPOSIT_XPF : DEPOSIT_EUR) : 0),
      notes: notes || "",
    },
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/`,
  });

  // ── Sauvegarder le pré-enregistrement en base
  if (router) {
    await supabase.from("router_rentals").insert({
      router_id: routerId,
      customer_email: clientEmail,
      customer_name: `${clientFirstName} ${clientLastName}`,
      customer_phone: clientPhone || null,
      rental_start: rentalStart,
      rental_end: rentalEnd,
      rental_days: rentalDays,
      price_per_day: router.rental_price_per_day,
      rental_amount: rentalAmount,
      deposit_amount: isXpf ? DEPOSIT_XPF / 119.33 : DEPOSIT_EUR,
      deposit_status: "held",
      payment_status: "pending",
      status: "upcoming",
      stripe_session_id: session.id,
      notes: notes || null,
    });

    // Marquer le routeur comme loué
    await supabase.from("routers").update({ status: "rented" }).eq("id", routerId);
  }

  // ── Email interne de notification
  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_PASS },
  });

  const totalEur = isXpf
    ? ((esimAmountCents + rentalAmountCents + depositCents) / 119.33).toFixed(2)
    : ((esimAmountCents + rentalAmountCents + depositCents) / 100).toFixed(2);

  await transporter.sendMail({
    from: `"FENUA SIM" <hello@fenuasim.com>`,
    to: "hello@fenuasim.com",
    subject: `📦 FENUASIMBOX — Lien envoyé à ${clientFirstName} ${clientLastName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <div style="background: linear-gradient(135deg,#A020F0,#FF7F11); padding:20px; border-radius:12px 12px 0 0;">
          <h2 style="color:white;margin:0">📦 FENUASIMBOX — Nouveau dossier</h2>
        </div>
        <div style="background:#f9f9f9;padding:24px;border-radius:0 0 12px 12px;border:1px solid #eee;">
          <h3 style="color:#1a0533;margin:0 0 16px">Client</h3>
          <p style="margin:4px 0"><strong>${clientFirstName} ${clientLastName}</strong></p>
          <p style="margin:4px 0;color:#666">${clientEmail}${clientPhone ? ` · ${clientPhone}` : ""}</p>

          <h3 style="color:#1a0533;margin:16px 0 8px">eSIM</h3>
          <p style="margin:4px 0">${pkg.name} — ${pkg.data_amount}${pkg.data_unit} · ${pkg.validity_days || pkg.validity} jours</p>

          ${router ? `
          <h3 style="color:#1a0533;margin:16px 0 8px">Routeur</h3>
          <p style="margin:4px 0">${router.model} - ${rentalDays} nuit${rentalDays > 1 ? "s" : ""} (${new Date(rentalStart).toLocaleDateString("fr-FR")} au ${new Date(rentalEnd).toLocaleDateString("fr-FR")})</p>
          ` : ""}

          <h3 style="color:#1a0533;margin:16px 0 8px">Total</h3>
          <p style="margin:4px 0;font-size:18px;font-weight:bold;color:#A020F0">≈ ${totalEur} €</p>

          <div style="margin-top:20px;padding:12px;background:#fff3cd;border-radius:8px;border-left:4px solid #FF7F11">
            <p style="margin:0;font-size:13px;color:#666">
              ⏳ En attente du paiement client. À réception, l'eSIM sera commandée automatiquement via Airalo et envoyée à cette adresse.
            </p>
          </div>

          <div style="margin-top:16px;padding:12px;background:#f0fdf4;border-radius:8px">
            <table cellpadding="0" cellspacing="0" border="0" style="margin:12px auto 0;">
              <tr><td style="background:#A020F0;border-radius:8px;padding:0;">
                <a href="${session.url}" style="display:block;padding:12px 28px;color:white;text-decoration:none;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;">
                  Ouvrir le lien de paiement
                </a>
              </td></tr>
            </table>
          </div>
        </div>
      </div>
    `,
  });

  return res.status(200).json({
    success: true,
    url: session.url,
    sessionId: session.id,
  });
}
