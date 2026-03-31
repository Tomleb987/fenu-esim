// ============================================================
// FENUA SIM – Dashboard de pilotage v2
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
  LogOut, Calendar,
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

// Convertir amount en EUR selon la devise
// EUR/USD : amount en centimes Stripe → diviser par 100
// XPF     : amount en unités entières → diviser par EUR_TO_XPF
function getOrderAmount(o: any): number {
  const amt = Number(o.amount ?? o.price ?? 0);
  const c   = (o.currency || "EUR").toUpperCase();
  if (c === "XPF" || c === "CFP") return amt / EUR_TO_XPF;
  if (c === "USD") return (amt / 100) * 0.92;
  return amt / 100; // EUR centimes → euros
}

// Alias pour compatibilité
function toEur(price: number, currency: string): number {
  return getOrderAmount({ amount: price, currency });
}

function getPeriod(key: string) {
  // Utiliser la timezone Polynésie française (UTC-10)
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
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [ordersRes, insRes, rentRes, stockRes, pendingInsRes, activeRentsRes, ansetRes, partnerRes] =
        await Promise.all([
          supabase.from("orders")
            .select("amount, price, currency, margin_net, cost_airalo, stripe_fee, commission_amount, source, partner_code, promo_code, created_at")
// Convertir dates locales Tahiti (UTC-10) en UTC
            // Début : minuit Tahiti = 10:00 UTC même jour
            // Fin   : 23:59 Tahiti = 09:59 UTC jour SUIVANT
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
        ]);

      const orders      = ordersRes.data   ?? [];
      const insurances  = insRes.data      ?? [];
      const rentals     = rentRes.data     ?? [];
      const stockData   = stockRes.data    ?? [];
      const pendingIns  = pendingInsRes.data  ?? [];
      const activeRents = activeRentsRes.data ?? [];

      // eSIM
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

      // Assurance
      const insRev  = insurances.reduce((s, i) => s + Number(i.frais_distribution ?? 0) + Number(i.premium_ava ?? 0) * 0.10, 0);
      const insPrem = insurances.reduce((s, i) => s + Number(i.premium_ava ?? 0), 0);
      const insFee  = insurances.reduce((s, i) => {
        if (i.stripe_fee && Number(i.stripe_fee) > 0) return s + Number(i.stripe_fee);
        const base = Number(i.frais_distribution ?? 0) + Number(i.premium_ava ?? 0);
        return s + Math.round((base * 0.029 + 0.30) * 100) / 100;
      }, 0);
      const pendingAmount = pendingIns.reduce((s: number, i: any) =>
        s + Number(i.amount_to_transfer ?? Number(i.premium_ava ?? 0) * 0.90), 0);

      // Routeurs
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

      // Mensuel
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

      // Partenaires
      const pMap: Record<string, PartnerRow> = {};
      (partnerRes.data ?? []).forEach((p: any) => {
        if (!pMap[p.partner_code]) pMap[p.partner_code] = { partner_code: p.partner_code, partner_name: p.partner_name ?? p.partner_code, total_sales: 0, total_commission: 0, orders_count: 0 };
        pMap[p.partner_code].total_sales      += p.total_sales ?? 0;
        pMap[p.partner_code].total_commission += p.total_commission ?? p.total_commission_calculated ?? 0;
        pMap[p.partner_code].orders_count     += p.orders_count ?? 0;
      });
      setPartners(Object.values(pMap).sort((a, b) => b.total_sales - a.total_sales));

      // ANSET
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
    } catch (err: any) {
      setError(err.message ?? "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [period.start, period.end]);

  useEffect(() => { load(); }, [load]);
  return { kpis, monthly, partners, anset, stock, loading, error, reload: load };
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

function Section({ title, icon: Icon, color }: { title: string; icon: any; color?: string }) {
  return (
    <div className="flex items-center gap-2 mt-8 mb-3">
      <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: color || G }}>
        <Icon size={13} className="text-white" />
      </div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{title}</p>
    </div>
  );
}

function StatsSection() {
  const { monthlyStats, topPkgs, topDest, loading } = useStats();
  const [view, setView] = useState<"revenue" | "count">("revenue");
  const totalCount   = monthlyStats.reduce((s, m) => s + m.count, 0);
  const totalRevEur  = monthlyStats.reduce((s, m) => s + m.revenue_eur, 0);
  const totalPartner = monthlyStats.reduce((s, m) => s + m.partner, 0);
  const maxPkg  = topPkgs[0]?.count ?? 1;
  const maxDest = topDest[0]?.count ?? 1;

  return (
    <div className="mt-2">
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mt-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-700">Historique depuis le lancement</p>
            <p className="text-xs text-gray-400 mt-0.5">Avril 2025 · toutes devises converties en EUR</p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(["revenue", "count"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${view === v ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}>
                {v === "revenue" ? "CA (€)" : "Volume"}
              </button>
            ))}
          </div>
        </div>
        {loading ? <Spinner /> : monthlyStats.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-sm text-gray-400">Aucune donnée</div>
        ) : (
          <>
            {view === "revenue" && (
              <>
                <div className="flex gap-4 mb-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: C.esim }} />Direct</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: C.partner }} />Partenaires</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyStats} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} tickFormatter={v => `${v} €`} />
                    <Tooltip formatter={(v: number, n: string) => [`${v.toFixed(2)} €`, n === "direct" ? "Direct" : "Partenaires"]} />
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
                  <Tooltip formatter={(v: number) => [`${v} ventes`, "Volume"]} />
                  <Bar dataKey="count" fill={C.esim} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-50">
              <div className="text-center"><p className="text-xs text-gray-400 mb-1">Total ventes</p><p className="text-xl font-bold text-gray-900 tabular-nums">{fmtNum(totalCount)}</p></div>
              <div className="text-center"><p className="text-xs text-gray-400 mb-1">CA total (EUR)</p><p className="text-xl font-bold text-gray-900 tabular-nums">{fmtEur(totalRevEur)}</p></div>
              <div className="text-center"><p className="text-xs text-gray-400 mb-1">Via partenaires</p><p className="text-xl font-bold tabular-nums" style={{ color: C.partner }}>{fmtPct(totalPartner, totalRevEur)}</p></div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-4">Top 10 forfaits</p>
          {loading ? <Spinner /> : <div className="space-y-3">{topPkgs.map((p, i) => (
            <div key={p.name}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-gray-300 w-5 shrink-0">#{i+1}</span>
                  <span className="text-xs text-gray-700 truncate font-medium">{p.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className="text-xs font-bold text-gray-900">{p.count}×</span>
                  <span className="text-xs text-gray-400 w-16 text-right tabular-nums">{fmtEur(p.revenue_eur)}</span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(p.count / maxPkg) * 100}%`, background: G, opacity: Math.max(0.3, 1 - i * 0.07) }} />
              </div>
            </div>
          ))}</div>}
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-4">Top destinations</p>
          {loading ? <Spinner /> : <div className="space-y-3">{topDest.map((d, i) => (
            <div key={d.destination}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-gray-300 w-5 shrink-0">#{i+1}</span>
                  <span className="text-xs text-gray-700 truncate font-medium">{d.destination}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className="text-xs font-bold text-gray-900">{d.count}×</span>
                  <span className="text-xs text-gray-400 w-16 text-right tabular-nums">{fmtEur(d.revenue_eur)}</span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(d.count / maxDest) * 100}%`, background: "linear-gradient(90deg,#FF4D6D,#FF7F11)", opacity: Math.max(0.3, 1 - i * 0.08) }} />
              </div>
            </div>
          ))}</div>}
        </div>
      </div>
    </div>
  );
}


// ── Section import coûts Airalo ───────────────────────────────
function CostsImportSection({ onDone }: { onDone: () => void }) {
  const [usdRate, setUsdRate] = useState("0.92");
  const [result, setResult]   = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-700">Import prix de revient Airalo</p>
          <p className="text-xs text-gray-400 mt-1">
            CSV Airalo Partner avec colonnes <code className="bg-gray-100 px-1 rounded">package_id</code> et <code className="bg-gray-100 px-1 rounded">cost_eur</code> (ou <code className="bg-gray-100 px-1 rounded">cost_usd</code>)
          </p>
          <div className="flex items-center gap-2 mt-3">
            <label className="text-xs text-gray-500 shrink-0">Taux USD → EUR</label>
            <input type="number" step="0.001" value={usdRate}
              onChange={e => setUsdRate(e.target.value)}
              className="w-20 text-xs px-2 py-1.5 border border-gray-200 rounded-lg text-gray-700" />
            <span className="text-xs text-gray-400">(ex: 0.920)</span>
          </div>
          {result && (
            <div className={`mt-3 text-xs rounded-xl px-3 py-2 ${result.updated > 0 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
              ✅ {result.updated} packages mis à jour
              {result.notFound > 0 && <span className="ml-2">· ⚠️ {result.notFound} non trouvés</span>}
              {result.marginsRecalculated && <span className="ml-2">· Marges recalculées</span>}
              {result.notFoundIds?.length > 0 && (
                <div className="mt-1 opacity-70">Non trouvés : {result.notFoundIds.join(", ")}</div>
              )}
            </div>
          )}
        </div>
        <label className="cursor-pointer shrink-0">
          <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={loading} />
          <span className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl text-white font-medium shadow-sm transition-all ${loading ? "opacity-80 cursor-wait" : "hover:opacity-90 cursor-pointer"}`}
            style={{ background: G, minWidth: 140 }}>
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
                <span>Import en cours…</span>
              </>
            ) : (
              <>
                <Upload size={14} />
                <span>Importer CSV</span>
              </>
            )}
          </span>
        </label>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [authChecked,       setAuthChecked]       = useState(false);
  const [periodKey,         setPeriodKey]         = useState("30j");
  const [customStart,       setCustomStart]       = useState("");
  const [customEnd,         setCustomEnd]         = useState("");
  const [showCustom,        setShowCustom]        = useState(false);
  const [markingAnset,      setMarkingAnset]      = useState<string | null>(null);
  const [ansetRef,          setAnsetRef]          = useState("");
  const [markingCommission, setMarkingCommission] = useState<string | null>(null);
  const [commissionRef,     setCommissionRef]     = useState("");

  const period = showCustom && customStart && customEnd ? { start: customStart, end: customEnd } : getPeriod(periodKey);
  const { kpis, monthly, partners, anset, stock, loading, error, reload } = useDashboard(period);

  useEffect(() => {
    if (!router.isReady) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || !isAdmin(session.user?.email)) router.push("/admin/login");
      else setAuthChecked(true);
    });
  }, [router.isReady]);

  const [csvImporting, setCsvImporting] = useState(false);
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setCsvImporting(true);
    try {
      const text = await file.text();
      const res  = await fetch("/api/admin/stripe-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv: text, batch: new Date().toISOString().slice(0, 7) }) });
      const data = await res.json();
      alert(`Import :\n✅ ${data.imported} transactions\n🔗 ${data.reconciled} réconciliées`);
      reload();
    } finally {
      setCsvImporting(false);
      e.target.value = "";
    }
  };

  const handleGenerateBordereau = async (p: string) => {
    const res = await fetch("/api/admin/anset-bordereau", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ period: p }) });
    if (!res.ok) { const e = await res.json(); alert(`Erreur : ${e.error}`); return; }
    const blob = await res.blob(); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `bordereau-anset-${p}.pdf`; a.click(); URL.revokeObjectURL(url);
  };

  const handleMarkAnsetPaid = async (p: string) => {
    if (!ansetRef.trim()) { alert("Saisis la référence de virement"); return; }
    setMarkingAnset(p);
    try {
      const res  = await fetch("/api/admin/bordereaux", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark_anset_paid", period: p, reference: ansetRef.trim() }) });
      const data = await res.json();
      if (data.success) { alert(`✅ Reversement ${p} marqué payé`); setAnsetRef(""); reload(); } else alert(`Erreur : ${data.error}`);
    } finally { setMarkingAnset(null); }
  };

  const handleGenerateCommissionPdf = async (partnerCode: string) => {
    const res = await fetch("/api/admin/commission-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partner_code: partnerCode, period: period.start.slice(0, 7) }) });
    if (!res.ok) { alert("Erreur PDF commission"); return; }
    const blob = await res.blob(); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `commission-${partnerCode}-${period.start.slice(0, 7)}.pdf`; a.click(); URL.revokeObjectURL(url);
  };

  const handleMarkCommissionPaid = async (partnerCode: string) => {
    if (!commissionRef.trim()) { alert("Saisis la référence de virement"); return; }
    setMarkingCommission(partnerCode);
    try {
      const res  = await fetch("/api/admin/bordereaux", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark_commission_paid", partner_code: partnerCode, period: period.start.slice(0, 7), reference: commissionRef.trim() }) });
      const data = await res.json();
      if (data.success) { alert(`✅ Commission ${partnerCode} marquée payée`); setCommissionRef(""); reload(); } else alert(`Erreur : ${data.error}`);
    } finally { setMarkingCommission(null); }
  };

  if (!authChecked) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>;

  const TABS = [{ key: "auj", label: "Auj." }, { key: "7j", label: "7j" }, { key: "30j", label: "30j" }, { key: "3m", label: "3 mois" }, { key: "ytd", label: "YTD" }];

  return (
    <>
      <Head><title>Dashboard — FENUA SIM</title><meta name="robots" content="noindex" /></Head>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: G }}><TrendingUp size={19} className="text-white" /></div>
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
                  <button key={t.key} onClick={() => { setPeriodKey(t.key); setShowCustom(false); }}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${periodKey === t.key && !showCustom ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                    style={periodKey === t.key && !showCustom ? { background: G } : {}}>{t.label}</button>
                ))}
              </div>
              <button onClick={() => setShowCustom(!showCustom)} className={`flex items-center gap-1.5 text-xs px-3 py-2 border rounded-xl shadow-sm ${showCustom ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-white border-gray-200 text-gray-500"}`}>
                <Calendar size={12} /> Dates
              </button>
              <button onClick={reload} className="flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-500 hover:text-gray-800 shadow-sm">
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Actualiser
              </button>
              <a href="/admin/assurance" className="flex items-center gap-1 text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-500 hover:text-gray-800 shadow-sm">Assurance <ChevronRight size={12} /></a>
              <a href="/admin/routeurs"  className="flex items-center gap-1 text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-500 hover:text-gray-800 shadow-sm">Routeurs <ChevronRight size={12} /></a>
              <button onClick={() => supabase.auth.signOut().then(() => router.push("/admin/login"))} className="flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-400 hover:text-red-500 shadow-sm">
                <LogOut size={12} /> Déconnexion
              </button>
            </div>
          </div>

          {/* Filtre dates */}
          {showCustom && (
            <div className="flex items-center gap-3 bg-white border border-purple-100 rounded-xl px-4 py-3 mb-4 flex-wrap shadow-sm">
              <Calendar size={14} className="text-purple-500 shrink-0" />
              <span className="text-xs text-gray-500">Période personnalisée :</span>
              <span className="text-xs text-gray-400">Du</span>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg text-gray-700 bg-white" />
              <span className="text-xs text-gray-400">au</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg text-gray-700 bg-white" />
              {customStart && customEnd && (
                <span className="text-xs text-purple-600 font-medium">
                  {Math.round((new Date(customEnd).getTime() - new Date(customStart).getTime()) / 86400000) + 1} jours
                </span>
              )}
            </div>
          )}

          {/* Alerte ANSET */}
          {kpis && kpis.insurance.pending_count > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
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
            <KpiCard label="Marge nette"   value={loading ? "…" : fmtEur(kpis?.totals.margin ?? 0)} sub={kpis ? fmtPct(kpis.totals.margin, kpis.totals.revenue) + " du CA" : ""} />
            <KpiCard label="Frais Stripe"  value={loading ? "…" : fmtEur(kpis?.totals.stripe_fees ?? 0)} sub={kpis ? fmtPct(kpis.totals.stripe_fees, kpis.totals.revenue) : ""} />
            <KpiCard label="Commandes"     value={loading ? "…" : fmtNum((kpis?.esim.count ?? 0) + (kpis?.insurance.count ?? 0) + (kpis?.routers.count ?? 0))} sub="toutes catégories" />
          </div>

          {/* KPIs eSIM */}
          <Section title="eSIM" icon={Wifi} color={C.esim} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="CA eSIM"      value={loading ? "…" : fmtEur(kpis?.esim.revenue ?? 0)}    sub={`${kpis?.esim.count ?? 0} commandes`} />
            <KpiCard label="Marge nette"  value={loading ? "…" : fmtEur(kpis?.esim.margin_net ?? 0)} sub="Après Airalo + Stripe" />
            <KpiCard label="Commissions"  value={loading ? "…" : fmtEur(kpis?.esim.commissions ?? 0)} badge={partners.length > 0 ? "À valider" : undefined} warn />
            <KpiCard label="Panier moyen" value={loading ? "…" : fmtEur(kpis?.esim.avg_basket ?? 0)} />
          </div>

          {/* KPIs Assurance */}
          <Section title="Assurance" icon={Shield} color={C.insurance} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="CA réel assurance" value={loading ? "…" : fmtEur(kpis?.insurance.revenue ?? 0)}  sub="Frais distrib. + commission 10%" />
            <KpiCard label="Primes encaissées" value={loading ? "…" : fmtEur(kpis?.insurance.premiums ?? 0)} badge="Hors CA" sub="Pour compte ANSET" />
            <KpiCard label="À reverser ANSET"  value={loading ? "…" : fmtEur(kpis?.insurance.pending_transfer ?? 0)} badge={kpis && kpis.insurance.pending_count > 0 ? "En attente" : "À jour"} warn={kpis ? kpis.insurance.pending_count > 0 : false} />
            <KpiCard label="Contrats"          value={loading ? "…" : fmtNum(kpis?.insurance.count ?? 0)} />
          </div>

          {/* KPIs Routeurs */}
          <Section title="Routeurs" icon={Package} color={C.routers} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="CA location"       value={loading ? "…" : fmtEur(kpis?.routers.revenue ?? 0)}  sub={`${kpis?.routers.count ?? 0} locations`} />
            <KpiCard label="Cautions détenues" value={loading ? "…" : fmtEur(kpis?.routers.deposits ?? 0)} badge="Hors CA" sub="Remboursable" />
            <KpiCard label="Stock disponible"  value={loading ? "…" : `${kpis?.routers.available ?? 0} / ${kpis?.routers.total ?? 0}`} badge={kpis?.routers.available === 0 && (kpis?.routers.total ?? 0) > 0 ? "Complet" : undefined} warn={kpis?.routers.available === 0 && (kpis?.routers.total ?? 0) > 0} />
            <KpiCard label="En location"       value={loading ? "…" : fmtNum(kpis?.routers.rented ?? 0)} />
          </div>

          {/* Cumul total */}
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50"><p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Cumul toutes activités</p></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-50">
              {[
                { label: "CA réel total", value: fmtEur(kpis?.totals.revenue ?? 0), sub: `${fmtNum((kpis?.esim.count ?? 0) + (kpis?.insurance.count ?? 0) + (kpis?.routers.count ?? 0))} commandes`, color: "#111827" },
                { label: "Marge brute",   value: fmtEur((kpis?.esim.margin_net ?? 0) + (kpis?.insurance.revenue ?? 0) + (kpis?.routers.revenue ?? 0)), sub: fmtPct((kpis?.esim.margin_net ?? 0) + (kpis?.insurance.revenue ?? 0) + (kpis?.routers.revenue ?? 0), kpis?.totals.revenue ?? 0), color: "#059669" },
                { label: "Frais Stripe",  value: `- ${fmtEur(kpis?.totals.stripe_fees ?? 0)}`, sub: fmtPct(kpis?.totals.stripe_fees ?? 0, kpis?.totals.revenue ?? 0), color: "#F87171" },
                { label: "Marge nette",   value: fmtEur(kpis?.totals.margin ?? 0), sub: fmtPct(kpis?.totals.margin ?? 0, kpis?.totals.revenue ?? 0), color: "#A020F0" },
              ].map(item => (
                <div key={item.label} className="px-5 py-4">
                  <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                  <p className="text-xl font-bold tabular-nums" style={{ color: item.color }}>{loading ? "…" : item.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{loading ? "" : item.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-4">CA mensuel par produit</p>
              {loading ? <Spinner /> : monthly.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-gray-400">Aucune donnée sur la période</div>
              ) : (
                <>
                  <div className="flex gap-4 mb-3 text-xs text-gray-400">
                    {(["eSIM", "Assurance", "Routeurs"] as const).map((l, i) => (
                      <span key={l} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: [C.esim, C.insurance, C.routers][i] }} />{l}</span>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthly} barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} tickFormatter={v => `${v} €`} />
                      <Tooltip formatter={(v: number) => fmtEur(v)} />
                      <Bar dataKey="esim"      stackId="a" fill={C.esim}      name="eSIM" />
                      <Bar dataKey="insurance" stackId="a" fill={C.insurance} name="Assurance" />
                      <Bar dataKey="routers"   stackId="a" fill={C.routers}   name="Routeurs" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-4">Répartition du CA</p>
              {loading || !kpis ? <Spinner /> : (() => {
                const data = [
                  { name: "eSIM",      value: kpis.esim.revenue },
                  { name: "Assurance", value: kpis.insurance.premiums },
                  { name: "Routeurs",  value: kpis.routers.revenue },
                ].filter(d => d.value > 0);
                return data.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-sm text-gray-400">Aucune donnée sur la période</div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-3 mb-3">
                      {data.map((d, i) => (
                        <span key={d.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: PIE_COLORS[i] }} />
                          {d.name} — {fmtEur(d.value)}
                        </span>
                      ))}
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                          {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmtEur(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Tableaux ANSET + Commissions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-4">Reversements ANSET</p>
              {loading ? <Spinner /> : (
                <>
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-normal">Période</th>
                      <th className="text-right pb-2 font-normal">Contrats</th>
                      <th className="text-right pb-2 font-normal">À reverser</th>
                      <th className="text-right pb-2 font-normal">Statut</th>
                      <th className="text-right pb-2 font-normal"></th>
                    </tr></thead>
                    <tbody>
                      {anset.length === 0 ? (
                        <tr><td colSpan={5} className="py-6 text-center text-xs text-gray-400">Aucun bordereau</td></tr>
                      ) : anset.map(s => (
                        <tr key={s.period} className="border-b border-gray-50 last:border-0">
                          <td className="py-2.5 font-medium text-gray-700">{s.period}</td>
                          <td className="py-2.5 text-right text-gray-500">{s.total_contracts}</td>
                          <td className="py-2.5 text-right font-semibold tabular-nums text-gray-800">{fmtEur(s.total_to_transfer)}</td>
                          <td className="py-2.5 text-right">
                            {s.status === "paid"
                              ? <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle size={11} />Reversé</span>
                              : <span className="inline-flex items-center gap-1 text-xs text-amber-600"><Clock size={11} />En attente</span>}
                          </td>
                          <td className="py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => handleGenerateBordereau(s.period)} className="text-xs px-2 py-1 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50">PDF</button>
                              {s.status !== "paid" && <button onClick={() => setMarkingAnset(markingAnset === s.period ? null : s.period)} className="text-xs px-2 py-1 rounded-lg border border-green-200 text-green-700 hover:bg-green-50">Marquer payé</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {markingAnset && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-600 mb-2">Confirmer le reversement <strong>{markingAnset}</strong></p>
                      <div className="flex items-center gap-2">
                        <input type="text" placeholder="Référence virement" value={ansetRef} onChange={e => setAnsetRef(e.target.value)} className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-xl text-gray-700" />
                        <button onClick={() => handleMarkAnsetPaid(markingAnset)} disabled={!ansetRef.trim()} className="text-xs px-4 py-2 rounded-xl text-white font-medium disabled:opacity-50" style={{ background: G }}>Confirmer ✓</button>
                        <button onClick={() => { setMarkingAnset(null); setAnsetRef(""); }} className="text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-500">Annuler</button>
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
                    <thead><tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-normal">Partenaire</th>
                      <th className="text-right pb-2 font-normal">CA</th>
                      <th className="text-right pb-2 font-normal">Commission</th>
                      <th className="text-right pb-2 font-normal">Cmdes</th>
                      <th className="text-right pb-2 font-normal"></th>
                    </tr></thead>
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
                              <button onClick={() => handleGenerateCommissionPdf(p.partner_code)} className="text-xs px-2 py-1 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50">PDF</button>
                              <button onClick={() => setMarkingCommission(markingCommission === p.partner_code ? null : p.partner_code)} className="text-xs px-2 py-1 rounded-lg border border-green-200 text-green-700 hover:bg-green-50">Marquer payé</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {markingCommission && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-600 mb-2">Confirmer paiement <strong>{partners.find(p => p.partner_code === markingCommission)?.partner_name}</strong></p>
                      <div className="flex items-center gap-2">
                        <input type="text" placeholder="Référence virement" value={commissionRef} onChange={e => setCommissionRef(e.target.value)} className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-xl text-gray-700" />
                        <button onClick={() => handleMarkCommissionPaid(markingCommission)} disabled={!commissionRef.trim()} className="text-xs px-4 py-2 rounded-xl text-white font-medium disabled:opacity-50" style={{ background: G }}>Confirmer ✓</button>
                        <button onClick={() => { setMarkingCommission(null); setCommissionRef(""); }} className="text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-500">Annuler</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Stock routeurs */}
          <Section title="Stock routeurs" icon={Package} color={C.routers} />
          {loading ? <Spinner /> : stock.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun routeur enregistré</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {stock.map((r: any) => (
                <div key={r.id} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                  <p className="text-xs font-semibold text-gray-800 truncate">{r.model}</p>
                  <p className={`text-xs mt-1 font-medium ${r.status === "available" ? "text-green-600" : r.status === "rented" ? "text-purple-600" : "text-orange-500"}`}>
                    {r.status === "available" ? "✓ Disponible" : r.status === "rented" ? "● En location" : "⚙ Maintenance"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{r.serial_number}</p>
                  {r.current_rental_end && <p className="text-xs text-gray-400 mt-0.5">Retour : {new Date(r.current_rental_end).toLocaleDateString("fr-FR")}</p>}
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
              </div>
              <label className={csvImporting ? "cursor-wait" : "cursor-pointer"} style={{ flexShrink: 0 }}>
                <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} disabled={csvImporting} />
                <span className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl text-white font-medium shadow-sm transition-all ${csvImporting ? "opacity-80" : "hover:opacity-90"}`}
                  style={{ background: G, minWidth: 140 }}>
                  {csvImporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
                      <span>Import en cours…</span>
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>Importer CSV</span>
                    </>
                  )}
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

AdminDashboard.getLayout = (page: ReactElement) => page;
