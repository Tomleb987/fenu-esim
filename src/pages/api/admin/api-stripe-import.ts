// ============================================================
// FENUA SIM – API Route : Import CSV Stripe
// Fichier : src/pages/api/admin/stripe-import.ts
// ============================================================

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

// ── Types ────────────────────────────────────────────────────
interface ImportResult {
  imported: number;
  reconciled: number;
  unreconciled: number;
  errors: string[];
}

// ── Parser CSV simple (gère les guillemets) ──────────────────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim().replace(/^"|"$/g, "")] = (values[idx] ?? "").trim().replace(/^"|"$/g, "");
    });
    rows.push(row);
  }
  return rows;
}

function parseLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQuotes = !inQuotes; }
    else if (line[i] === "," && !inQuotes) { result.push(current); current = ""; }
    else { current += line[i]; }
  }
  result.push(current);
  return result;
}

// ── Montant CSV Stripe → euros ───────────────────────────────
// Stripe exporte en centimes (integers) ou en décimaux selon la devise
function parseAmount(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9.\-]/g, "");
  const n = parseFloat(cleaned);
  if (isNaN(n)) return 0;
  // Stripe balance CSV : montants en centimes si integer pur
  // Stripe payments CSV : montants en euros décimaux
  // On détecte : si la valeur ressemble à un entier > 100, on divise par 100
  if (Number.isInteger(n) && Math.abs(n) > 100) return n / 100;
  return n;
}

// ── Réconciliation ───────────────────────────────────────────
async function reconcile(
  stripeId: string,
  sessionId: string,
  fee: number,
  net: number
): Promise<boolean> {
  // 1. Chercher dans orders
  if (sessionId) {
    const { data: order } = await supabase
      .from("orders")
      .select("id, price, cost_airalo, margin_gross")
      .or(`stripe_session_id.eq.${sessionId}`)
      .maybeSingle();

    if (order) {
      const marginGross = order.margin_gross ?? ((order.price ?? 0) - (order.cost_airalo ?? 0));
      const marginNet = marginGross - fee;
      await supabase.from("orders").update({
        stripe_fee: fee,
        stripe_net: net,
        margin_gross: marginGross,
        margin_net: marginNet,
      }).eq("id", order.id);

      await supabase.from("stripe_transactions").update({
        order_id: order.id,
        reconciled: true,
        reconciled_at: new Date().toISOString(),
      }).eq("stripe_id", stripeId);

      return true;
    }
  }

  // 2. Chercher dans insurances
  if (sessionId) {
    const { data: insurance } = await supabase
      .from("insurances")
      .select("id, frais_distribution, premium_ava")
      .or(`stripe_session_id.eq.${sessionId},stripe_payment_intent.eq.${sessionId}`)
      .maybeSingle();

    if (insurance) {
      const frais = insurance.frais_distribution ?? 0;
      const premium = insurance.premium_ava ?? 0;
      const marginNet = frais - fee;
      const amountToTransfer = premium - frais;

      await supabase.from("insurances").update({
        stripe_fee: fee,
        stripe_net: net,
        margin_net: marginNet,
        amount_to_transfer: amountToTransfer,
      }).eq("id", insurance.id);

      await supabase.from("stripe_transactions").update({
        insurance_id: insurance.id,
        reconciled: true,
        reconciled_at: new Date().toISOString(),
      }).eq("stripe_id", stripeId);

      return true;
    }
  }

  // 3. Chercher dans router_rentals
  if (sessionId) {
    const { data: rental } = await supabase
      .from("router_rentals")
      .select("id, rental_amount")
      .or(`stripe_session_id.eq.${sessionId},stripe_payment_intent.eq.${sessionId}`)
      .maybeSingle();

    if (rental) {
      const marginNet = (rental.rental_amount ?? 0) - fee;
      await supabase.from("router_rentals").update({
        stripe_fee: fee,
        stripe_net: net,
        margin_net: marginNet,
      }).eq("id", rental.id);

      await supabase.from("stripe_transactions").update({
        rental_id: rental.id,
        reconciled: true,
        reconciled_at: new Date().toISOString(),
      }).eq("stripe_id", stripeId);

      return true;
    }
  }

  return false;
}

// ── Handler ──────────────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Auth admin simple
  const { data: { session } } = await supabase.auth.getSession();
  // Note : en API route avec supabaseAdmin on peut aussi vérifier un header secret
  // Pour l'instant on fait confiance au fait que seul l'admin a accès au dashboard

  const { csv, batch } = req.body as { csv: string; batch: string };
  if (!csv) return res.status(400).json({ error: "CSV manquant" });

  const importBatch = batch ?? new Date().toISOString().slice(0, 7);
  const result: ImportResult = { imported: 0, reconciled: 0, unreconciled: 0, errors: [] };

  const rows = parseCSV(csv);
  if (rows.length === 0) return res.status(400).json({ error: "CSV vide ou format invalide" });

  for (const row of rows) {
    try {
      // Colonnes Stripe CSV (format "Balance history" ou "Payments")
      const stripeId =
        row["id"] || row["balance_transaction_id"] || row["Source"] || "";

      if (!stripeId) continue;

      // Montants — Stripe peut exporter en centimes ou en euros selon le rapport
      const amount = parseAmount(row["Amount"] || row["amount"] || "0");
      const fee    = parseAmount(row["Fee"]    || row["fee"]    || "0");
      const net    = parseAmount(row["Net"]    || row["net"]    || "0");

      const currency = (row["Currency"] || row["currency"] || "EUR").toUpperCase();
      const description = row["Description"] || row["description"] || "";
      const createdStr = row["Created date (UTC)"] || row["Created (UTC)"] || row["created"] || "";
      const sessionId =
        row["Source"] || row["Payment Intent ID"] ||
        row["payment_intent"] || row["checkout_session"] || "";

      // Ignorer les remboursements pour la marge (on les trace quand même)
      const isRefund = (row["Type"] || row["type"] || "").toLowerCase().includes("refund") ||
                       amount < 0;

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

      if (upsertErr) {
        result.errors.push(`${stripeId}: ${upsertErr.message}`);
        continue;
      }

      result.imported++;

      // Réconciliation (seulement sur les paiements, pas les remboursements)
      if (!isRefund && sessionId) {
        const ok = await reconcile(stripeId, sessionId, fee, net);
        if (ok) result.reconciled++;
        else result.unreconciled++;
      }
    } catch (err: any) {
      result.errors.push(err.message ?? "Erreur inconnue");
    }
  }

  return res.status(200).json(result);
}
