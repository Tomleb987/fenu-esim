// ============================================================
// FENUA SIM – API Route : Import CSV Stripe
// src/pages/api/admin/stripe-import.ts
//
// Stratégie de réconciliation :
//   1. CSV colonne "Source" = charge ID (ch_xxx)
//   2. On appelle Stripe API : charge → payment_intent → checkout_session
//   3. On cherche checkout_session dans orders.stripe_session_id
// ============================================================

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import Stripe from "stripe";

export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

// ── Parser CSV ───────────────────────────────────────────────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h.trim().replace(/^"|"$/g, "")] = (values[i] ?? "").trim().replace(/^"|"$/g, "");
    });
    return row;
  });
}

function parseLine(line: string): string[] {
  const result: string[] = [];
  let current = "", inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === "," && !inQuotes) { result.push(current); current = ""; }
    else { current += char; }
  }
  result.push(current);
  return result;
}

// ── Montant CSV → euros ──────────────────────────────────────
function parseAmount(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9.\-]/g, "");
  const n = parseFloat(cleaned);
  if (isNaN(n)) return 0;
  // Stripe balance CSV : entiers = centimes
  if (Number.isInteger(n) && Math.abs(n) > 100) return n / 100;
  return n;
}

// ── Cache charge → session (évite les appels API répétés) ────
const sessionCache: Record<string, string | null> = {};

async function getCheckoutSessionFromCharge(chargeId: string): Promise<string | null> {
  if (chargeId in sessionCache) return sessionCache[chargeId];

  try {
    // Récupérer le charge pour avoir le payment_intent
    const charge = await stripe.charges.retrieve(chargeId);
    const piId = typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

    if (!piId) { sessionCache[chargeId] = null; return null; }

    // Chercher la checkout session liée au payment_intent
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: piId,
      limit: 1,
    });

    const sessionId = sessions.data[0]?.id ?? null;
    sessionCache[chargeId] = sessionId;
    return sessionId;
  } catch (err) {
    console.error(`Stripe lookup failed for ${chargeId}:`, err);
    sessionCache[chargeId] = null;
    return null;
  }
}

// ── Réconciliation ───────────────────────────────────────────
async function reconcile(
  stripeId: string,
  chargeId: string,
  fee: number,
  net: number
): Promise<boolean> {
  // Résoudre charge → checkout session via Stripe API
  const sessionId = chargeId.startsWith("ch_")
    ? await getCheckoutSessionFromCharge(chargeId)
    : chargeId; // si c'est déjà un cs_ ou pi_

  if (!sessionId) return false;

  // 1. Chercher dans orders via stripe_session_id
  const { data: order } = await supabase
    .from("orders")
    .select("id, price, cost_airalo, margin_gross")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (order) {
    const marginGross = order.margin_gross ?? ((order.price ?? 0) - (order.cost_airalo ?? 0));
    await supabase.from("orders").update({
      stripe_fee: fee,
      stripe_net: net,
      margin_gross: marginGross,
      margin_net: marginGross - fee,
    }).eq("id", order.id);

    await supabase.from("stripe_transactions").update({
      order_id: order.id,
      reconciled: true,
      reconciled_at: new Date().toISOString(),
    }).eq("stripe_id", stripeId);
    return true;
  }

  // 2. Chercher dans insurances
  const { data: insurance } = await supabase
    .from("insurances")
    .select("id, frais_distribution, premium_ava")
    .or(`stripe_session_id.eq.${sessionId},stripe_payment_intent.eq.${sessionId}`)
    .maybeSingle();

  if (insurance) {
    const frais   = insurance.frais_distribution ?? 0;
    const premium = insurance.premium_ava ?? 0;
    await supabase.from("insurances").update({
      stripe_fee: fee,
      stripe_net: net,
      margin_net: frais - fee,
      amount_to_transfer: premium - frais,
    }).eq("id", insurance.id);

    await supabase.from("stripe_transactions").update({
      insurance_id: insurance.id,
      reconciled: true,
      reconciled_at: new Date().toISOString(),
    }).eq("stripe_id", stripeId);
    return true;
  }

  // 3. Chercher dans router_rentals
  const { data: rental } = await supabase
    .from("router_rentals")
    .select("id, rental_amount")
    .or(`stripe_session_id.eq.${sessionId},stripe_payment_intent.eq.${sessionId}`)
    .maybeSingle();

  if (rental) {
    await supabase.from("router_rentals").update({
      stripe_fee: fee,
      stripe_net: net,
      margin_net: (rental.rental_amount ?? 0) - fee,
    }).eq("id", rental.id);

    await supabase.from("stripe_transactions").update({
      rental_id: rental.id,
      reconciled: true,
      reconciled_at: new Date().toISOString(),
    }).eq("stripe_id", stripeId);
    return true;
  }

  return false;
}

// ── Handler ──────────────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { csv, batch } = req.body as { csv: string; batch: string };
  if (!csv) return res.status(400).json({ error: "CSV manquant" });

  const importBatch = batch ?? new Date().toISOString().slice(0, 7);
  let imported = 0, reconciled = 0, unreconciled = 0;
  const errors: string[] = [];

  const rows = parseCSV(csv);
  if (rows.length === 0) return res.status(400).json({ error: "CSV vide ou format invalide" });

  for (const row of rows) {
    try {
      // ID de la ligne balance (bal_xxx ou txn_xxx)
      const stripeId = row["id"] || row["balance_transaction_id"] || "";
      if (!stripeId) continue;

      // Charge ID = colonne "Source" (ch_xxx)
      const chargeId = row["Source"] || row["source"] || row["charge"] || "";

      const amount = parseAmount(row["Amount"] || row["amount"] || "0");
      const fee    = parseAmount(row["Fee"]    || row["fee"]    || "0");
      const net    = parseAmount(row["Net"]    || row["net"]    || "0");

      const currency    = (row["Currency"] || row["currency"] || "EUR").toUpperCase();
      const description = row["Description"] || row["description"] || "";
      const createdStr  = row["Created date (UTC)"] || row["Created (UTC)"] || row["created"] || "";
      const isRefund    = (row["Type"] || row["type"] || "").toLowerCase().includes("refund") || amount < 0;

      // Upsert dans stripe_transactions
      const { error: upsertErr } = await supabase
        .from("stripe_transactions")
        .upsert({
          stripe_id: stripeId,
          stripe_type: row["Type"] || row["type"] || (isRefund ? "refund" : "charge"),
          amount,
          fee,
          net,
          currency,
          description,
          created_at_stripe: createdStr ? new Date(createdStr).toISOString() : null,
          import_batch: importBatch,
          raw_data: row,
        }, { onConflict: "stripe_id", ignoreDuplicates: false });

      if (upsertErr) { errors.push(`${stripeId}: ${upsertErr.message}`); continue; }
      imported++;

      // Réconciliation uniquement sur les paiements (pas les remboursements)
      if (!isRefund && chargeId) {
        const ok = await reconcile(stripeId, chargeId, fee, net);
        if (ok) reconciled++;
        else unreconciled++;
      }
    } catch (err: any) {
      errors.push(err.message ?? "Erreur inconnue");
    }
  }

  return res.status(200).json({ imported, reconciled, unreconciled, errors: errors.slice(0, 10) });
}
