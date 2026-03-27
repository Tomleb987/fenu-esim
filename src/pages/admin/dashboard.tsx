// ============================================================
// FENUA SIM – Dashboard de pilotage
// src/pages/admin/dashboard.tsx
// ============================================================

import { useEffect, useState, useCallback } from "react";
import type { ReactElement } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "@/lib/supabaseClient";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, Package, Shield, Wifi, AlertTriangle,
  RefreshCw, Upload, ChevronRight, CheckCircle, Clock, LogOut, Calendar,
} from "lucide-react";

const ADMIN_EMAIL = "admin@fenuasim.com";
const G = "linear-gradient(135deg, #A020F0 0%, #FF4D6D 50%, #FF7F11 100%)";
const C = { esim: "#A020F0", insurance: "#FF4D6D", routers: "#FF7F11", partner: "#0EA896" };

// ── Formatage montants avec centimes ─────────────────────────
const fmtEur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);

const fmtNum = (n: number) => new Intl.NumberFormat("fr-FR").format(n || 0);

const fmtPct = (n: number, total: number) =>
  total === 0 ? "0 %" : `${((n / total) * 100).toFixed(1)} %`;

// ── Périodes ─────────────────────────────────────────────────
function getPeriod(key: string) {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const today = fmt(now);
  switch (key) {
    case "auj": return { start: today, end: today };
    case "7j":  { const s = new Date(now); s.setDate(s.getDate() - 7);  return { start: fmt(s), end: today }; }
    case "3m":  { const s = new Date(now); s.setMonth(s.getMonth() - 3); return { start: fmt(s), end: today }; }
    case "ytd": return { start: `${now.getFullYear()}-01-01`, end: today };
    default:    { const s = new Date(now); s.setDate(s.getDate() - 30); return { start: fmt(s), end: today }; }
  }
}

// ── Types ─────────────────────────────────────────────────────
interface KPIs {
  esim:      { count: number; revenue: number; margin_net: number; commissions: number; avg_basket: number };
  insurance: { count: number; revenue: number; premiums: number; pending_transfer: number; pending_count: number };
  routers:   { count: number; revenue: number; deposits: number; available: number; rented: number; total: number };
  totals:    { revenue: number; margin: number; stripe_fees: number };
}
interface MonthlyPoint { month: string; esim: number; insurance: number; routers: number }
interface SourcePoint  { source: string; revenue: number; count: number }
interface PartnerRow   { partner_code: string; partner_name: string; total_sales: number; total_commission: number; orders_count: number }
interface ANSETRow     { period: string; total_contracts: number; total_to_transfer: number; status: string }
interface RouterRow    { id: string; model: string; serial_number: string; status: string; current_renter: string | null; current_rental_end: string | null }

// ── Hook données ──────────────────────────────────────────────
function useDashboard(period: { start: string; end: string }) {
  const [kpis, setKpis]         = useState<KPIs | null>(null);
  const [monthly, setMonthly]   = useState<MonthlyPoint[]>([]);
  const [sources, setSources]   = useState<SourcePoint[]>([]);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [anset, setAnset]       = useState<ANSETRow[]>([]);
  const [stock, setStock]       = useState<RouterRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [esimRes, insRes, rentRes, stockRes, ansetRes, partnerRes, pendingInsRes, activeRentsRes] = await Promise.all([
        supabase.from("orders")
          .select("price, margin_net, commission_amount, source, partner_code, stripe_fee, created_at")
          .gte("created_at", `${period.start}T00:00:00`)
          .lte("created_at", `${period.end}T23:59:59`)
          .in("status", ["completed", "paid"]),
        supabase.from("insurances")
          .select("frais_distribution, premium_ava, amount_to_transfer, transfer_status, margin_net, stripe_fee, created_at")
          .gte("created_at", `${period.start}T00:00:00`)
          .lte("created_at", `${period.end}T23:59:59`)
          .in("status", ["paid", "validated"]),
        supabase.from("router_rentals")
          .select("rental_amount, deposit_amount, deposit_status, margin_net, stripe_fee, created_at, status, rental_end")
          .gte("created_at", `${period.start}T00:00:00`)
          .lte("created_at", `${period.end}T23:59:59`)
          .in("payment_status", ["paid", "pending", "manual"]),
        supabase.from("v_router_stock").select("*"),
        supabase.from("router_rentals")
          .select("id, router_id, status, rental_end")
          .eq("status", "active")
          .gte("rental_end", new Date().toISOString().slice(0, 10)),
        supabase.from("insurer_settlements")
          .select("period, total_contracts, total_to_transfer, status")
          .order("period", { ascending: false }).limit(12),
        supabase.from("v_partner_commissions_detail").select("*")
          .gte("period_month", `${period.start.slice(0, 7)}-01`)
          .lte("period_month", `${period.end.slice(0, 7)}-28`),
        // Toutes assurances en attente (toutes périodes confondues)
        supabase.from("insurances")
          .select("id, created_at, premium_ava, frais_distribution, amount_to_transfer, transfer_status")
          .in("status", ["paid", "validated"])
          .eq("transfer_status", "pending"),
      ]);

      const esim        = esimRes.data ?? [];
      const ins         = insRes.data  ?? [];
      const rent        = rentRes.data ?? [];
      const stk         = stockRes.data ?? [];
      const activeRents = activeRentsRes?.data ?? [];

      // Convertir price en EUR selon la devise
      const priceEur = (o: any) => {
        const c = (o.currency || "EUR").toUpperCase();
        if (c === "XPF" || c === "CFP") return (o.price ?? 0) * 100 / 119.33;
        return o.price ?? 0;
      };
      const esimRev   = esim.reduce((s, o) => s + priceEur(o), 0);
      const esimMgn   = esim.reduce((s, o) => s + (o.margin_net ?? 0), 0);
      const esimCom   = esim.reduce((s, o) => s + (o.commission_amount ?? 0), 0);
      const esimFees  = esim.reduce((s, o) => s + (o.stripe_fee ?? 0), 0);

      // CA réel assurance = frais_distribution + commission Fenua (10% de premium_ava)
      const insRev    = ins.reduce((s, i) => s + (i.frais_distribution ?? 0) + ((i.premium_ava ?? 0) * 0.10), 0);
      const insPrem   = ins.reduce((s, i) => s + (i.premium_ava ?? 0), 0);
      const insPend   = ins.filter(i => i.transfer_status === "pending");
      const insPendA  = insPend.reduce((s, i) => s + (i.amount_to_transfer ?? ((i.premium_ava ?? 0) * 0.90)), 0);
      const insFees   = ins.reduce((s, i) => s + (i.stripe_fee ?? 0), 0);

      // rental_amount peut être en XPF — convertir en EUR si besoin
      const rentToEur = (r: any) => {
        const amt = r.rental_amount ?? 0;
        // Si montant > 1000 c'est probablement du XPF
        return amt > 500 ? amt / 119.33 : amt;
      };
      const rentRev   = rent.reduce((s, r) => s + rentToEur(r), 0);
      const rentDep   = rent.filter(r => r.deposit_status === "held").reduce((s, r) => s + (r.deposit_amount ?? 0) / 119.33, 0);
      const rentFees  = rent.reduce((s, r) => s + (r.stripe_fee ?? 0), 0);

      const totalFees = esimFees + insFees + rentFees;
      const totalRev  = esimRev + insRev + rentRev;

      // Tous les reversements en attente (toutes périodes) pour l'alerte globale
      const allPendingIns = pendingInsRes.data ?? [];
      const allPendingCount = allPendingIns.length;
      const allPendingAmount = allPendingIns.reduce((s: number, i: any) =>
        s + Number(i.amount_to_transfer ?? ((i.premium_ava ?? 0) * 0.90)), 0);

      setKpis({
        esim:      { count: esim.length, revenue: esimRev, margin_net: esimMgn, commissions: esimCom, avg_basket: esim.length ? esimRev / esim.length : 0 },
        insurance: { count: ins.length, revenue: insRev, premiums: insPrem,
          pending_transfer: allPendingAmount,
          pending_count: allPendingCount },
        routers:   { count: rent.length, revenue: rentRev, deposits: rentDep, available: stk.filter(r => r.status === "available").length, rented: activeRents.length, total: stk.length },
        totals:    { revenue: totalRev, margin: esimMgn + insRev + rentRev - totalFees, stripe_fees: totalFees },
      });

      // Mensuel
      const mMap: Record<string, MonthlyPoint> = {};
      const addM = (date: string, type: keyof Omit<MonthlyPoint, "month">, v: number) => {
        const m = date.slice(0, 7);
        if (!mMap[m]) mMap[m] = { month: m, esim: 0, insurance: 0, routers: 0 };
        mMap[m][type] += v;
      };
      esim.forEach(o => addM(o.created_at, "esim", o.price ?? 0));
      ins.forEach(i  => addM(i.created_at, "insurance", i.frais_distribution ?? 0));
      rent.forEach(r => addM(r.created_at, "routers", r.rental_amount ?? 0));
      setMonthly(Object.values(mMap).sort((a, b) => a.month.localeCompare(b.month)));

      // Sources
      const sMap: Record<string, SourcePoint> = {};
      esim.forEach(o => {
        const src = o.source ?? (o.partner_code ? "Partenaire" : "Direct");
        if (!sMap[src]) sMap[src] = { source: src, revenue: 0, count: 0 };
        sMap[src].revenue += o.price ?? 0;
        sMap[src].count   += 1;
      });
      setSources(Object.values(sMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5));

      // Partenaires
      const pMap: Record<string, PartnerRow> = {};
      (partnerRes.data ?? []).forEach((p: any) => {
        if (!pMap[p.partner_code]) pMap[p.partner_code] = { partner_code: p.partner_code, partner_name: p.partner_name ?? p.partner_code, total_sales: 0, total_commission: 0, orders_count: 0 };
        pMap[p.partner_code].total_sales      += p.total_sales ?? 0;
        pMap[p.partner_code].total_commission += p.total_commission ?? p.total_commission_calculated ?? 0;
        pMap[p.partner_code].orders_count     += p.orders_count ?? 0;
      });
      setPartners(Object.values(pMap).sort((a, b) => b.total_sales - a.total_sales));

      // Grouper les assurances en attente par mois
      const pendingIns = pendingInsRes.data ?? [];
      const pendingByMonth: Record<string, any> = {};
      pendingIns.forEach((i: any) => {
        const m = (i.created_at as string).slice(0, 7);
        if (!pendingByMonth[m]) pendingByMonth[m] = {
          period: m,
          total_contracts: 0,
          total_to_transfer: 0,
          status: "pending"
        };
        pendingByMonth[m].total_contracts += 1;
        pendingByMonth[m].total_to_transfer += i.amount_to_transfer
          ?? ((i.premium_ava ?? 0) - (i.frais_distribution ?? 0));
      });

      // Merger : insurer_settlements + mois en attente non encore dans la table
      const settlementMap: Record<string, any> = {};
      (ansetRes.data ?? []).forEach((s: any) => { settlementMap[s.period] = s; });
      Object.values(pendingByMonth).forEach((p: any) => {
        // Si déjà dans settlements → ne pas écraser (la table a priorité)
        if (!settlementMap[p.period]) settlementMap[p.period] = p;
        // Si dans settlements mais pending → mettre à jour les totaux
        else if (settlementMap[p.period].status === "pending") {
          settlementMap[p.period].total_contracts = p.total_contracts;
          settlementMap[p.period].total_to_transfer = p.total_to_transfer;
        }
      });
      const mergedAnset = Object.values(settlementMap)
        .sort((a: any, b: any) => b.period.localeCompare(a.period));

      setAnset(mergedAnset);
      setStock(stk);
    } catch (err: any) {
      setError(err.message ?? "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [period.start, period.end]);

  useEffect(() => { load(); }, [load]);
  return { kpis, monthly, sources, partners, anset, stock, loading, error, reload: load };
}

// ── Composants UI ─────────────────────────────────────────────
function KpiCard({ label, value, sub, badge, warn }: { label: string; value: string; sub?: string; badge?: string; warn?: boolean }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-xl font-bold text-gray-900 tabular-nums">{value}</p>
      {sub   && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {badge && <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-2 font-medium ${warn ? "bg-amber-100 text-amber-700" : "bg-purple-100 text-purple-700"}`}>{badge}</span>}
    </div>
  );
}

function Section({ title, icon: Icon }: { title: string; icon: any }) {
  return (
    <div className="flex items-center gap-2 mt-8 mb-3">
      <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: G }}>
        <Icon size={13} className="text-white" />
      </div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{title}</p>
    </div>
  );
}

function Spinner() {
  return <div className="flex justify-center py-8"><div className="w-7 h-7 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>;
}



// ── Composant Import Coûts Airalo ─────────────────────────────
function CostsImportSection({ onDone }: { onDone: () => void }) {
  const [usdRate, setUsdRate] = useState("0.92");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setResult(null);
    const text = await file.text();
    const res = await fetch("/api/admin/import-costs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: text, usd_rate: parseFloat(usdRate) }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
    if (data.updated > 0) onDone();
    e.target.value = "";
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-700">Import prix de revient</p>
          <p className="text-xs text-gray-400 mt-1">
            CSV avec colonnes <code className="bg-gray-100 px-1 rounded">package_id</code> et <code className="bg-gray-100 px-1 rounded">cost_eur</code> (ou <code className="bg-gray-100 px-1 rounded">cost_usd</code>)
          </p>
          <div className="flex items-center gap-2 mt-3">
            <label className="text-xs text-gray-500 shrink-0">Taux USD → EUR</label>
            <input
              type="number"
              step="0.001"
              value={usdRate}
              onChange={e => setUsdRate(e.target.value)}
              className="w-20 text-xs px-2 py-1.5 border border-gray-200 rounded-lg text-gray-700"
            />
            <span className="text-xs text-gray-400">(ex: 0.920)</span>
          </div>
          {result && (
            <div className={`mt-3 text-xs rounded-xl px-3 py-2 ${result.updated > 0 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
              ✅ {result.updated} packages mis à jour
              {result.notFound > 0 && <span className="ml-2">· ⚠️ {result.notFound} non trouvés</span>}
              {result.marginsRecalculated && <span className="ml-2">· Marges recalculées</span>}
              {result.notFoundIds?.length > 0 && (
                <div className="mt-1 text-xs opacity-70">Non trouvés : {result.notFoundIds.join(", ")}</div>
              )}
            </div>
          )}
        </div>
        <label className="cursor-pointer shrink-0">
          <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={loading} />
          <span className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl text-white font-medium shadow-sm transition-opacity ${loading ? "opacity-50" : "hover:opacity-90"}`}
            style={{ background: G }}>
            <Upload size={14} />
            {loading ? "Import…" : "Importer CSV"}
          </span>
        </label>
      </div>
    </div>
  );
}

// ── Taux de conversion ────────────────────────────────────────
const EUR_TO_XPF = 119.33;
function toEur(amount: number, currency: string): number {
  if (!amount) return 0;
  const c = (currency || "EUR").toUpperCase();
  // orders.price XPF = amount / 100 (Stripe stocke en centimes XPF)
  // price_eur = price * 100 / 119.33 = amount / 119.33
  if (c === "XPF" || c === "CFP") return (amount * 100) / EUR_TO_XPF;
  return amount;
}

// ── Types Stats ───────────────────────────────────────────────
interface MonthStat { month: string; label: string; count: number; revenue_eur: number; direct: number; partner: number }
interface PackageStat { name: string; count: number; revenue_eur: number }
interface DestinationStat { destination: string; count: number; revenue_eur: number }

// ── Hook Stats ────────────────────────────────────────────────
function useStatsData() {
  const [monthlyStats, setMonthlyStats] = useState<MonthStat[]>([]);
  const [topPackages, setTopPackages]   = useState<PackageStat[]>([]);
  const [topDest, setTopDest]           = useState<DestinationStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError]     = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setStatsLoading(true);
      try {
        const { data: orders, error } = await supabase
          .from("orders")
          .select("price, currency, package_name, package_id, partner_code, created_at")
          .gte("created_at", "2025-04-01T00:00:00")
          .in("status", ["completed", "paid"])
          .order("created_at", { ascending: true });

        if (error) throw error;
        const data = orders ?? [];

        const MONTH_FR = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"];
        const mMap: Record<string, MonthStat> = {};
        data.forEach(o => {
          const m = o.created_at.slice(0, 7);
          const [y, mo] = m.split("-").map(Number);
          const label = `${MONTH_FR[mo - 1]} ${String(y).slice(2)}`;
          const eur = toEur(o.price ?? 0, o.currency ?? "EUR");
          if (!mMap[m]) mMap[m] = { month: m, label, count: 0, revenue_eur: 0, direct: 0, partner: 0 };
          mMap[m].count += 1;
          mMap[m].revenue_eur += eur;
          if (o.partner_code) mMap[m].partner += eur;
          else mMap[m].direct += eur;
        });
        setMonthlyStats(Object.values(mMap).sort((a, b) => a.month.localeCompare(b.month)));

        const pMap: Record<string, PackageStat> = {};
        data.forEach(o => {
          const name = o.package_name ?? "Inconnu";
          const eur = toEur(o.price ?? 0, o.currency ?? "EUR");
          if (!pMap[name]) pMap[name] = { name, count: 0, revenue_eur: 0 };
          pMap[name].count += 1;
          pMap[name].revenue_eur += eur;
        });
        setTopPackages(Object.values(pMap).sort((a, b) => b.count - a.count).slice(0, 10));

        // Jointure via airalo_id = package_id (pas via name)
        const packageIds = [...new Set(data.map(o => o.package_id).filter(Boolean))] as string[];
        const { data: pkgs } = await supabase
          .from("airalo_packages")
          .select("airalo_id, slug, country, region_fr, region, type")
          .in("airalo_id", packageIds.slice(0, 200));

        const destMap: Record<string, string> = {};
        (pkgs ?? []).forEach((p: any) => {
          // region_fr → region → "Autre" (country est toujours null dans Airalo)
          destMap[p.airalo_id] = p.region_fr || p.region || "Autre";
        });

        const dMap: Record<string, DestinationStat> = {};
        data.forEach(o => {
          const dest = destMap[o.package_id ?? ""] ?? "Autre";
          const eur = toEur(o.price ?? 0, o.currency ?? "EUR");
          if (!dMap[dest]) dMap[dest] = { destination: dest, count: 0, revenue_eur: 0 };
          dMap[dest].count += 1;
          dMap[dest].revenue_eur += eur;
        });
        setTopDest(Object.values(dMap).sort((a, b) => b.count - a.count).slice(0, 8));
      } catch (err: any) {
        setStatsError(err.message);
      } finally {
        setStatsLoading(false);
      }
    }
    load();
  }, []);

  return { monthlyStats, topPackages, topDest, statsLoading, statsError };
}

// ── Composant StatsSection ────────────────────────────────────
function StatsSection() {
  const { monthlyStats, topPackages, topDest, statsLoading, statsError } = useStatsData();
  const [view, setView] = useState<"revenue" | "count">("revenue");

  if (statsError) return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mt-4">⚠️ Erreur stats : {statsError}</div>
  );

  const maxPkg  = topPackages[0]?.count ?? 1;
  const maxDest = topDest[0]?.count ?? 1;
  const totalCount   = monthlyStats.reduce((s, m) => s + m.count, 0);
  const totalRevEur  = monthlyStats.reduce((s, m) => s + m.revenue_eur, 0);
  const totalPartner = monthlyStats.reduce((s, m) => s + m.partner, 0);

  return (
    <div className="mt-2">
      {/* Graphique mensuel */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mt-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-700">Historique depuis le lancement</p>
            <p className="text-xs text-gray-400 mt-0.5">Avril 2025 · toutes devises converties en EUR</p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button onClick={() => setView("revenue")}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${view === "revenue" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}>
              CA (€)
            </button>
            <button onClick={() => setView("count")}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${view === "count" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}>
              Volume
            </button>
          </div>
        </div>
        {statsLoading ? <Spinner /> : monthlyStats.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-sm text-gray-400">Aucune donnée</div>
        ) : (
          <>
            {view === "revenue" && (
              <>
                <div className="flex gap-4 mb-3 text-xs text-gray-400 flex-wrap">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: C.esim }} />Direct</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: C.partner }} />Partenaires</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyStats} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} tickFormatter={v => `${v} €`} />
                    <Tooltip formatter={(v: number, name: string) => [`${v.toFixed(2)} €`, name === "direct" ? "Direct" : "Partenaires"]} labelFormatter={l => `Mois : ${l}`} />
                    <Bar dataKey="direct"  stackId="a" fill={C.esim}    name="direct" />
                    <Bar dataKey="partner" stackId="a" fill={C.partner} name="partner" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
            {view === "count" && (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyStats} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [`${v} ventes`, "Volume"]} labelFormatter={l => `Mois : ${l}`} />
                  <Bar dataKey="count" fill={C.esim} radius={[3,3,0,0]} name="Ventes" />
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-50">
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Total ventes</p>
                <p className="text-xl font-bold text-gray-900 tabular-nums">{fmtNum(totalCount)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">CA total (EUR)</p>
                <p className="text-xl font-bold text-gray-900 tabular-nums">{fmtEur(totalRevEur)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Via partenaires</p>
                <p className="text-xl font-bold tabular-nums" style={{ color: C.partner }}>{fmtPct(totalPartner, totalRevEur)}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Top forfaits + Top destinations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-4">Top 10 forfaits</p>
          {statsLoading ? <Spinner /> : topPackages.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {topPackages.map((p, i) => (
                <div key={p.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-gray-300 w-5 shrink-0 tabular-nums">#{i+1}</span>
                      <span className="text-xs text-gray-700 truncate font-medium">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-xs font-bold text-gray-900 tabular-nums">{p.count}×</span>
                      <span className="text-xs text-gray-400 tabular-nums w-16 text-right">{fmtEur(p.revenue_eur)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(p.count / maxPkg) * 100}%`, background: G, opacity: Math.max(0.3, 1 - i * 0.07) }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-4">Top destinations</p>
          {statsLoading ? <Spinner /> : topDest.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {topDest.map((d, i) => (
                <div key={d.destination}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-gray-300 w-5 shrink-0 tabular-nums">#{i+1}</span>
                      <span className="text-xs text-gray-700 truncate font-medium">{d.destination}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-xs font-bold text-gray-900 tabular-nums">{d.count}×</span>
                      <span className="text-xs text-gray-400 tabular-nums w-16 text-right">{fmtEur(d.revenue_eur)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(d.count / maxDest) * 100}%`, background: "linear-gradient(90deg, #FF4D6D, #FF7F11)", opacity: Math.max(0.3, 1 - i * 0.08) }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const [periodKey, setPeriodKey] = useState("30j");
  const [authChecked, setAuthChecked] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [markingAnset, setMarkingAnset]           = useState<string | null>(null);
  const [ansetRef, setAnsetRef]                   = useState("");
  const [markingCommission, setMarkingCommission] = useState<string | null>(null);
  const [commissionRef, setCommissionRef]         = useState("");

  const period = showCustom && customStart && customEnd
    ? { start: customStart, end: customEnd }
    : getPeriod(periodKey);
  const { kpis, monthly, sources, partners, anset, stock, loading, error, reload } = useDashboard(period);

  useEffect(() => {
    if (!router.isReady) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || session.user?.email !== ADMIN_EMAIL) router.push("/admin/login");
      else setAuthChecked(true);
    });
  }, [router.isReady]);

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = await fetch("/api/admin/stripe-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: text, batch: new Date().toISOString().slice(0, 7) }),
    });
    const data = await res.json();
    alert(`Import terminé :\n✅ ${data.imported} transactions\n🔗 ${data.reconciled} réconciliées\n⚠️ ${data.unreconciled} non réconciliées`);
    reload();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const handleGenerateBordereau = async (period: string) => {
    const res = await fetch("/api/admin/anset-bordereau", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(`Erreur : ${err.error}`);
      return;
    }
    // Téléchargement direct du PDF
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bordereau-anset-${period}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMarkCommissionPaid = async (partnerCode: string) => {
    if (!commissionRef.trim()) { alert("Saisis la référence de virement"); return; }
    setMarkingCommission(partnerCode);
    try {
      const res = await fetch("/api/admin/bordereaux", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_commission_paid", partner_code: partnerCode, period: period.start.slice(0, 7), reference: commissionRef.trim() }),
      });
      const data = await res.json();
      if (data.success) { alert("Commission " + partnerCode + " marquee payee"); setCommissionRef(""); reload(); }
      else alert("Erreur : " + (data.error || "inconnue"));
    } finally { setMarkingCommission(null); }
  };

  const handleGenerateCommissionPdf = async (partnerCode: string) => {
    const res = await fetch("/api/admin/commission-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partner_code: partnerCode, period: period.start.slice(0, 7) }),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); alert("Erreur : " + (err.error || "PDF commission")); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "commission-" + partnerCode + "-" + period.start.slice(0, 7) + ".pdf"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleMarkAnsetPaid = async (period: string) => {
    if (!ansetRef.trim()) { alert("Saisis la référence de virement"); return; }
    setMarkingAnset(period);
    try {
      const res = await fetch("/api/admin/bordereaux", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_anset_paid", period, reference: ansetRef.trim() }),
      });
      const data = await res.json();
      if (data.success) { alert(`✅ Reversement ${period} marqué comme payé`); setAnsetRef(""); reload(); }
      else alert(`Erreur : ${data.error}`);
    } finally {
      setMarkingAnset(null);
    }
  };

  if (!authChecked) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
    </div>
  );

  const TABS = [
    { key: "auj", label: "Auj." },
    { key: "7j",  label: "7j" },
    { key: "30j", label: "30j" },
    { key: "3m",  label: "3 mois" },
    { key: "ytd", label: "YTD" },
  ];
  const PIE_COLORS = [C.esim, C.insurance, C.routers, C.partner, "#9CA3AF"];

  return (
    <>
      <Head>
        <title>Dashboard — FENUA SIM</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: G }}>
                <TrendingUp size={19} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">
                  <span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FENUA</span>
                  <span className="text-gray-300 mx-1">·</span>
                  <span className="text-gray-700">Pilotage</span>
                </h1>
                <p className="text-xs text-gray-400">Tableau de bord interne</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                {TABS.map(t => (
                  <button key={t.key} onClick={() => setPeriodKey(t.key)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${periodKey === t.key ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                    style={periodKey === t.key ? { background: G } : {}}>
                    {t.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setShowCustom(!showCustom); if (showCustom) setPeriodKey("30j"); }}
                className={`flex items-center gap-1.5 text-xs px-3 py-2 border rounded-xl shadow-sm transition-colors ${showCustom ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-white border-gray-200 text-gray-500 hover:text-gray-800"}`}>
                <Calendar size={12} /> Dates
              </button>
              <button onClick={reload}
                className="flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-500 hover:text-gray-800 shadow-sm">
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Actualiser
              </button>
              <a href="/admin/assurance"
                className="flex items-center gap-1 text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-500 hover:text-gray-800 shadow-sm">
                Assurance <ChevronRight size={12} />
              </a>
              <a href="/admin/routeurs"
                className="flex items-center gap-1 text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-500 hover:text-gray-800 shadow-sm">
                Routeurs <ChevronRight size={12} />
              </a>
              <button onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-400 hover:text-red-500 shadow-sm">
                <LogOut size={12} /> Déconnexion
              </button>
            </div>
          </div>

          {/* Filtre dates personnalisées */}
          {showCustom && (
            <div className="flex items-center gap-3 bg-white border border-purple-100 rounded-xl px-4 py-3 mb-4 flex-wrap shadow-sm">
              <Calendar size={14} className="text-purple-500 shrink-0" />
              <span className="text-xs text-gray-500 shrink-0">Période personnalisée :</span>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">Du</span>
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                    className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg text-gray-700 bg-white" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">au</span>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                    className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg text-gray-700 bg-white" />
                </div>
                {customStart && customEnd && (
                  <span className="text-xs text-purple-600 font-medium">
                    {Math.round((new Date(customEnd).getTime() - new Date(customStart).getTime()) / 86400000) + 1} jours
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Alerte ANSET */}
          {kpis && kpis.insurance.pending_count > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 flex-wrap">
              <AlertTriangle size={16} className="text-amber-500 shrink-0" />
              <p className="text-sm text-amber-800">
                <strong>{kpis.insurance.pending_count} reversement{kpis.insurance.pending_count > 1 ? "s" : ""} ANSET en attente</strong>
                {" — "}{fmtEur(kpis.insurance.pending_transfer)} à reverser
              </p>
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-700">⚠️ {error}</div>}

          {/* KPIs globaux */}
          <Section title="CA réel & marges" icon={TrendingUp} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="CA total réel" value={loading ? "…" : fmtEur(kpis?.totals.revenue ?? 0)} sub="eSIM + assurance + location" />
            <KpiCard label="Marge nette"   value={loading ? "…" : fmtEur(kpis?.totals.margin ?? 0)}
              sub={kpis ? fmtPct(kpis.totals.margin, kpis.totals.revenue) + " du CA" : ""} />
            <KpiCard label="Frais Stripe"  value={loading ? "…" : fmtEur(kpis?.totals.stripe_fees ?? 0)}
              badge={kpis?.totals.stripe_fees === 0 ? "Import CSV requis" : undefined} />
            <KpiCard label="Commandes"     value={loading ? "…" : fmtNum((kpis?.esim.count ?? 0) + (kpis?.insurance.count ?? 0) + (kpis?.routers.count ?? 0))}
              sub="toutes catégories" />
          </div>

          {/* KPIs eSIM */}
          <Section title="eSIM" icon={Wifi} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="CA eSIM"       value={loading ? "…" : fmtEur(kpis?.esim.revenue ?? 0)}    sub={`${kpis?.esim.count ?? 0} commandes`} />
            <KpiCard label="Marge nette"   value={loading ? "…" : fmtEur(kpis?.esim.margin_net ?? 0)} sub="Après Airalo + Stripe" />
            <KpiCard label="Commissions"   value={loading ? "…" : fmtEur(kpis?.esim.commissions ?? 0)}
              badge={partners.length > 0 ? "À valider" : undefined} warn />
            <KpiCard label="Panier moyen"  value={loading ? "…" : fmtEur(kpis?.esim.avg_basket ?? 0)} />
          </div>

          {/* KPIs Assurance */}
          <Section title="Assurance" icon={Shield} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="CA réel assurance"  value={loading ? "…" : fmtEur(kpis?.insurance.revenue ?? 0)}  sub="Frais distrib. + commission 10%" />
            <KpiCard label="Primes encaissées"  value={loading ? "…" : fmtEur(kpis?.insurance.premiums ?? 0)} badge="Hors CA" sub="Pour compte ANSET" />
            <KpiCard label="À reverser ANSET"   value={loading ? "…" : fmtEur(kpis?.insurance.pending_transfer ?? 0)}
              badge={kpis && kpis.insurance.pending_count > 0 ? "En attente" : "À jour"}
              warn={kpis ? kpis.insurance.pending_count > 0 : false} />
            <KpiCard label="Contrats"           value={loading ? "…" : fmtNum(kpis?.insurance.count ?? 0)} />
          </div>

          {/* KPIs Routeurs */}
          <Section title="Routeurs" icon={Package} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="CA location"       value={loading ? "…" : fmtEur(kpis?.routers.revenue ?? 0)}  sub={`${kpis?.routers.count ?? 0} locations`} />
            <KpiCard label="Cautions détenues" value={loading ? "…" : fmtEur(kpis?.routers.deposits ?? 0)} badge="Hors CA" sub="Remboursable" />
            <KpiCard label="Stock disponible"  value={loading ? "…" : `${kpis?.routers.available ?? 0} / ${kpis?.routers.total ?? 0}`}
              badge={kpis?.routers.available === 0 && kpis?.routers.total > 0 ? "Complet" : undefined} warn={kpis?.routers.available === 0 && (kpis?.routers.total ?? 0) > 0} />
            <KpiCard label="En location"       value={loading ? "…" : fmtNum(kpis?.routers.rented ?? 0)} />
          </div>

          {/* ── Ligne cumul total ── */}
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Cumul toutes activités</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-50">
              <div className="px-5 py-4">
                <p className="text-xs text-gray-400 mb-1">CA réel total</p>
                <p className="text-xl font-bold text-gray-900 tabular-nums">
                  {loading ? "…" : fmtEur((kpis?.totals.revenue ?? 0))}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {loading || !kpis ? "" : `${fmtNum(kpis.esim.count + kpis.insurance.count + kpis.routers.count)} commandes`}
                </p>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs text-gray-400 mb-1">Marge brute</p>
                <p className="text-xl font-bold tabular-nums" style={{ color: "#059669" }}>
                  {loading ? "…" : fmtEur(kpis?.esim.margin_net ?? 0 + (kpis?.insurance.revenue ?? 0) + (kpis?.routers.revenue ?? 0))}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {loading || !kpis ? "" : fmtPct(kpis.esim.margin_net + kpis.insurance.revenue + kpis.routers.revenue, kpis.totals.revenue)}
                </p>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs text-gray-400 mb-1">Frais Stripe</p>
                <p className="text-xl font-bold text-red-400 tabular-nums">
                  {loading ? "…" : `- ${fmtEur(kpis?.totals.stripe_fees ?? 0)}`}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {loading || !kpis ? "" : fmtPct(kpis.totals.stripe_fees, kpis.totals.revenue)}
                </p>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs text-gray-400 mb-1">Marge nette</p>
                <p className="text-xl font-bold tabular-nums" style={{ color: "#A020F0" }}>
                  {loading ? "…" : fmtEur(kpis?.totals.margin ?? 0)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {loading || !kpis ? "" : fmtPct(kpis.totals.margin, kpis.totals.revenue)}
                </p>
              </div>
            </div>
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-4">CA mensuel par produit</p>
              {loading ? <Spinner /> : monthly.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-gray-400">Aucune donnée</div>
              ) : (
                <>
                  <div className="flex gap-4 mb-3 text-xs text-gray-400 flex-wrap">
                    {([["eSIM", C.esim], ["Assurance", C.insurance], ["Routeurs", C.routers]] as [string, string][]).map(([l, c]) => (
                      <span key={l} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: c }} />{l}
                      </span>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthly} barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} tickFormatter={v => `${v} €`} />
                      <Tooltip formatter={(v: number) => fmtEur(v)} />
                      <Bar dataKey="esim"      stackId="a" fill={C.esim} />
                      <Bar dataKey="insurance" stackId="a" fill={C.insurance} />
                      <Bar dataKey="routers"   stackId="a" fill={C.routers} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-4">CA par source (eSIM)</p>
              {loading ? <Spinner /> : sources.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-gray-400 text-center px-4">
                  Aucune donnée<br />
                  <span className="text-xs mt-1 block">Renseigne la colonne <code className="bg-gray-100 px-1 rounded">source</code> sur les commandes</span>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {sources.map((s, i) => (
                      <span key={s.source} className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        {s.source} — {fmtEur(s.revenue)}
                      </span>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={sources} dataKey="revenue" nameKey="source" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {sources.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmtEur(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          </div>

          {/* Tableaux */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-4">Reversements ANSET</p>
              {loading ? <Spinner /> : (
                <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 border-b border-gray-100">
                        <th className="text-left pb-2 font-normal">Période</th>
                        <th className="text-right pb-2 font-normal">Contrats</th>
                        <th className="text-right pb-2 font-normal">À reverser</th>
                        <th className="text-right pb-2 font-normal">Statut</th>
                        <th className="text-right pb-2 font-normal"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {anset.length === 0 ? (
                        <tr><td colSpan={5} className="py-6 text-center text-xs text-gray-400">Aucun bordereau généré</td></tr>
                      ) : anset.map(s => (
                        <tr key={s.period} className="border-b border-gray-50 last:border-0">
                          <td className="py-2.5 font-medium text-gray-700">{s.period}</td>
                          <td className="py-2.5 text-right text-gray-500">{s.total_contracts}</td>
                          <td className="py-2.5 text-right font-semibold text-gray-800 tabular-nums">{fmtEur(s.total_to_transfer)}</td>
                          <td className="py-2.5 text-right">
                            {s.status === "paid"
                              ? <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle size={11} />Reversé</span>
                              : <span className="inline-flex items-center gap-1 text-xs text-amber-600"><Clock size={11} />En attente</span>}
                          </td>
                          <td className="py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleGenerateBordereau(s.period)}
                                className="text-xs px-2 py-1 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors">
                                PDF
                              </button>
                              {s.status !== "paid" && (
                                <button
                                  onClick={() => setMarkingAnset(markingAnset === s.period ? null : s.period)}
                                  className="text-xs px-2 py-1 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 transition-colors">
                                  Marquer payé
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Formulaire confirmation paiement ANSET */}
                  {markingAnset && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        Confirmer le reversement <strong>{markingAnset}</strong>
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="text"
                          placeholder="Référence virement (ex: VIR-20260301)"
                          value={ansetRef}
                          onChange={e => setAnsetRef(e.target.value)}
                          className="flex-1 min-w-0 text-xs px-3 py-2 border border-gray-200 rounded-xl text-gray-700 bg-white"
                        />
                        <button
                          onClick={() => handleMarkAnsetPaid(markingAnset)}
                          disabled={!!markingAnset && markingAnset !== null && !ansetRef.trim()}
                          className="text-xs px-4 py-2 rounded-xl text-white font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
                          style={{ background: G }}>
                          {markingAnset ? "Confirmer ✓" : "…"}
                        </button>
                        <button
                          onClick={() => { setMarkingAnset(null); setAnsetRef(""); }}
                          className="text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-700">
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-4">Commissions partenaires</p>
              {loading ? <Spinner /> : (
                <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 border-b border-gray-100">
                        <th className="text-left pb-2 font-normal">Partenaire</th>
                        <th className="text-right pb-2 font-normal">CA</th>
                        <th className="text-right pb-2 font-normal">Commission</th>
                        <th className="text-right pb-2 font-normal">Cmdes</th>
                        <th className="text-right pb-2 font-normal"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {partners.length === 0 ? (
                        <tr><td colSpan={5} className="py-6 text-center text-xs text-gray-400">Aucun partenaire actif sur la période</td></tr>
                      ) : partners.map(p => (
                        <tr key={p.partner_code} className="border-b border-gray-50 last:border-0">
                          <td className="py-2.5 font-medium text-gray-700">{p.partner_name}</td>
                          <td className="py-2.5 text-right text-gray-600 tabular-nums">{fmtEur(p.total_sales)}</td>
                          <td className="py-2.5 text-right font-semibold tabular-nums" style={{ color: C.esim }}>{fmtEur(p.total_commission)}</td>
                          <td className="py-2.5 text-right text-gray-400">{p.orders_count}</td>
                          <td className="py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleGenerateCommissionPdf(p.partner_code, p.partner_name)}
                                className="text-xs px-2 py-1 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors">
                                PDF
                              </button>
                              <button
                                onClick={() => setMarkingCommission(markingCommission === p.partner_code ? null : p.partner_code)}
                                className="text-xs px-2 py-1 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 transition-colors">
                                Marquer payé
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {markingCommission && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        Confirmer le paiement commission <strong>{partners.find(p => p.partner_code === markingCommission)?.partner_name}</strong>
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="text"
                          placeholder="Référence virement (ex: VIR-20260301)"
                          value={commissionRef}
                          onChange={e => setCommissionRef(e.target.value)}
                          className="flex-1 min-w-0 text-xs px-3 py-2 border border-gray-200 rounded-xl text-gray-700 bg-white"
                        />
                        <button
                          onClick={() => handleMarkCommissionPaid(markingCommission)}
                          disabled={!commissionRef.trim()}
                          className="text-xs px-4 py-2 rounded-xl text-white font-medium disabled:opacity-50 hover:opacity-90"
                          style={{ background: G }}>
                          Confirmer ✓
                        </button>
                        <button
                          onClick={() => { setMarkingCommission(null); setCommissionRef(""); }}
                          className="text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-700">
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Stock routeurs */}
          <Section title="Stock routeurs" icon={Package} />
          {loading ? <Spinner /> : stock.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun routeur enregistré — ajoute des lignes dans la table <code className="bg-gray-100 px-1 rounded text-xs">routers</code></p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {stock.map(r => (
                <div key={r.id} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                  <p className="text-xs font-semibold text-gray-800 truncate">{r.model}</p>
                  <p className={`text-xs mt-1 font-medium ${r.status === "available" ? "text-green-600" : r.status === "rented" ? "text-purple-600" : "text-orange-500"}`}>
                    {r.status === "available" ? "✓ Disponible" : r.status === "rented" ? "● En location" : "⚙ Maintenance"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{r.serial_number}</p>
                  {r.current_rental_end && (
                    <p className="text-xs text-gray-400 mt-0.5">Retour : {new Date(r.current_rental_end).toLocaleDateString("fr-FR")}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Stats historiques */}
          <Section title="Statistiques — depuis le lancement" icon={TrendingUp} />
          <StatsSection />


          {/* Import coûts Airalo */}
          <Section title="Coûts d'achat Airalo" icon={Package} />
          <CostsImportSection onDone={reload} />

          {/* Import CSV Stripe */}
          <Section title="Import CSV Stripe" icon={Upload} />
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">Réconciliation mensuelle</p>
                <p className="text-xs text-gray-400 mt-1">Télécharge ton CSV depuis <strong>Stripe → Rapports → Paiements</strong> puis importe-le ici</p>
                <p className="text-xs text-gray-400 mt-0.5">Met à jour les frais Stripe réels et les marges nettes sur toutes les commandes</p>
              </div>
              <label className="cursor-pointer shrink-0">
                <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
                <span className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl text-white font-medium shadow-sm hover:opacity-90 transition-opacity"
                  style={{ background: G }}>
                  <Upload size={14} /> Importer CSV
                </span>
              </label>
            </div>
          </div>

          <p className="text-xs text-gray-300 text-center mt-10 mb-4">FENUASIM · Dashboard interne · {new Date().getFullYear()}</p>
        </div>
      </div>
    </>
  );
}

// ── Pas de Layout site public sur cette page ──────────────────
AdminDashboard.getLayout = (page: ReactElement) => page;
