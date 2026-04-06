// ============================================================
// FENUA SIM – Dashboard de pilotage v3
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
  RefreshCw, Upload, ChevronRight, CheckCircle, Clock,
  LogOut, Calendar, Users, FileText, BarChart2, Award,
} from "lucide-react";

const ADMIN_EMAILS = ["admin@fenuasim.com", "hello@fenuasim.com", "tomleb987@gmail.com"];
const isAdmin = (email?: string | null) =>
  !!email && (ADMIN_EMAILS.includes(email) || email.endsWith("@fenuasim.com"));

const G   = "linear-gradient(135deg, #A020F0 0%, #FF4D6D 50%, #FF7F11 100%)";
const EUR_TO_XPF = 119.33;
const C   = { esim: "#A020F0", insurance: "#FF4D6D", routers: "#FF7F11", partner: "#0EA896" };
const PIE_COLORS = [C.esim, C.insurance, C.routers, C.partner, "#9CA3AF", "#60A5FA"];

const fmtEur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n || 0);
const fmtNum = (n: number) => new Intl.NumberFormat("fr-FR").format(n || 0);
const fmtPct = (n: number, total: number) =>
  total === 0 ? "0 %" : `${((n / total) * 100).toFixed(1)} %`;

function getOrderAmount(o: any): number {
  const amt = Number(o.amount ?? o.price ?? 0);
  const c   = (o.currency || "EUR").toUpperCase();
  if (c === "XPF" || c === "CFP") return amt / EUR_TO_XPF;
  if (c === "USD") return (amt / 100) * 0.92;
  return amt / 100;
}

function toEur(price: number, currency: string): number {
  return getOrderAmount({ amount: price, currency });
}

function getPeriod(key: string) {
  const TZ_OFFSET_HOURS = -10;
  const nowUtc = new Date();
  const nowLocal = new Date(nowUtc.getTime() + TZ_OFFSET_HOURS * 60 * 60 * 1000);
  const p   = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date)  => `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
  const today = fmt(nowLocal);
  switch (key) {
    case "auj": return { start: today, end: today };
    case "7j":  { const s = new Date(nowLocal); s.setUTCDate(s.getUTCDate() - 7);   return { start: fmt(s), end: today }; }
    case "3m":  { const s = new Date(nowLocal); s.setUTCMonth(s.getUTCMonth() - 3); return { start: fmt(s), end: today }; }
    case "ytd": return { start: `${nowLocal.getUTCFullYear()}-01-01`, end: today };
    default:    { const s = new Date(nowLocal); s.setUTCDate(s.getUTCDate() - 30);  return { start: fmt(s), end: today }; }
  }
}

interface KPIs {
  esim:      { count: number; revenue: number; margin_net: number; commissions: number; avg_basket: number };
  insurance: { count: number; revenue: number; premiums: number; pending_transfer: number; pending_count: number };
  routers:   { count: number; revenue: number; deposits: number; available: number; rented: number; total: number };
  totals:    { revenue: number; margin: number; stripe_fees: number };
}
interface MonthlyPoint { month: string; esim: number; insurance: number; routers: number }
interface PartnerRow   { partner_code: string; partner_name: string; total_sales: number; total_commission: number; orders_count: number }
interface ANSETRow     { period: string; total_contracts: number; total_to_transfer: number; status: string }
interface MonthStat    { month: string; label: string; count: number; revenue_eur: number; direct: number; partner: number }
interface PackageStat  { name: string; count: number; revenue_eur: number }
interface DestStat     { destination: string; count: number; revenue_eur: number }

function useDashboard(period: { start: string; end: string }) {
  const [kpis,     setKpis]     = useState<KPIs | null>(null);
  const [monthly,  setMonthly]  = useState<MonthlyPoint[]>([]);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [anset,    setAnset]    = useState<ANSETRow[]>([]);
  const [stock,    setStock]    = useState<any[]>([]);
  const [expiringEsims, setExpiringEsims] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const soon = new Date();
      soon.setDate(soon.getDate() + 3);

      const [ordersRes, insRes, rentRes, stockRes, pendingInsRes, activeRentsRes, ansetRes, partnerRes, expiringRes] =
        await Promise.all([
          supabase.from("orders")
            .select("amount, price, currency, margin_net, cost_airalo, stripe_fee, commission_amount, source, partner_code, promo_code, created_at")
            .gte("created_at", `${period.start}T10:00:00Z`)
            .lte("created_at", `${new Date(new Date(period.end + "T10:00:00Z").getTime() + 86400000 - 1000).toISOString()}`)
            .in("status", ["completed", "paid"]),
          supabase.from("insurances")
            .select("frais_distribution, premium_ava, amount_to_transfer, transfer_status, stripe_fee, created_at")
            .gte("created_at", `${period.start}T10:00:00Z`)
            .lte("created_at", `${new Date(new Date(period.end + "T10:00:00Z").getTime() + 86400000 - 1000).toISOString()}`)
            .in("status", ["paid", "validated"]),
          supabase.from("router_rentals")
            .select("rental_amount, deposit_amount, deposit_status, stripe_fee, created_at, rental_end, status")
            .gte("created_at", `${period.start}T10:00:00Z`)
            .lte("created_at", `${new Date(new Date(period.end + "T10:00:00Z").getTime() + 86400000 - 1000).toISOString()}`),
          supabase.from("v_router_stock").select("*"),
          supabase.from("insurances")
            .select("id, created_at, premium_ava, frais_distribution, amount_to_transfer, transfer_status")
            .in("status", ["paid", "validated"])
            .eq("transfer_status", "pending"),
          supabase.from("router_rentals")
            .select("id")
            .eq("status", "active")
            .gte("rental_end", new Date().toISOString().slice(0, 10)),
          supabase.from("insurer_settlements")
            .select("period, total_contracts, total_to_transfer, status")
            .order("period", { ascending: false }).limit(12),
          supabase.from("v_partner_commissions_detail").select("*")
            .gte("period_month", `${period.start.slice(0, 7)}-01`)
            .lte("period_month", `${period.end.slice(0, 7)}-28`),
          supabase.from("airalo_orders")
            .select("email, sim_iccid, expires_at, status, nom, prenom")
            .not("expires_at", "is", null)
            .lte("expires_at", soon.toISOString())
            .gte("expires_at", new Date().toISOString())
            .not("status", "in", '("cancelled","expired")')
            .limit(20),
        ]);

      const orders      = ordersRes.data   ?? [];
      const insurances  = insRes.data      ?? [];
      const rentals     = rentRes.data     ?? [];
      const stockData   = stockRes.data    ?? [];
      const pendingIns  = pendingInsRes.data  ?? [];
      const activeRents = activeRentsRes.data ?? [];

      const esimRev = orders.reduce((s, o) => s + getOrderAmount(o), 0);
      const esimFee = orders.reduce((s, o) => {
        if (o.source === "virement") return s;
        if (o.stripe_fee && Number(o.stripe_fee) > 0) return s + Number(o.stripe_fee);
        const p = getOrderAmount(o);
        return s + Math.round((p * 0.029 + 0.30) * 100) / 100;
      }, 0);
      const esimMgn = orders.reduce((s, o) => {
        if (o.margin_net != null && Number(o.margin_net) !== 0) return s + Number(o.margin_net);
        if (o.cost_airalo != null && Number(o.cost_airalo) > 0) {
          const p   = getOrderAmount(o);
          const fee = o.stripe_fee && Number(o.stripe_fee) > 0 ? Number(o.stripe_fee) : Math.round((p * 0.029 + 0.30) * 100) / 100;
          return s + (p - Number(o.cost_airalo) - fee);
        }
        return s;
      }, 0);
      const esimCom = orders.reduce((s, o) => s + Number(o.commission_amount ?? 0), 0);

      const insRev  = insurances.reduce((s, i) => s + Number(i.frais_distribution ?? 0) + Number(i.premium_ava ?? 0) * 0.10, 0);
      const insPrem = insurances.reduce((s, i) => s + Number(i.premium_ava ?? 0), 0);
      const insFee  = insurances.reduce((s, i) => {
        if (i.stripe_fee && Number(i.stripe_fee) > 0) return s + Number(i.stripe_fee);
        const base = Number(i.frais_distribution ?? 0) + Number(i.premium_ava ?? 0);
        return s + Math.round((base * 0.029 + 0.30) * 100) / 100;
      }, 0);
      const pendingAmount = pendingIns.reduce((s: number, i: any) =>
        s + Number(i.amount_to_transfer ?? Number(i.premium_ava ?? 0) * 0.90), 0);

      const rentToEur = (r: any) => { const a = Number(r.rental_amount ?? 0); return a >= 200 ? a / EUR_TO_XPF : a; };
      const rentRev = rentals.reduce((s, r) => s + rentToEur(r), 0);
      const rentDep = rentals.filter(r => r.deposit_status === "held").reduce((s, r) => {
        const d = Number(r.deposit_amount ?? 0); return s + (d >= 200 ? d / EUR_TO_XPF : d);
      }, 0);
      const rentFee = rentals.reduce((s, r) => s + Number(r.stripe_fee ?? 0), 0);

      const totalRev  = esimRev + insRev + rentRev;
      const totalFees = esimFee + insFee + rentFee;
      const totalMgn  = esimMgn + insRev + rentRev - totalFees;

      setKpis({
        esim:      { count: orders.length, revenue: esimRev, margin_net: esimMgn, commissions: esimCom, avg_basket: orders.length ? esimRev / orders.length : 0 },
        insurance: { count: insurances.length, revenue: insRev, premiums: insPrem, pending_transfer: pendingAmount, pending_count: pendingIns.length },
        routers:   { count: rentals.length, revenue: rentRev, deposits: rentDep, available: stockData.filter((r: any) => r.status === "available").length, rented: activeRents.length, total: stockData.length },
        totals:    { revenue: totalRev, margin: totalMgn, stripe_fees: totalFees },
      });

      const mMap: Record<string, MonthlyPoint> = {};
      const addM = (date: string | null, type: "esim" | "insurance" | "routers", v: number) => {
        if (!date) return;
        const m = date.slice(0, 7);
        if (!mMap[m]) mMap[m] = { month: m, esim: 0, insurance: 0, routers: 0 };
        mMap[m][type] += v;
      };
      orders.forEach(o     => addM(o.created_at, "esim",      getOrderAmount(o)));
      insurances.forEach(i => addM(i.created_at, "insurance", Number(i.frais_distribution ?? 0) + Number(i.premium_ava ?? 0) * 0.10));
      rentals.forEach(r    => addM(r.created_at, "routers",   rentToEur(r)));
      setMonthly(Object.values(mMap).sort((a, b) => a.month.localeCompare(b.month)));

      const pMap: Record<string, PartnerRow> = {};
      (partnerRes.data ?? []).forEach((p: any) => {
        if (!pMap[p.partner_code]) pMap[p.partner_code] = { partner_code: p.partner_code, partner_name: p.partner_name ?? p.partner_code, total_sales: 0, total_commission: 0, orders_count: 0 };
        pMap[p.partner_code].total_sales      += p.total_sales ?? 0;
        pMap[p.partner_code].total_commission += p.total_commission ?? p.total_commission_calculated ?? 0;
        pMap[p.partner_code].orders_count     += p.orders_count ?? 0;
      });
      setPartners(Object.values(pMap).sort((a, b) => b.total_sales - a.total_sales));

      const settlementMap: Record<string, any> = {};
      (ansetRes.data ?? []).forEach((s: any) => { settlementMap[s.period] = { ...s }; });
      const pendingByMonth: Record<string, any> = {};
      pendingIns.forEach((i: any) => {
        if (!i.created_at) return;
        const m = i.created_at.slice(0, 7);
        if (!pendingByMonth[m]) pendingByMonth[m] = { period: m, total_contracts: 0, total_to_transfer: 0, status: "pending" };
        pendingByMonth[m].total_contracts  += 1;
        pendingByMonth[m].total_to_transfer += Number(i.amount_to_transfer ?? Number(i.premium_ava ?? 0) * 0.90);
      });
      Object.values(pendingByMonth).forEach((p: any) => {
        if (!settlementMap[p.period]) settlementMap[p.period] = p;
        else if (settlementMap[p.period].status === "pending") {
          settlementMap[p.period].total_contracts   = p.total_contracts;
          settlementMap[p.period].total_to_transfer = p.total_to_transfer;
        }
      });
      setAnset(Object.values(settlementMap).sort((a: any, b: any) => b.period.localeCompare(a.period)));
      setStock(stockData);
      setExpiringEsims(expiringRes.data ?? []);
    } catch (err: any) {
      setError(err.message ?? "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [period.start, period.end]);

  useEffect(() => { load(); }, [load]);
  return { kpis, monthly, partners, anset, stock, expiringEsims, loading, error, reload: load };
}

function useStats() {
  const [monthlyStats, setMonthly] = useState<MonthStat[]>([]);
  const [topPkgs,      setTopPkgs] = useState<PackageStat[]>([]);
  const [topDest,      setTopDest] = useState<DestStat[]>([]);
  const [loading,      setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data: orders } = await supabase
          .from("orders")
          .select("amount, price, currency, package_name, package_id, partner_code, created_at")
          .gte("created_at", "2025-04-01T00:00:00")
          .in("status", ["completed", "paid"])
          .order("created_at", { ascending: true });

        const MONTH_FR = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"];
        const mMap: Record<string, MonthStat>    = {};
        const pMap: Record<string, PackageStat> = {};
        (orders ?? []).forEach(o => {
          const eur = getOrderAmount(o);
          const m   = (o.created_at as string).slice(0, 7);
          const [y, mo] = m.split("-").map(Number);
          if (!mMap[m]) mMap[m] = { month: m, label: `${MONTH_FR[mo-1]} ${String(y).slice(2)}`, count: 0, revenue_eur: 0, direct: 0, partner: 0 };
          mMap[m].count += 1; mMap[m].revenue_eur += eur;
          if (o.partner_code) mMap[m].partner += eur; else mMap[m].direct += eur;
          const name = o.package_name ?? "Inconnu";
          if (!pMap[name]) pMap[name] = { name, count: 0, revenue_eur: 0 };
          pMap[name].count += 1; pMap[name].revenue_eur += eur;
        });
        setMonthly(Object.values(mMap).sort((a, b) => a.month.localeCompare(b.month)));
        setTopPkgs(Object.values(pMap).sort((a, b) => b.count - a.count).slice(0, 10));

        const pkgIds = [...new Set((orders ?? []).map(o => o.package_id).filter(Boolean))] as string[];
        const { data: pkgs } = await supabase.from("airalo_packages").select("airalo_id, region_fr, region").in("airalo_id", pkgIds.slice(0, 200));
        const destMap: Record<string, string> = {};
        (pkgs ?? []).forEach((p: any) => { destMap[p.airalo_id] = p.region_fr || p.region || "Autre"; });
        const dMap: Record<string, DestStat> = {};
        (orders ?? []).forEach(o => {
          const dest = destMap[o.package_id ?? ""] ?? "Autre";
          const eur  = toEur(Number(o.price ?? 0), o.currency ?? "EUR");
          if (!dMap[dest]) dMap[dest] = { destination: dest, count: 0, revenue_eur: 0 };
          dMap[dest].count += 1; dMap[dest].revenue_eur += eur;
        });
        setTopDest(Object.values(dMap).sort((a, b) => b.count - a.count).slice(0, 8));
      } finally { setLoading(false); }
    }
    load();
  }, []);

  return { monthlyStats, topPkgs, topDest, loading };
}

function Spinner() {
  return <div className="flex justify-center py-8"><div className="w-7 h-7 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>;
}

function KpiCard({ label, value, sub, badge, warn, accent }: { label: string; value: string; sub?: string; badge?: string; warn?: boolean; accent?: string }) {
  return (
    <div className={`bg-white rounded-2xl p-4 border shadow-sm ${warn ? "border-amber-200 bg-amber-50/30" : "border-gray-100"}`}>
      <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-xl font-bold tabular-nums" style={{ color: accent || "#111827" }}>{value}</p>
      {sub   && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {badge && <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-2 font-medium ${warn ? "bg-amber-100 text-amber-700" : "bg-purple-50 text-purple-700"}`}>{badge}</span>}
    </div>
  );
}

function CostsImportSection({ onDone }: { onDone: () => void }) {
  const [usdRate, setUsdRate] = useState("0.92");
  const [result, setResult]   = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setLoading(true); setResult(null);
    const text = await file.text();
    const res  = await fetch("/api/admin/import-costs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: text, usd_rate: parseFloat(usdRate) }),
    });
    const data = await res.json();
    setResult(data); setLoading(false);
    if (data.updated > 0) onDone();
    e.target.value = "";
  };

  return (
    <div className="flex items-start justify-between flex-wrap gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-700">Import prix de revient Airalo</p>
        <p className="text-xs text-gray-400 mt-1">CSV avec colonnes <code className="bg-gray-100 px-1 rounded">package_id</code> et <code className="bg-gray-100 px-1 rounded">cost_eur</code></p>
        <div className="flex items-center gap-2 mt-3">
          <label className="text-xs text-gray-500">Taux USD → EUR</label>
          <input type="number" step="0.001" value={usdRate} onChange={e => setUsdRate(e.target.value)}
            className="w-20 text-xs px-2 py-1.5 border border-gray-200 rounded-lg text-gray-700" />
        </div>
        {result && (
          <div className={`mt-3 text-xs rounded-xl px-3 py-2 ${result.updated > 0 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
            ✅ {result.updated} packages mis à jour {result.notFound > 0 && `· ⚠️ ${result.notFound} non trouvés`}
          </div>
        )}
      </div>
      <label className="cursor-pointer shrink-0">
        <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={loading} />
        <span className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl text-white font-medium shadow-sm ${loading ? "opacity-80" : "hover:opacity-90"}`} style={{ background: G }}>
          {loading ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /><span>Import…</span></> : <><Upload size={14} /><span>Importer CSV</span></>}
        </span>
      </label>
    </div>
  );
}

// ── VUE GLOBALE ────────────────────────────────────────────────
function VueGlobale({ kpis, monthly, loading, expiringEsims }: { kpis: KPIs | null; monthly: MonthlyPoint[]; loading: boolean; expiringEsims: any[] }) {
  const { monthlyStats, topPkgs, topDest, loading: statsLoading } = useStats();
  const [view, setView] = useState<"revenue" | "count">("revenue");
  const totalCount   = monthlyStats.reduce((s, m) => s + m.count, 0);
  const totalRevEur  = monthlyStats.reduce((s, m) => s + m.revenue_eur, 0);
  const totalPartner = monthlyStats.reduce((s, m) => s + m.partner, 0);

  return (
    <div className="space-y-6">
      {/* Alertes */}
      {expiringEsims.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-orange-500" />
            <p className="text-sm font-semibold text-orange-800">{expiringEsims.length} eSIM expirent dans moins de 3 jours</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {expiringEsims.map((e, i) => (
              <div key={i} className="bg-white rounded-xl px-3 py-2 border border-orange-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-800">{e.prenom} {e.nom}</p>
                  <p className="text-xs text-gray-400">{e.email}</p>
                </div>
                <p className="text-xs font-bold text-orange-600 shrink-0 ml-2">
                  {new Date(e.expires_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs globaux */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">CA & Marges</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="col-span-2 lg:col-span-1 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm" style={{ background: "linear-gradient(135deg,#faf5ff,#fff7ed)" }}>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">CA Total</p>
            <p className="text-3xl font-bold tabular-nums text-gray-900">{loading ? "…" : fmtEur(kpis?.totals.revenue ?? 0)}</p>
            <p className="text-xs text-gray-400 mt-1">{loading ? "" : `${fmtNum((kpis?.esim.count ?? 0) + (kpis?.insurance.count ?? 0) + (kpis?.routers.count ?? 0))} commandes`}</p>
          </div>
          <KpiCard label="Marge nette" value={loading ? "…" : fmtEur(kpis?.totals.margin ?? 0)} sub={kpis ? fmtPct(kpis.totals.margin, kpis.totals.revenue) + " du CA" : ""} accent="#A020F0" />
          <KpiCard label="Frais Stripe" value={loading ? "…" : `- ${fmtEur(kpis?.totals.stripe_fees ?? 0)}`} sub={kpis ? fmtPct(kpis.totals.stripe_fees, kpis.totals.revenue) : ""} accent="#F87171" />
          <KpiCard label="Panier moyen eSIM" value={loading ? "…" : fmtEur(kpis?.esim.avg_basket ?? 0)} sub={`${kpis?.esim.count ?? 0} commandes`} />
        </div>
      </div>

      {/* KPIs par produit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* eSIM */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.esim }}><Wifi size={13} className="text-white" /></div>
            <p className="text-sm font-bold text-gray-700">eSIM</p>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-xs text-gray-400">CA</span>
              <span className="text-sm font-bold tabular-nums text-gray-900">{loading ? "…" : fmtEur(kpis?.esim.revenue ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-xs text-gray-400">Marge nette</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: C.esim }}>{loading ? "…" : fmtEur(kpis?.esim.margin_net ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-xs text-gray-400">Commissions</span>
              <span className="text-sm font-bold tabular-nums text-amber-600">{loading ? "…" : fmtEur(kpis?.esim.commissions ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-xs text-gray-400">Commandes</span>
              <span className="text-sm font-bold text-gray-900">{loading ? "…" : kpis?.esim.count ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Assurance */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.insurance }}><Shield size={13} className="text-white" /></div>
            <p className="text-sm font-bold text-gray-700">Assurance</p>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-xs text-gray-400">CA réel (frais distrib.)</span>
              <span className="text-sm font-bold tabular-nums text-gray-900">{loading ? "…" : fmtEur(kpis?.insurance.revenue ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-xs text-gray-400">Primes AVA (hors CA)</span>
              <span className="text-sm font-bold tabular-nums text-gray-500">{loading ? "…" : fmtEur(kpis?.insurance.premiums ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-xs text-gray-400">À reverser ANSET</span>
              <span className={`text-sm font-bold tabular-nums ${(kpis?.insurance.pending_count ?? 0) > 0 ? "text-amber-600" : "text-green-600"}`}>
                {loading ? "…" : fmtEur(kpis?.insurance.pending_transfer ?? 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-xs text-gray-400">Contrats</span>
              <span className="text-sm font-bold text-gray-900">{loading ? "…" : kpis?.insurance.count ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Routeurs */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.routers }}><Package size={13} className="text-white" /></div>
            <p className="text-sm font-bold text-gray-700">Routeurs</p>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-xs text-gray-400">CA location</span>
              <span className="text-sm font-bold tabular-nums text-gray-900">{loading ? "…" : fmtEur(kpis?.routers.revenue ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-xs text-gray-400">Cautions détenues</span>
              <span className="text-sm font-bold tabular-nums text-gray-500">{loading ? "…" : fmtEur(kpis?.routers.deposits ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-xs text-gray-400">Stock disponible</span>
              <span className={`text-sm font-bold ${(kpis?.routers.available ?? 0) === 0 && (kpis?.routers.total ?? 0) > 0 ? "text-red-500" : "text-green-600"}`}>
                {loading ? "…" : `${kpis?.routers.available ?? 0} / ${kpis?.routers.total ?? 0}`}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-xs text-gray-400">En location</span>
              <span className="text-sm font-bold text-gray-900">{loading ? "…" : kpis?.routers.rented ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <p className="text-sm font-semibold text-gray-700">Historique depuis le lancement</p>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {(["revenue", "count"] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${view === v ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}>
                  {v === "revenue" ? "CA (€)" : "Volume"}
                </button>
              ))}
            </div>
          </div>
          {statsLoading ? <Spinner /> : monthlyStats.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-sm text-gray-400">Aucune donnée</div>
          ) : (
            <>
              <div className="flex gap-4 mb-3 text-xs text-gray-400">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: C.esim }} />Direct</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: C.partner }} />Partenaires</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                {view === "revenue" ? (
                  <BarChart data={monthlyStats} barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}€`} />
                    <Tooltip formatter={(v: number, n: string) => [`${v.toFixed(2)} €`, n === "direct" ? "Direct" : "Partenaires"]} />
                    <Bar dataKey="direct"  stackId="a" fill={C.esim}    name="direct" />
                    <Bar dataKey="partner" stackId="a" fill={C.partner} name="partner" radius={[3,3,0,0]} />
                  </BarChart>
                ) : (
                  <BarChart data={monthlyStats} barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip formatter={(v: number) => [`${v} ventes`, "Volume"]} />
                    <Bar dataKey="count" fill={C.esim} radius={[3,3,0,0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-50">
                <div className="text-center"><p className="text-xs text-gray-400 mb-1">Total ventes</p><p className="text-xl font-bold text-gray-900 tabular-nums">{fmtNum(totalCount)}</p></div>
                <div className="text-center"><p className="text-xs text-gray-400 mb-1">CA total</p><p className="text-xl font-bold text-gray-900 tabular-nums">{fmtEur(totalRevEur)}</p></div>
                <div className="text-center"><p className="text-xs text-gray-400 mb-1">Via partenaires</p><p className="text-xl font-bold tabular-nums" style={{ color: C.partner }}>{fmtPct(totalPartner, totalRevEur)}</p></div>
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-4">Répartition CA</p>
          {loading || !kpis ? <Spinner /> : (() => {
            const data = [
              { name: "eSIM", value: kpis.esim.revenue },
              { name: "Assurance", value: kpis.insurance.premiums },
              { name: "Routeurs", value: kpis.routers.revenue },
            ].filter(d => d.value > 0);
            return data.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-gray-400">Aucune donnée</div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-3">
                  {data.map((d, i) => (
                    <span key={d.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: PIE_COLORS[i] }} />{d.name}
                    </span>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                      {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmtEur(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </>
            );
          })()}

          {/* Top destinations */}
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Top destinations</p>
            {statsLoading ? <Spinner /> : (
              <div className="space-y-2">
                {topDest.slice(0, 5).map((d, i) => (
                  <div key={d.destination} className="flex items-center gap-2">
                    <span className="text-xs text-gray-300 w-4">#{i+1}</span>
                    <span className="text-xs text-gray-600 flex-1 truncate">{d.destination}</span>
                    <span className="text-xs font-bold text-gray-900">{d.count}×</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top forfaits */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <p className="text-sm font-semibold text-gray-700 mb-4">Top 10 forfaits</p>
        {statsLoading ? <Spinner /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topPkgs.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-200 w-6">#{i+1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-700 truncate font-medium">{p.name}</span>
                    <span className="text-xs font-bold text-gray-900 ml-2">{p.count}×</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(p.count / (topPkgs[0]?.count || 1)) * 100}%`, background: G, opacity: Math.max(0.3, 1 - i * 0.07) }} />
                  </div>
                </div>
                <span className="text-xs text-gray-400 w-16 text-right tabular-nums">{fmtEur(p.revenue_eur)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── VUE PARTENAIRES ────────────────────────────────────────────
function VuePartenaires({ partners, loading, onGeneratePdf, onMarkPaid }: {
  partners: PartnerRow[];
  loading: boolean;
  onGeneratePdf: (code: string) => void;
  onMarkPaid: (code: string) => void;
}) {
  const totalSales = partners.reduce((s, p) => s + p.total_sales, 0);
  const totalCom   = partners.reduce((s, p) => s + p.total_commission, 0);
  const totalOrders = partners.reduce((s, p) => s + p.orders_count, 0);
  const maxSales = partners[0]?.total_sales ?? 1;

  return (
    <div className="space-y-6">
      {/* KPIs partenaires */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Partenaires actifs" value={fmtNum(partners.length)} sub="sur la période" />
        <KpiCard label="CA via partenaires" value={fmtEur(totalSales)} sub={`${fmtPct(totalSales, totalSales)} du CA partenaire`} accent={C.partner} />
        <KpiCard label="Commissions dues" value={fmtEur(totalCom)} sub="à verser" accent="#F87171" warn={totalCom > 0} />
        <KpiCard label="Ventes partenaires" value={fmtNum(totalOrders)} sub="commandes" />
      </div>

      {/* Classement partenaires */}
      {loading ? <Spinner /> : partners.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center">
          <Users size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Aucun partenaire actif sur la période sélectionnée</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Classement partenaires</p>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Award size={12} className="text-amber-400" />
              <span>Triés par CA décroissant</span>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {partners.map((p, i) => (
              <div key={p.partner_code} className="px-5 py-4">
                <div className="flex items-start gap-4">
                  {/* Rang */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-gray-50 text-gray-400"}`}>
                    #{i+1}
                  </div>
                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <p className="text-sm font-bold text-gray-800">{p.partner_name}</p>
                      <p className="text-xs text-gray-400 font-mono">{p.partner_code}</p>
                    </div>
                    {/* Barre de progression */}
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(p.total_sales / maxSales) * 100}%`, background: G }} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">CA généré</p>
                        <p className="text-sm font-bold tabular-nums" style={{ color: C.partner }}>{fmtEur(p.total_sales)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Commission</p>
                        <p className="text-sm font-bold tabular-nums text-red-500">{fmtEur(p.total_commission)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Ventes</p>
                        <p className="text-sm font-bold text-gray-700">{p.orders_count} cmdes</p>
                      </div>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => onGeneratePdf(p.partner_code)} className="text-xs px-3 py-1.5 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 whitespace-nowrap">
                      PDF commission
                    </button>
                    <button onClick={() => onMarkPaid(p.partner_code)} className="text-xs px-3 py-1.5 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 whitespace-nowrap">
                      Marquer payé
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── VUE BORDEREAUX ─────────────────────────────────────────────
function VueBordereaux({ anset, loading, onGeneratePdf, onMarkPaid }: {
  anset: ANSETRow[];
  loading: boolean;
  onGeneratePdf: (p: string) => void;
  onMarkPaid: (p: string) => void;
}) {
  const [markingAnset, setMarkingAnset] = useState<string | null>(null);
  const [ansetRef, setAnsetRef] = useState("");

  const pendingTotal = anset.filter(s => s.status !== "paid").reduce((s, a) => s + a.total_to_transfer, 0);
  const pendingCount = anset.filter(s => s.status !== "paid").length;

  return (
    <div className="space-y-6">
      {/* Alerte ANSET */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <AlertTriangle size={18} className="text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">{pendingCount} bordereau{pendingCount > 1 ? "x" : ""} ANSET en attente</p>
            <p className="text-sm text-amber-700">{fmtEur(pendingTotal)} à reverser à ANSET</p>
          </div>
        </div>
      )}

      {/* Tableau ANSET */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.insurance }}><Shield size={13} className="text-white" /></div>
          <p className="text-sm font-bold text-gray-700">Reversements ANSET</p>
        </div>
        {loading ? <Spinner /> : anset.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">Aucun bordereau</div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 bg-gray-50/50">
                  <th className="text-left px-5 py-3 font-medium">Période</th>
                  <th className="text-right px-5 py-3 font-medium">Contrats</th>
                  <th className="text-right px-5 py-3 font-medium">À reverser</th>
                  <th className="text-right px-5 py-3 font-medium">Statut</th>
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {anset.map(s => (
                  <tr key={s.period} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-gray-700">{s.period}</td>
                    <td className="px-5 py-3.5 text-right text-gray-500">{s.total_contracts}</td>
                    <td className="px-5 py-3.5 text-right font-bold tabular-nums text-gray-900">{fmtEur(s.total_to_transfer)}</td>
                    <td className="px-5 py-3.5 text-right">
                      {s.status === "paid"
                        ? <span className="inline-flex items-center gap-1.5 text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full"><CheckCircle size={11} />Reversé</span>
                        : <span className="inline-flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full"><Clock size={11} />En attente</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => onGeneratePdf(s.period)} className="text-xs px-3 py-1.5 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50">
                          Bordereau PDF
                        </button>
                        {s.status !== "paid" && (
                          <button onClick={() => setMarkingAnset(markingAnset === s.period ? null : s.period)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-green-200 text-green-700 hover:bg-green-50">
                            Marquer reversé
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {markingAnset && (
              <div className="px-5 py-4 border-t border-amber-100 bg-amber-50/30">
                <p className="text-xs font-medium text-gray-600 mb-2">Confirmer le reversement <strong>{markingAnset}</strong></p>
                <div className="flex items-center gap-2">
                  <input type="text" placeholder="Référence virement" value={ansetRef} onChange={e => setAnsetRef(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-xl text-gray-700" />
                  <button onClick={() => { onMarkPaid(markingAnset); setMarkingAnset(null); setAnsetRef(""); }} disabled={!ansetRef.trim()}
                    className="text-xs px-4 py-2 rounded-xl text-white font-medium disabled:opacity-50" style={{ background: G }}>
                    Confirmer ✓
                  </button>
                  <button onClick={() => { setMarkingAnset(null); setAnsetRef(""); }}
                    className="text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-500">Annuler</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Import & Outils */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-4">Import CSV Stripe</p>
          <p className="text-xs text-gray-400 mb-4">Stripe → Rapports → Paiements → Télécharger CSV</p>
          <label className="cursor-pointer">
            <input type="file" accept=".csv" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              const text = await file.text();
              const res = await fetch("/api/admin/stripe-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv: text, batch: new Date().toISOString().slice(0, 7) }) });
              const data = await res.json();
              alert(`✅ ${data.imported} transactions · 🔗 ${data.reconciled} réconciliées`);
              e.target.value = "";
            }} />
            <span className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl text-white font-medium" style={{ background: G, display: "inline-flex" }}>
              <Upload size={14} /><span>Importer CSV Stripe</span>
            </span>
          </label>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-4">Import coûts Airalo</p>
          <CostsImportSection onDone={() => {}} />
        </div>
      </div>
    </div>
  );
}

// ── VUE STOCK ──────────────────────────────────────────────────
function VueStock({ stock, loading }: { stock: any[]; loading: boolean }) {
  const available  = stock.filter(r => r.status === "available").length;
  const rented     = stock.filter(r => r.status === "rented").length;
  const maintenance = stock.filter(r => r.status !== "available" && r.status !== "rented").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Disponibles" value={String(available)} sub={`sur ${stock.length} routeurs`} accent="#059669" />
        <KpiCard label="En location" value={String(rented)} accent={C.esim} />
        <KpiCard label="Maintenance" value={String(maintenance)} warn={maintenance > 0} />
      </div>

      {loading ? <Spinner /> : stock.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center">
          <Package size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Aucun routeur enregistré</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-bold text-gray-700">Parc routeurs FENUASIMBOX</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-5">
            {stock.map((r: any) => (
              <div key={r.id} className={`rounded-xl p-4 border ${r.status === "available" ? "border-green-100 bg-green-50/30" : r.status === "rented" ? "border-purple-100 bg-purple-50/30" : "border-orange-100 bg-orange-50/30"}`}>
                <p className="text-sm font-bold text-gray-800 truncate">{r.model}</p>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{r.serial_number}</p>
                <p className={`text-xs mt-2 font-semibold ${r.status === "available" ? "text-green-600" : r.status === "rented" ? "text-purple-600" : "text-orange-500"}`}>
                  {r.status === "available" ? "✓ Disponible" : r.status === "rented" ? "● En location" : "⚙ Maintenance"}
                </p>
                {r.current_rental_end && (
                  <p className="text-xs text-gray-400 mt-1">
                    Retour : {new Date(r.current_rental_end).toLocaleDateString("fr-FR")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-700">Gestion avancée</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href="/admin/routeurs" className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
            <Package size={14} /><span>Gérer les locations</span><ChevronRight size={14} />
          </a>
          <a href="/admin/fenuasimbox" className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
            <FileText size={14} /><span>Réservations</span><ChevronRight size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}

// ── PAGE PRINCIPALE ────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [periodKey,   setPeriodKey]   = useState("auj");
  const [customStart, setCustomStart] = useState("");
  const [customEnd,   setCustomEnd]   = useState("");
  const [showCustom,  setShowCustom]  = useState(false);
  const [activeTab,   setActiveTab]   = useState<"global" | "partenaires" | "bordereaux" | "stock">("global");
  const [markingCommission, setMarkingCommission] = useState<string | null>(null);
  const [commissionRef,     setCommissionRef]     = useState("");

  const period = showCustom && customStart && customEnd ? { start: customStart, end: customEnd } : getPeriod(periodKey);
  const { kpis, monthly, partners, anset, stock, expiringEsims, loading, error, reload } = useDashboard(period);

  useEffect(() => {
    if (!router.isReady) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || !isAdmin(session.user?.email)) router.push("/admin/login");
      else setAuthChecked(true);
    });
  }, [router.isReady]);

  const handleGenerateBordereau = async (p: string) => {
    const res = await fetch("/api/admin/anset-bordereau", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ period: p }) });
    if (!res.ok) { const e = await res.json(); alert(`Erreur : ${e.error}`); return; }
    const blob = await res.blob(); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `bordereau-anset-${p}.pdf`; a.click(); URL.revokeObjectURL(url);
  };

  const handleMarkAnsetPaid = async (p: string) => {
    const ref = prompt("Référence du virement ANSET :"); if (!ref) return;
    const res  = await fetch("/api/admin/bordereaux", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark_anset_paid", period: p, reference: ref }) });
    const data = await res.json();
    if (data.success) { alert(`✅ Reversement ${p} marqué payé`); reload(); } else alert(`Erreur : ${data.error}`);
  };

  const handleGenerateCommissionPdf = async (partnerCode: string) => {
    const res = await fetch("/api/admin/commission-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partner_code: partnerCode, period: period.start.slice(0, 7) }) });
    if (!res.ok) { alert("Erreur PDF commission"); return; }
    const blob = await res.blob(); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `commission-${partnerCode}-${period.start.slice(0, 7)}.pdf`; a.click(); URL.revokeObjectURL(url);
  };

  const handleMarkCommissionPaid = async (partnerCode: string) => {
    const ref = prompt(`Référence du virement pour ${partners.find(p => p.partner_code === partnerCode)?.partner_name} :`); if (!ref) return;
    const res  = await fetch("/api/admin/bordereaux", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark_commission_paid", partner_code: partnerCode, period: period.start.slice(0, 7), reference: ref }) });
    const data = await res.json();
    if (data.success) { alert(`✅ Commission marquée payée`); reload(); } else alert(`Erreur : ${data.error}`);
  };

  if (!authChecked) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
    </div>
  );

  const PERIODS = [{ key: "auj", label: "Auj." }, { key: "7j", label: "7j" }, { key: "30j", label: "30j" }, { key: "3m", label: "3 mois" }, { key: "ytd", label: "YTD" }];
  const TABS = [
    { key: "global",      label: "Vue globale",  icon: BarChart2 },
    { key: "partenaires", label: "Partenaires",  icon: Users },
    { key: "bordereaux",  label: "Bordereaux",   icon: FileText, badge: anset.filter(s => s.status !== "paid").length },
    { key: "stock",       label: "Stock",        icon: Package },
  ] as const;

  // Alertes urgentes
  const urgentAlerts = [
    kpis && kpis.insurance.pending_count > 0 && `${kpis.insurance.pending_count} reversement(s) ANSET en attente`,
    expiringEsims.length > 0 && `${expiringEsims.length} eSIM(s) expirent dans 3 jours`,
  ].filter(Boolean);

  return (
    <>
      <Head><title>Dashboard — FENUA SIM</title><meta name="robots" content="noindex" /></Head>
      <div className="min-h-screen bg-gray-50">

        {/* TOPBAR */}
        <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-14 gap-4">
              {/* Logo */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: G }}>
                  <TrendingUp size={15} className="text-white" />
                </div>
                <div className="hidden sm:block">
                  <span className="text-sm font-bold" style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FENUA</span>
                  <span className="text-sm font-bold text-gray-400 mx-1">·</span>
                  <span className="text-sm font-bold text-gray-600">Pilotage</span>
                </div>
              </div>

              {/* Alertes rapides */}
              {urgentAlerts.length > 0 && (
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                  <span className="text-xs text-amber-700">{urgentAlerts.join(" · ")}</span>
                </div>
              )}

              {/* Période */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                  {PERIODS.map(t => (
                    <button key={t.key} onClick={() => { setPeriodKey(t.key); setShowCustom(false); }}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${periodKey === t.key && !showCustom ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                      style={periodKey === t.key && !showCustom ? { background: G } : {}}>{t.label}</button>
                  ))}
                </div>
                <button onClick={() => setShowCustom(!showCustom)} className={`flex items-center gap-1 text-xs px-2.5 py-2 border rounded-xl ${showCustom ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-white border-gray-200 text-gray-500"}`}>
                  <Calendar size={11} />
                </button>
                <button onClick={reload} className="flex items-center gap-1 text-xs px-2.5 py-2 border border-gray-200 rounded-xl bg-white text-gray-500">
                  <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                </button>
                <button onClick={() => supabase.auth.signOut().then(() => router.push("/admin/login"))}
                  className="flex items-center gap-1 text-xs px-2.5 py-2 border border-gray-200 rounded-xl bg-white text-gray-400 hover:text-red-500">
                  <LogOut size={11} />
                </button>
              </div>
            </div>

            {/* Filtre dates */}
            {showCustom && (
              <div className="flex items-center gap-3 pb-3 flex-wrap">
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg text-gray-700 bg-white" />
                <span className="text-xs text-gray-400">→</span>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg text-gray-700 bg-white" />
                {customStart && customEnd && <span className="text-xs text-purple-600 font-medium">{Math.round((new Date(customEnd).getTime() - new Date(customStart).getTime()) / 86400000) + 1} jours</span>}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 -mb-px">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key as any)}
                  className={`flex items-center gap-1.5 text-xs px-4 py-3 border-b-2 font-medium transition-all whitespace-nowrap ${activeTab === t.key ? "border-purple-600 text-purple-700" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                  <t.icon size={13} />
                  {t.label}
                  {t.badge && t.badge > 0 && (
                    <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full font-bold">{t.badge}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CONTENU */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">⚠️ {error}</div>}

          {activeTab === "global"      && <VueGlobale kpis={kpis} monthly={monthly} loading={loading} expiringEsims={expiringEsims} />}
          {activeTab === "partenaires" && <VuePartenaires partners={partners} loading={loading} onGeneratePdf={handleGenerateCommissionPdf} onMarkPaid={handleMarkCommissionPaid} />}
          {activeTab === "bordereaux"  && <VueBordereaux anset={anset} loading={loading} onGeneratePdf={handleGenerateBordereau} onMarkPaid={handleMarkAnsetPaid} />}
          {activeTab === "stock"       && <VueStock stock={stock} loading={loading} />}

          <p className="text-xs text-gray-300 text-center mt-10 mb-4">FENUASIM · Dashboard interne · {new Date().getFullYear()}</p>
        </div>
      </div>
    </>
  );
}

AdminDashboard.getLayout = (page: ReactElement) => page;