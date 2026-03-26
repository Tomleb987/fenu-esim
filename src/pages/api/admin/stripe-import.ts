// ============================================================
// FENUA SIM – API Route : Import CSV Stripe
// src/pages/api/admin/stripe-import.ts
//
// Format : Stripe "Payments" export (unified_payments.csv)
// Colonnes clés :
//   id                = charge ID (ch_xxx)
//   Amount            = montant brut (XPF entier ou EUR avec virgule)
//   Currency          = xpf | eur
//   Converted Amount  = montant converti en EUR (avec virgule)
//   Fee               = frais Stripe en EUR (avec virgule)
//   Customer Email    = email client
//   Status            = Paid | Failed | Refunded
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

  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: Record<string, string> = {};

    headers.forEach((h, i) => {
      row[h.trim()] = (values[i] ?? "").trim().replace(/^"|"$/g, "");
    });

    return row;
  });
}

function parseLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

// ── Parser montant (gère virgule ET point comme séparateur décimal) ──
function parseAmount(val: string): number {
  if (!val) return 0;

  const cleaned = val.replace(/[\s"]/g, "");
  const normalized = cleaned.replace(",", ".");
  const n = parseFloat(normalized);

  return isNaN(n) ? 0 : n;
}

// ── Cache charge → session ────────────────────────────────────
const sessionCache: Record<string, string | null> = {};

async function getCheckoutSessionFromCharge(chargeId: string): Promise<string | null> {
  if (chargeId in sessionCache) return sessionCache[chargeId];

  try {
    const charge = await stripe.charges.retrieve(chargeId);

    const piId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;

    if (!piId) {
      sessionCache[chargeId] = null;
      return null;
    }

    const sessions = await stripe.checkout.sessions.list({
      payment_intent: piId,
      limit: 1,
    });

    const sessionId = sessions.data[0]?.id ?? null;
    sessionCache[chargeId] = sessionId;
    return sessionId;
  } catch {
    sessionCache[chargeId] = null;
    return null;
  }
}

// ── Réconciliation ────────────────────────────────────────────
async function reconcile(
  stripeId: string,
  chargeId: string,
  feeEur: number,
  netEur: number,
  amountEur: number
): Promise<boolean> {
  const sessionId = await getCheckoutSessionFromCharge(chargeId);
  if (!sessionId) return false;

  // 1. orders
  const { data: order } = await supabase
    .from("orders")
    .select("id, price, currency, package_id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (order) {
    const priceEur =
      order.currency?.toUpperCase() === "XPF"
        ? Number(order.price ?? 0) / 119.33
        : Number(order.price ?? 0);

    let costEur = 0;

    if (order.package_id) {
      const { data: cost } = await supabase
        .from("airalo_costs")
        .select("cost_eur")
        .eq("package_id", order.package_id)
        .maybeSingle();

      costEur = Number(cost?.cost_eur ?? 0);
    }

    const marginGross = priceEur - costEur;
    const marginNet = marginGross - feeEur;

    await supabase
      .from("orders")
      .update({
        stripe_fee: feeEur,
        stripe_net: netEur,
        margin_gross: Math.round(marginGross * 10000) / 10000,
        margin_net: Math.round(marginNet * 10000) / 10000,
      })
      .eq("id", order.id);

    await supabase
      .from("stripe_transactions")
      .update({
        order_id: order.id,
        reconciled: true,
        reconciled_at: new Date().toISOString(),
      })
      .eq("stripe_id", stripeId);

    return true;
  }

  // 2. insurances
  const { data: insurance } = await supabase
    .from("insurances")
    .select("id, frais_distribution, premium_ava")
    .or(`stripe_session_id.eq.${sessionId},stripe_payment_intent.eq.${sessionId}`)
    .maybeSingle();

  if (insurance) {
    const frais = Number(insurance.frais_distribution ?? 0);
    const premium = Number(insurance.premium_ava ?? 0);

    await supabase
      .from("insurances")
      .update({
        stripe_fee: feeEur,
        stripe_net: netEur,
        margin_net: frais - feeEur,
        amount_to_transfer: premium - frais,
      })
      .eq("id", insurance.id);

    await supabase
      .from("stripe_transactions")
      .update({
        insurance_id: insurance.id,
        reconciled: true,
        reconciled_at: new Date().toISOString(),
      })
      .eq("stripe_id", stripeId);

    return true;
  }

  // 3. router_rentals
  const { data: rental } = await supabase
    .from("router_rentals")
    .select("id, rental_amount, original_rental_amount, rental_offered, deposit_amount")
    .or(`stripe_checkout_session_id.eq.${sessionId},stripe_payment_intent.eq.${sessionId}`)
    .maybeSingle();

  if (rental) {
    const rentalAmount = Number(rental.rental_amount ?? 0);
    const rentalOffered = Boolean(rental.rental_offered);

    await supabase
      .from("router_rentals")
      .update({
        stripe_fee: feeEur,
        stripe_net: netEur,
        margin_net: rentalOffered ? 0 : rentalAmount - feeEur,
      })
      .eq("id", rental.id);

    await supabase
      .from("stripe_transactions")
      .update({
        rental_id: rental.id,
        reconciled: true,
        reconciled_at: new Date().toISOString(),
      })
      .eq("stripe_id", stripeId);

    return true;
  }

  return false;
}

// ── Handler ───────────────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { csv, batch } = req.body as { csv: string; batch: string };

  if (!csv) {
    return res.status(400).json({ error: "CSV manquant" });
  }

  const importBatch = batch ?? new Date().toISOString().slice(0, 7);
  let imported = 0;
  let reconciled = 0;
  let unreconciled = 0;
  const errors: string[] = [];

  const rows = parseCSV(csv);

  if (rows.length === 0) {
    return res.status(400).json({ error: "CSV vide ou format invalide" });
  }

  for (const row of rows) {
    try {
      const chargeId = row["id"] ?? "";
      if (!chargeId.startsWith("ch_")) continue;

      if (row["Status"]?.toLowerCase() !== "paid") continue;

      const amountRaw = parseAmount(row["Amount"] ?? "0");
      const amountEur = parseAmount(row["Converted Amount"] ?? row["Amount"] ?? "0");
      const feeEur = parseAmount(row["Fee"] ?? "0");
      const netEur = amountEur - feeEur;

      const isRefund = parseAmount(row["Amount Refunded"] ?? "0") > 0;

      const { error: upsertErr } = await supabase
        .from("stripe_transactions")
        .upsert(
          {
            stripe_id: chargeId,
            stripe_type: isRefund ? "refund" : "charge",
            amount: amountEur,
            fee: feeEur,
            net: netEur,
            currency: "EUR",
            description: row["Description"] ?? "",
            created_at_stripe: row["Created date (UTC)"]
              ? new Date(row["Created date (UTC)"]).toISOString()
              : null,
            import_batch: importBatch,
            raw_data: row,
          },
          { onConflict: "stripe_id", ignoreDuplicates: false }
        );

      if (upsertErr) {
        errors.push(`${chargeId}: ${upsertErr.message}`);
        continue;
      }

      imported++;

      if (!isRefund) {
        const ok = await reconcile(chargeId, chargeId, feeEur, netEur, amountEur);
        if (ok) reconciled++;
        else unreconciled++;
      }
    } catch (err: any) {
      errors.push(err.message ?? "Erreur inconnue");
    }
  }

  return res.status(200).json({
    imported,
    reconciled,
    unreconciled,
    errors: errors.slice(0, 10),
  });
}
