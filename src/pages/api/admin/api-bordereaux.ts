// ============================================================
// FENUA SIM – API Route : Commissions & Bordereaux
// Fichier : src/pages/api/admin/bordereaux.ts
//
// Actions disponibles :
//   POST { action: "commissions", period: "2025-01" }
//     → Calcule les commissions partenaires du mois
//   POST { action: "anset", period: "2025-01" }
//     → Génère le bordereau ANSET du mois
//   POST { action: "mark_anset_paid", period: "2025-01", reference: "VIR-xxx" }
//     → Marque le reversement ANSET comme payé
//   POST { action: "mark_commission_paid", partner_code: "xxx", period: "2025-01", reference: "VIR-xxx" }
//     → Marque la commission partenaire comme payée
// ============================================================

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

// ── Types ────────────────────────────────────────────────────
interface PeriodRange { start: string; end: string }

function getPeriodRange(period: string): PeriodRange {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0); // dernier jour du mois
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: fmt(start), end: fmt(end) };
}

// ── ACTION : Calcul commissions partenaires ──────────────────
async function calcCommissions(period: string) {
  const { start, end } = getPeriodRange(period);

  // Commandes avec partenaire sur la période
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, email, package_name, price, partner_code, commission_amount, created_at")
    .not("partner_code", "is", null)
    .gte("created_at", `${start}T00:00:00`)
    .lte("created_at", `${end}T23:59:59`)
    .in("status", ["completed", "paid"]);

  if (error) throw new Error(`Fetch orders: ${error.message}`);
  if (!orders || orders.length === 0) return { message: "Aucune commande partenaire sur cette période", bordereaux: [] };

  // Taux de commission depuis partner_profiles
  const partnerCodes = [...new Set(orders.map(o => o.partner_code))];
  const { data: profiles } = await supabase
    .from("partner_profiles")
    .select("partner_code, advisor_name, commission_rate")
    .in("partner_code", partnerCodes);

  const rateMap: Record<string, { name: string; rate: number }> = {};
  (profiles ?? []).forEach(p => {
    rateMap[p.partner_code] = {
      name: p.advisor_name ?? p.partner_code,
      rate: p.commission_rate ?? 0.10,
    };
  });

  // Grouper par partenaire
  const grouped: Record<string, typeof orders> = {};
  orders.forEach(o => {
    if (!grouped[o.partner_code]) grouped[o.partner_code] = [];
    grouped[o.partner_code].push(o);
  });

  const bordereaux = [];

  for (const [code, partnerOrders] of Object.entries(grouped)) {
    const { name, rate } = rateMap[code] ?? { name: code, rate: 0.10 };
    const totalSales = partnerOrders.reduce((s, o) => s + (o.price ?? 0), 0);
    const totalCommission = Math.round(totalSales * rate * 100) / 100;

    // Mettre à jour commission_amount sur chaque commande si vide
    for (const order of partnerOrders) {
      if (!order.commission_amount) {
        await supabase
          .from("orders")
          .update({ commission_amount: Math.round((order.price ?? 0) * rate * 100) / 100 })
          .eq("id", order.id);
      }
    }

    // Upsert bordereau
    const { error: upsertErr } = await supabase
      .from("partner_commissions")
      .upsert({
        partner_code: code,
        period,
        period_start: start,
        period_end: end,
        total_orders: partnerOrders.length,
        total_sales: totalSales,
        total_commission: totalCommission,
        commission_rate: rate,
        status: "pending",
        updated_at: new Date().toISOString(),
      }, { onConflict: "partner_code,period" });

    if (upsertErr) throw new Error(`Upsert commission ${code}: ${upsertErr.message}`);

    bordereaux.push({
      partner_code: code,
      partner_name: name,
      period,
      total_orders: partnerOrders.length,
      total_sales: totalSales,
      total_commission: totalCommission,
      commission_rate: rate,
      orders: partnerOrders.map(o => ({
        id: o.id,
        date: o.created_at,
        email: o.email,
        product: o.package_name,
        amount: o.price,
        commission: Math.round((o.price ?? 0) * rate * 100) / 100,
      })),
    });
  }

  return { bordereaux, period };
}

// ── ACTION : Bordereau ANSET ─────────────────────────────────
async function calcANSET(period: string) {
  const { start, end } = getPeriodRange(period);

  const { data: insurances, error } = await supabase
    .from("insurances")
    .select(`
      id, created_at, user_email,
      subscriber_first_name, subscriber_last_name,
      adhesion_number, product_type,
      premium_ava, frais_distribution, amount_to_transfer, transfer_status
    `)
    .gte("created_at", `${start}T00:00:00`)
    .lte("created_at", `${end}T23:59:59`)
    .in("status", ["paid", "validated"]);

  if (error) throw new Error(`Fetch insurances: ${error.message}`);

  const contracts = (insurances ?? []).map(i => {
    const premium = i.premium_ava ?? 0;
    const frais   = i.frais_distribution ?? 0;
    const toTransfer = i.amount_to_transfer ?? (premium - frais);
    return {
      id: i.id,
      date: new Date(i.created_at).toLocaleDateString("fr-FR"),
      customer: `${i.subscriber_first_name ?? ""} ${i.subscriber_last_name ?? ""}`.trim(),
      adhesion: i.adhesion_number ?? "",
      product: i.product_type ?? "",
      premium_ava: premium,
      frais_distribution: frais,
      amount_to_transfer: toTransfer,
      transfer_status: i.transfer_status ?? "pending",
    };
  });

  const totalPremium   = contracts.reduce((s, c) => s + c.premium_ava, 0);
  const totalFees      = contracts.reduce((s, c) => s + c.frais_distribution, 0);
  const totalTransfer  = contracts.reduce((s, c) => s + c.amount_to_transfer, 0);

  // Upsert bordereau ANSET
  const { error: upsertErr } = await supabase
    .from("insurer_settlements")
    .upsert({
      period,
      period_start: start,
      period_end: end,
      total_contracts: contracts.length,
      total_premium: totalPremium,
      total_distribution_fees: totalFees,
      total_to_transfer: totalTransfer,
      status: "pending",
      updated_at: new Date().toISOString(),
    }, { onConflict: "period" });

  if (upsertErr) throw new Error(`Upsert ANSET: ${upsertErr.message}`);

  return {
    period,
    total_contracts: contracts.length,
    total_premium: totalPremium,
    total_distribution_fees: totalFees,
    total_to_transfer: totalTransfer,
    contracts,
  };
}

// ── ACTION : Marquer ANSET comme payé ────────────────────────
async function markANSETPaid(period: string, reference: string) {
  const { start, end } = getPeriodRange(period);
  const now = new Date().toISOString();

  const { error: e1 } = await supabase
    .from("insurer_settlements")
    .update({ status: "paid", paid_at: now, payment_reference: reference })
    .eq("period", period);
  if (e1) throw new Error(`Update settlement: ${e1.message}`);

  const { error: e2 } = await supabase
    .from("insurances")
    .update({ transfer_status: "paid", transfer_date: now })
    .gte("created_at", `${start}T00:00:00`)
    .lte("created_at", `${end}T23:59:59`)
    .in("status", ["paid", "validated"])
    .eq("transfer_status", "pending");
  if (e2) throw new Error(`Update insurances: ${e2.message}`);

  return { success: true, period, reference };
}

// ── ACTION : Marquer commission partenaire comme payée ───────
async function markCommissionPaid(partnerCode: string, period: string, reference: string) {
  const { error } = await supabase
    .from("partner_commissions")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_reference: reference,
    })
    .eq("partner_code", partnerCode)
    .eq("period", period);
  if (error) throw new Error(`Update commission: ${error.message}`);
  return { success: true, partner_code: partnerCode, period, reference };
}

// ── Handler ──────────────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { action, period, partner_code, reference } = req.body as {
    action: string;
    period?: string;
    partner_code?: string;
    reference?: string;
  };

  if (!action) return res.status(400).json({ error: "action requis" });

  try {
    switch (action) {
      case "commissions": {
        if (!period) return res.status(400).json({ error: "period requis (ex: 2025-01)" });
        const result = await calcCommissions(period);
        return res.status(200).json(result);
      }
      case "anset": {
        if (!period) return res.status(400).json({ error: "period requis (ex: 2025-01)" });
        const result = await calcANSET(period);
        return res.status(200).json(result);
      }
      case "mark_anset_paid": {
        if (!period || !reference) return res.status(400).json({ error: "period et reference requis" });
        const result = await markANSETPaid(period, reference);
        return res.status(200).json(result);
      }
      case "mark_commission_paid": {
        if (!period || !partner_code || !reference)
          return res.status(400).json({ error: "period, partner_code et reference requis" });
        const result = await markCommissionPaid(partner_code, period, reference);
        return res.status(200).json(result);
      }
      default:
        return res.status(400).json({ error: `Action inconnue : ${action}` });
    }
  } catch (err: any) {
    console.error("bordereaux error:", err);
    return res.status(500).json({ error: err.message ?? "Erreur serveur" });
  }
}
