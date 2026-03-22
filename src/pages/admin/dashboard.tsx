// ============================================================
// FENUA SIM – Dashboard de pilotage
// Fichier : src/pages/admin/dashboard.tsx
//
// Dépendances déjà installées dans le projet :
//   - @supabase/supabase-js ✅
//   - recharts ✅
//   - lucide-react ✅
//   - tailwindcss ✅
// ============================================================

import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";

// ── Constante admin (même pattern que les autres pages admin) ──
const ADMIN_EMAIL = "admin@fenuasim.com";
const G = "linear-gradient(135deg, #A020F0 0%, #FF4D6D 50%, #FF7F11 100%)";

// ── Couleurs Fenua ────────────────────────────────────────────
const C = {
  esim: "#A020F0",
  insurance: "#FF4D6D",
  routers: "#FF7F11",
  partner: "#0EA896",
  direct: "#A020F0",
};

// ── Utilitaires ──────────────────────────────────────────────
const fmtEur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(n || 0);

const fmtNum = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n || 0));

const fmtPct = (n: number, total: number) =>
  total === 0 ? "0%" : `${Math.round((n / total) * 100)}%`;

// ── Types ────────────────────────────────────────────────────
interface KPIs {
  esim: { count: number; revenue: number; margin_net: number; commissions: number; avg_basket: number };
  insurance: { count: number; revenue: number; premiums: number; pending_transfer: number; pending_count: number };
  routers: { count: number; revenue: number; deposits: number; available: number; rented: number; total: number };
  totals: { revenue: number; margin: number; stripe_fees: number };
}

interface MonthlyPoint { month: string; esim: number; insurance: number; routers: number }
interface SourcePoint { source: string; revenue: number; count: number }
interface PartnerRow { partner_code: string; partner_name: string; total_sales: number; total_commission: number; orders_count: number }
interface ANSETRow { period: string; total_contracts: number; total_to_transfer: number; status: string }
interface RouterRow { id: string; model: string; serial_number: string; status: string; current_renter: string | null; current_rental_end: string | null }

// ── Sélecteur de période ─────────────────────────────────────
function getPeriod(key: string) {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  switch (key) {
    case "7j":  { const s = new Date(now); s.setDate(s.getDate() - 7); return { start: fmt(s), end: fmt(now) }; }
    case "3m":  { const s = new Date(now); s.setMonth(s.getMonth() - 3); return { start: fmt(s), end: fmt(now) }; }
    case "ytd": return { start: `${now.getFullYear()}-01-01`, end: fmt(now) };
    default: { const s = new Date(now); s.setDate(s.getDate() - 30); return { start: fmt(s), end: fmt(now) }; }
  }
}

// ── Hook données ─────────────────────────────────────────────
function useDashboard(period: { start: string; end: string }) {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [monthly, setMonthly] = useState<MonthlyPoint[]>([]);
  const [sources, setSources] = useState<SourcePoint[]>([]);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [anset, setAnset] = useState<ANSETRow[]>([]);
  const [stock, setStock] = useState<RouterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // ── Fetch parallèle ──
      const [esimRes, insRes, rentRes, stockRes, ansetRes, partnerRes] = await Promise.all([
        supabase.from("orders")
          .select("price, margin_net, commission_amount, source, partner_code, stripe_fee, created_at")
          .gte("created_at", period.start).lte("created_at", period.end)
          .in("status", ["completed", "paid"]),
        supabase.from("insurances")
          .select("frais_distribution, premium_ava, amount_to_transfer, transfer_status, margin_net, stripe_fee, created_at")
          .gte("created_at", period.start).lte("created_at", period.end)
          .in("status", ["paid", "validated"]),
        supabase.from("router_rentals")
          .select("rental_amount, deposit_amount, deposit_status, margin_net, stripe_fee, created_at")
          .gte("created_at", period.start).lte("created_at", period.end)
          .eq("payment_status", "paid"),
        supabase.from("v_router_stock").select("*"),
        supabase.from("insurer_settlements")
          .select("period, total_contracts, total_to_transfer, status")
          .order("period", { ascending: false }).limit(6),
        supabase.from("v_partner_commissions_detail").select("*")
          .gte("period_month", period.start.slice(0, 7))
          .lte("period_month", period.end.slice(0, 7)),
      ]);

      const esim = esimRes.data ?? [];
      const ins = insRes.data ?? [];
      const rent = rentRes.data ?? [];
      const stk = stockRes.data ?? [];

      // ── KPIs ──
      const esimRevenue = esim.reduce((s, o) => s + (o.price ?? 0), 0);
      const esimMargin = esim.reduce((s, o) => s + (o.margin_net ?? 0), 0);
      const esimCommissions = esim.reduce((s, o) => s + (o.commission_amount ?? 0), 0);
      const esimFees = esim.reduce((s, o) => s + (o.stripe_fee ?? 0), 0);

      const insRevenue = ins.reduce((s, i) => s + (i.frais_distribution ?? 0), 0);
      const insPremiums = ins.reduce((s, i) => s + (i.premium_ava ?? 0), 0);
      const insPending = ins.filter(i => i.transfer_status === "pending");
      const insPendingAmt = insPending.reduce((s, i) => s + (i.amount_to_transfer ?? ((i.premium_ava ?? 0) - (i.frais_distribution ?? 0))), 0);
      const insFees = ins.reduce((s, i) => s + (i.stripe_fee ?? 0), 0);

      const rentRevenue = rent.reduce((s, r) => s + (r.rental_amount ?? 0), 0);
      const rentDeposits = rent.filter(r => r.deposit_status === "held").reduce((s, r) => s + (r.deposit_amount ?? 0), 0);
      const rentFees = rent.reduce((s, r) => s + (r.stripe_fee ?? 0), 0);

      const totalFees = esimFees + insFees + rentFees;
      const totalRevenue = esimRevenue + insRevenue + rentRevenue;

      setKpis({
        esim: { count: esim.length, revenue: esimRevenue, margin_net: esimMargin, commissions: esimCommissions, avg_basket: esim.length ? esimRevenue / esim.length : 0 },
        insurance: { count: ins.length, revenue: insRevenue, premiums: insPremiums, pending_transfer: insPendingAmt, pending_count: insPending.length },
        routers: { count: rent.length, revenue: rentRevenue, deposits: rentDeposits, available: stk.filter(r => r.status === "available").length, rented: stk.filter(r => r.status === "rented").length, total: stk.length },
        totals: { revenue: totalRevenue, margin: esimMargin + insRevenue + rentRevenue - totalFees, stripe_fees: totalFees },
      });

      // ── Données mensuelles ──
      const mMap: Record<string, MonthlyPoint> = {};
      const addM = (date: string, type: keyof Omit<MonthlyPoint, "month">, v: number) => {
        const m = date.slice(0, 7);
        if (!mMap[m]) mMap[m] = { month: m, esim: 0, insurance: 0, routers: 0 };
        mMap[m][type] += v;
      };
      esim.forEach(o => addM(o.created_at, "esim", o.price ?? 0));
      ins.forEach(i => addM(i.created_at, "insurance", i.frais_distribution ?? 0));
      rent.forEach(r => addM(r.created_at, "routers", r.rental_amount ?? 0));
      setMonthly(Object.values(mMap).sort((a, b) => a.month.localeCompare(b.month)));

      // ── Sources ──
      const sMap: Record<string, SourcePoint> = {};
      esim.forEach(o => {
        const src = o.source ?? (o.partner_code ? `Partenaire` : "Direct");
        if (!sMap[src]) sMap[src] = { source: src, revenue: 0, count: 0 };
        sMap[src].revenue += o.price ?? 0;
        sMap[src].count += 1;
      });
      setSources(Object.values(sMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5));

      // ── Partenaires ──
      const pMap: Record<string, PartnerRow> = {};
      (partnerRes.data ?? []).forEach((p: any) => {
        if (!pMap[p.partner_code]) pMap[p.partner_code] = { partner_code: p.partner_code, partner_name: p.partner_name ?? p.partner_code, total_sales: 0, total_commission: 0, orders_count: 0 };
        pMap[p.partner_code].total_sales += p.total_sales ?? 0;
        pMap[p.partner_code].total_commission += p.total_commission ?? p.total_commission_calculated ?? 0;
        pMap[p.partner_code].orders_count += p.orders_count ?? 0;
      });
      setPartners(Object.values(pMap).sort((a, b) => b.total_sales - a.total_sales));

      setAnset(ansetRes.data ?? []);
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

// ── Composants ───────────────────────────────────────────────
function KpiCard({ label, value, sub, badge, warn }: { label: string; value: string; sub?: string; badge?: string; warn?: boolean }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {badge && (
        <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-2 font-medium ${warn ? "bg-amber-100 text-amber-700" : "bg-purple-100 text-purple-700"}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

function Section({ title, icon: Icon }: { title: string; icon: any }) {
  return (
    <div className="flex items-center gap-2 mt-8 mb-3">
      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: G }}>
        <Icon size={13} className="text-white" />
      </div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{title}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const [periodKey, setPeriodKey] = useState("30j");
  const [authChecked, setAuthChecked] = useState(false);
  const period = getPeriod(periodKey);
  const { kpis, monthly, sources, partners, anset, stock, loading, error, reload } = useDashboard(period);

  // ── Auth (même pattern que admin/assurance.tsx) ──
  useEffect(() => {
    if (!router.isReady) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || session.user?.email !== ADMIN_EMAIL) {
        router.push("/admin/login");
      } else {
        setAuthChecked(true);
      }
    });
  }, [router.isReady]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  // ── Import CSV Stripe ──
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
    alert(`Import terminé :\n✅ ${data.imported} transactions importées\n🔗 ${data.reconciled} réconciliées\n⚠️ ${data.unreconciled} non réconciliées`);
    reload();
  };

  const TABS = ["7j", "30j", "3m", "ytd"];
  const PIE_COLORS = [C.esim, C.insurance, C.routers, C.partner, "#9CA3AF"];

  return (
    <>
      <Head>
        <title>Dashboard Pilotage — FENUA SIM</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-gray-50 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

          {/* ── Header ── */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm" style={{ background: G }}>
                <TrendingUp size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  <span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FENUA</span>
                  <span className="text-gray-300 mx-1">·</span>
                  <span className="text-gray-700">Pilotage</span>
                </h1>
                <p className="text-xs text-gray-400">Tableau de bord interne</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Période */}
              <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                {TABS.map(t => (
                  <button key={t} onClick={() => setPeriodKey(t)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${periodKey === t ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                    style={periodKey === t ? { background: G } : {}}
                  >{t}</button>
                ))}
              </div>
              <button onClick={reload}
                className="flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-500 hover:text-gray-800 shadow-sm">
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                Actualiser
              </button>
              <a href="/admin/assurance"
                className="flex items-center gap-1 text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-500 hover:text-gray-800 shadow-sm">
                Assurance <ChevronRight size={12} />
              </a>
            </div>
          </div>

          {/* ── Alerte ANSET ── */}
          {kpis && kpis.insurance.pending_count > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 flex-wrap">
              <AlertTriangle size={16} className="text-amber-500 shrink-0" />
              <p className="text-sm text-amber-800">
                <strong>{kpis.insurance.pending_count} reversement{kpis.insurance.pending_count > 1 ? "s" : ""} ANSET en attente</strong>
                {" — "}{fmtEur(kpis.insurance.pending_transfer)} à reverser
              </p>
            </div>
          )}

          {/* ── Erreur ── */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-700">
              ⚠️ {error}
            </div>
          )}

          {/* ── KPIs globaux ── */}
          <Section title="CA réel & marges" icon={TrendingUp} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="CA total réel" value={loading ? "…" : fmtEur(kpis?.totals.revenue ?? 0)} sub="eSIM + assurance + location" />
            <KpiCard label="Marge nette" value={loading ? "…" : fmtEur(kpis?.totals.margin ?? 0)}
              sub={kpis ? fmtPct(kpis.totals.margin, kpis.totals.revenue) + " du CA" : ""} />
            <KpiCard label="Frais Stripe" value={loading ? "…" : fmtEur(kpis?.totals.stripe_fees ?? 0)}
              badge={kpis?.totals.stripe_fees === 0 ? "Import CSV requis" : undefined} />
            <KpiCard label="Commandes" value={loading ? "…" : fmtNum((kpis?.esim.count ?? 0) + (kpis?.insurance.count ?? 0) + (kpis?.routers.count ?? 0))}
              sub="toutes catégories" />
          </div>

          {/* ── KPIs eSIM ── */}
          <Section title="eSIM" icon={Wifi} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="CA eSIM" value={loading ? "…" : fmtEur(kpis?.esim.revenue ?? 0)} sub={`${kpis?.esim.count ?? 0} commandes`} />
            <KpiCard label="Marge nette" value={loading ? "…" : fmtEur(kpis?.esim.margin_net ?? 0)} sub="Après Airalo + Stripe" />
            <KpiCard label="Commissions" value={loading ? "…" : fmtEur(kpis?.esim.commissions ?? 0)}
              badge={partners.length > 0 ? "À valider" : undefined} warn />
            <KpiCard label="Panier moyen" value={loading ? "…" : fmtEur(kpis?.esim.avg_basket ?? 0)} />
          </div>

          {/* ── KPIs Assurance ── */}
          <Section title="Assurance" icon={Shield} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="CA réel assurance" value={loading ? "…" : fmtEur(kpis?.insurance.revenue ?? 0)} sub="Frais distribution uniquement" />
            <KpiCard label="Primes encaissées" value={loading ? "…" : fmtEur(kpis?.insurance.premiums ?? 0)}
              badge="Hors CA" sub="Pour compte ANSET" />
            <KpiCard label="À reverser ANSET" value={loading ? "…" : fmtEur(kpis?.insurance.pending_transfer ?? 0)}
              badge={kpis && kpis.insurance.pending_count > 0 ? "En attente" : "À jour"}
              warn={kpis ? kpis.insurance.pending_count > 0 : false} />
            <KpiCard label="Contrats" value={loading ? "…" : fmtNum(kpis?.insurance.count ?? 0)} />
          </div>

          {/* ── KPIs Routeurs ── */}
          <Section title="Routeurs" icon={Package} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="CA location" value={loading ? "…" : fmtEur(kpis?.routers.revenue ?? 0)} sub={`${kpis?.routers.count ?? 0} locations`} />
            <KpiCard label="Cautions détenues" value={loading ? "…" : fmtEur(kpis?.routers.deposits ?? 0)} badge="Hors CA" sub="Remboursable" />
            <KpiCard label="Stock disponible"
              value={loading ? "…" : `${kpis?.routers.available ?? 0} / ${kpis?.routers.total ?? 0}`}
              badge={kpis?.routers.available === 0 ? "Complet" : undefined} warn={kpis?.routers.available === 0} />
            <KpiCard label="En location" value={loading ? "…" : fmtNum(kpis?.routers.rented ?? 0)} />
          </div>

          {/* ── Graphiques ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">

            {/* Évolution mensuelle */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-4">CA mensuel par produit</p>
              {loading ? <Spinner /> : monthly.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-gray-400">Aucune donnée</div>
              ) : (
                <>
                  <div className="flex gap-4 mb-3 text-xs text-gray-400 flex-wrap">
                    {[["eSIM", C.esim], ["Assurance", C.insurance], ["Routeurs", C.routers]].map(([l, c]) => (
                      <span key={l} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: c }} />{l}
                      </span>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthly} barSize={12}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}€`} />
                      <Tooltip formatter={(v: number) => fmtEur(v)} />
                      <Bar dataKey="esim" stackId="a" fill={C.esim} />
                      <Bar dataKey="insurance" stackId="a" fill={C.insurance} />
                      <Bar dataKey="routers" stackId="a" fill={C.routers} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>

            {/* Sources */}
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

          {/* ── Tableaux ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">

            {/* ANSET */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-4">Reversements ANSET</p>
              {loading ? <Spinner /> : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-normal">Période</th>
                      <th className="text-right pb-2 font-normal">Contrats</th>
                      <th className="text-right pb-2 font-normal">À reverser</th>
                      <th className="text-right pb-2 font-normal">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anset.length === 0 ? (
                      <tr><td colSpan={4} className="py-6 text-center text-xs text-gray-400">Aucun bordereau généré</td></tr>
                    ) : anset.map(s => (
                      <tr key={s.period} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 font-medium text-gray-700">{s.period}</td>
                        <td className="py-2.5 text-right text-gray-500">{s.total_contracts}</td>
                        <td className="py-2.5 text-right font-semibold text-gray-800">{fmtEur(s.total_to_transfer)}</td>
                        <td className="py-2.5 text-right">
                          {s.status === "paid"
                            ? <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle size={11} />Reversé</span>
                            : <span className="inline-flex items-center gap-1 text-xs text-amber-600"><Clock size={11} />En attente</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Partenaires */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-4">Commissions partenaires</p>
              {loading ? <Spinner /> : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-normal">Partenaire</th>
                      <th className="text-right pb-2 font-normal">CA</th>
                      <th className="text-right pb-2 font-normal">Commission</th>
                      <th className="text-right pb-2 font-normal">Cmdes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partners.length === 0 ? (
                      <tr><td colSpan={4} className="py-6 text-center text-xs text-gray-400">Aucun partenaire actif sur la période</td></tr>
                    ) : partners.map(p => (
                      <tr key={p.partner_code} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 font-medium text-gray-700">{p.partner_name}</td>
                        <td className="py-2.5 text-right text-gray-600">{fmtEur(p.total_sales)}</td>
                        <td className="py-2.5 text-right font-semibold" style={{ color: C.esim }}>{fmtEur(p.total_commission)}</td>
                        <td className="py-2.5 text-right text-gray-400">{p.orders_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ── Stock routeurs ── */}
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
                    <p className="text-xs text-gray-400 mt-0.5">
                      Retour : {new Date(r.current_rental_end).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Import CSV Stripe ── */}
          <Section title="Import CSV Stripe" icon={Upload} />
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">Réconciliation mensuelle</p>
                <p className="text-xs text-gray-400 mt-1">
                  Télécharge ton CSV depuis <strong>Stripe → Rapports → Paiements</strong> puis importe-le ici
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Met à jour automatiquement les frais Stripe et les marges nettes sur toutes les commandes
                </p>
              </div>
              <label className="cursor-pointer shrink-0">
                <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
                <span className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl text-white font-medium shadow-sm transition-opacity hover:opacity-90"
                  style={{ background: G }}>
                  <Upload size={14} />
                  Importer CSV
                </span>
              </label>
            </div>
          </div>

          {/* ── Footer ── */}
          <p className="text-xs text-gray-300 text-center mt-10 mb-4">
            FENUASIM · Dashboard interne · {new Date().getFullYear()}
          </p>

        </div>
      </div>
    </>
  );
}
