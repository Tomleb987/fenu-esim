// ============================================================
// FENUA SIM – Page gestion routeurs
// src/pages/admin/routeurs.tsx
// ============================================================

import { useEffect, useState, useCallback } from "react";
import type { ReactElement } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "@/lib/supabaseClient";
import {
  Package, Plus, RefreshCw, LogOut, ChevronLeft,
  CheckCircle, Clock, AlertTriangle, Download, Wifi,
} from "lucide-react";

const ADMIN_EMAIL = "admin@fenuasim.com";
const G = "linear-gradient(135deg, #A020F0 0%, #FF4D6D 50%, #FF7F11 100%)";
const DEPOSIT_AMOUNT = 50;

// ── Formatage ─────────────────────────────────────────────────
const fmtEur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n || 0);
const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString("fr-FR") : "-";
const today = () => new Date().toISOString().slice(0, 10);

// ── Types ─────────────────────────────────────────────────────
interface Router { id: string; model: string; serial_number: string; status: string; rental_price_per_day: number; deposit_amount: number }
interface Rental {
  id: string; router_id: string; customer_email: string; customer_name: string; customer_phone: string;
  rental_start: string; rental_end: string; rental_days: number; price_per_day: number;
  rental_amount: number; deposit_amount: number; deposit_status: string;
  deposit_retained_amount: number; payment_status: string; status: string;
  notes: string; invoice_id: string; order_id: string;
  routers?: { model: string; serial_number: string };
  orders?: { package_name: string; airalo_order_id: string };
}

// ── Composants UI ─────────────────────────────────────────────
function Badge({ label, color }: { label: string; color: "green" | "amber" | "blue" | "gray" | "red" }) {
  const cls = {
    green: "bg-green-100 text-green-700", amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700", gray: "bg-gray-100 text-gray-500", red: "bg-red-100 text-red-700",
  };
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${cls[color]}`}>{label}</span>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full text-sm px-3 py-2 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:border-purple-400";

// ── Page principale ───────────────────────────────────────────
export default function AdminRouteurs() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [routers, setRouters] = useState<Router[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"rentals" | "stock">("rentals");

  // Modals
  const [showAddRouter, setShowAddRouter] = useState(false);
  const [showNewRental, setShowNewRental] = useState(false);
  const [showReturn, setShowReturn] = useState<Rental | null>(null);
  const [showLinkEsim, setShowLinkEsim] = useState<Rental | null>(null);

  // Auth
  useEffect(() => {
    if (!router.isReady) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || session.user?.email !== ADMIN_EMAIL) router.push("/admin/login");
      else setAuthChecked(true);
    });
  }, [router.isReady]);

  const load = useCallback(async () => {
    setLoading(true);
    const [routersRes, rentalsRes] = await Promise.all([
      supabase.from("routers").select("*").order("model"),
      supabase.from("router_rentals")
        .select("*, routers(model, serial_number), orders(package_name, airalo_order_id)")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setRouters(routersRes.data ?? []);
    setRentals(rentalsRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { if (authChecked) load(); }, [authChecked, load]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/admin/login"); };

  const handleGenerateInvoice = async (rental: Rental) => {
    const res = await fetch("/api/admin/generate-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rentalId: rental.id, type: "router_rental" }),
    });
    if (!res.ok) { alert("Erreur génération facture"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `facture-location-${rental.id.slice(0, 8)}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!authChecked) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
    </div>
  );

  const activeRentals   = rentals.filter(r => r.status === "active");
  const upcomingRentals = rentals.filter(r => r.status === "upcoming");
  const pastRentals     = rentals.filter(r => r.status === "completed" || r.status === "cancelled");
  const availableCount  = routers.filter(r => r.status === "available").length;

  return (
    <>
      <Head><title>Routeurs — FENUA SIM</title><meta name="robots" content="noindex" /></Head>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: G }}>
                <Package size={19} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">
                  <span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FENUA</span>
                  <span className="text-gray-300 mx-1">·</span>
                  <span className="text-gray-700">Routeurs</span>
                </h1>
                <p className="text-xs text-gray-400">Gestion des locations</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setShowNewRental(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl text-white font-medium shadow-sm hover:opacity-90"
                style={{ background: G }}>
                <Plus size={13} /> Nouvelle location
              </button>
              <button onClick={load}
                className="flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-500 hover:text-gray-800 shadow-sm">
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Actualiser
              </button>
              <a href="/admin/dashboard"
                className="flex items-center gap-1 text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-500 hover:text-gray-800 shadow-sm">
                <ChevronLeft size={12} /> Dashboard
              </a>
              <button onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-400 hover:text-red-500 shadow-sm">
                <LogOut size={12} /> Déconnexion
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "En location", value: activeRentals.length, color: "text-purple-600" },
              { label: "À venir", value: upcomingRentals.length, color: "text-blue-500" },
              { label: "Disponibles", value: availableCount, color: "text-green-600" },
              { label: "Total routeurs", value: routers.length, color: "text-gray-700" },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">{k.label}</p>
                <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit mb-6">
            {[{ key: "rentals", label: "Locations" }, { key: "stock", label: "Stock routeurs" }].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as any)}
                className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-all ${tab === t.key ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                style={tab === t.key ? { background: G } : {}}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Locations */}
          {tab === "rentals" && (
            <div className="space-y-4">
              {/* En cours */}
              {activeRentals.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> En location ({activeRentals.length})
                  </p>
                  <RentalTable rentals={activeRentals} onReturn={setShowReturn} onInvoice={handleGenerateInvoice} onLinkEsim={setShowLinkEsim} />
                </div>
              )}

              {/* À venir */}
              {upcomingRentals.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> À venir ({upcomingRentals.length})
                  </p>
                  <RentalTable rentals={upcomingRentals} onReturn={setShowReturn} onInvoice={handleGenerateInvoice} onLinkEsim={setShowLinkEsim} />
                </div>
              )}

              {/* Terminées */}
              {pastRentals.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> Terminées ({pastRentals.length})
                  </p>
                  <RentalTable rentals={pastRentals} onReturn={setShowReturn} onInvoice={handleGenerateInvoice} onLinkEsim={setShowLinkEsim} />
                </div>
              )}

              {rentals.length === 0 && !loading && (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                  <Package size={32} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Aucune location — clique sur "Nouvelle location" pour commencer</p>
                </div>
              )}
            </div>
          )}

          {/* Stock */}
          {tab === "stock" && (
            <div>
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowAddRouter(true)}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl text-white font-medium shadow-sm hover:opacity-90"
                  style={{ background: G }}>
                  <Plus size={13} /> Ajouter un routeur
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {routers.map(r => (
                  <div key={r.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-gray-800">{r.model}</p>
                      <Badge
                        label={r.status === "available" ? "Disponible" : r.status === "rented" ? "En location" : "Maintenance"}
                        color={r.status === "available" ? "green" : r.status === "rented" ? "blue" : "amber"}
                      />
                    </div>
                    <p className="text-xs text-gray-400">S/N : {r.serial_number}</p>
                    <p className="text-xs text-gray-400 mt-1">{fmtEur(r.rental_price_per_day)}/jour · Caution {fmtEur(r.deposit_amount)}</p>
                  </div>
                ))}
                {routers.length === 0 && (
                  <p className="text-sm text-gray-400 col-span-full text-center py-8">Aucun routeur — ajoutes-en un</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal : Nouvelle location */}
      {showNewRental && (
        <NewRentalModal
          routers={routers.filter(r => r.status === "available")}
          onClose={() => setShowNewRental(false)}
          onDone={() => { setShowNewRental(false); load(); }}
        />
      )}

      {/* Modal : Ajouter routeur */}
      {showAddRouter && (
        <AddRouterModal
          onClose={() => setShowAddRouter(false)}
          onDone={() => { setShowAddRouter(false); load(); }}
        />
      )}

      {/* Modal : Retour */}
      {showReturn && (
        <ReturnModal
          rental={showReturn}
          onClose={() => setShowReturn(null)}
          onDone={() => { setShowReturn(null); load(); }}
        />
      )}

      {/* Modal : Lier eSIM */}
      {showLinkEsim && (
        <LinkEsimModal
          rental={showLinkEsim}
          onClose={() => setShowLinkEsim(null)}
          onDone={() => { setShowLinkEsim(null); load(); }}
        />
      )}
    </>
  );
}

// ── Tableau locations ─────────────────────────────────────────
function RentalTable({ rentals, onReturn, onInvoice, onLinkEsim }: {
  rentals: Rental[];
  onReturn: (r: Rental) => void;
  onInvoice: (r: Rental) => void;
  onLinkEsim: (r: Rental) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 font-normal">Client</th>
            <th className="text-left px-4 py-3 font-normal">Routeur</th>
            <th className="text-left px-4 py-3 font-normal">Dates</th>
            <th className="text-right px-4 py-3 font-normal">Loyer</th>
            <th className="text-right px-4 py-3 font-normal">Caution</th>
            <th className="text-right px-4 py-3 font-normal">eSIM</th>
            <th className="text-right px-4 py-3 font-normal">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rentals.map(r => (
            <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-800">{r.customer_name || "-"}</p>
                <p className="text-xs text-gray-400">{r.customer_email}</p>
                {r.customer_phone && <p className="text-xs text-gray-400">{r.customer_phone}</p>}
              </td>
              <td className="px-4 py-3">
                <p className="text-gray-700">{r.routers?.model || "-"}</p>
                <p className="text-xs text-gray-400">{r.routers?.serial_number}</p>
              </td>
              <td className="px-4 py-3">
                <p className="text-gray-700">{fmtDate(r.rental_start)} → {fmtDate(r.rental_end)}</p>
                <p className="text-xs text-gray-400">{r.rental_days} jour{r.rental_days > 1 ? "s" : ""}</p>
              </td>
              <td className="px-4 py-3 text-right">
                <p className="font-semibold text-gray-800">{fmtEur(r.rental_amount)}</p>
                <p className="text-xs text-gray-400">{r.payment_status === "paid" ? "✓ Payé" : "En attente"}</p>
              </td>
              <td className="px-4 py-3 text-right">
                <p className="text-gray-700">{fmtEur(r.deposit_amount)}</p>
                <Badge
                  label={r.deposit_status === "held" ? "Détenue" : r.deposit_status === "refunded" ? "Restituée" : "Retenue"}
                  color={r.deposit_status === "held" ? "amber" : r.deposit_status === "refunded" ? "green" : "red"}
                />
              </td>
              <td className="px-4 py-3 text-right">
                {r.order_id ? (
                  <div className="flex items-center justify-end gap-1 text-xs text-purple-600">
                    <Wifi size={11} />
                    <span>{r.orders?.package_name?.slice(0, 12) || "eSIM liée"}</span>
                  </div>
                ) : (
                  <button onClick={() => onLinkEsim(r)}
                    className="text-xs text-gray-400 hover:text-purple-600 flex items-center gap-1 ml-auto">
                    <Wifi size={11} /> Lier
                  </button>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                  <button onClick={() => onInvoice(r)}
                    className="text-xs px-2 py-1 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50">
                    <Download size={11} />
                  </button>
                  {(r.status === "active" || r.status === "upcoming") && (
                    <button onClick={() => onReturn(r)}
                      className="text-xs px-2 py-1 rounded-lg border border-green-200 text-green-700 hover:bg-green-50">
                      Retour
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Modal : Nouvelle location ─────────────────────────────────
function NewRentalModal({ routers, onClose, onDone }: { routers: Router[]; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    router_id: routers[0]?.id ?? "",
    customer_email: "", customer_name: "", customer_phone: "",
    rental_start: today(), rental_end: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [stripeLink, setStripeLink] = useState("");

  const selectedRouter = routers.find(r => r.id === form.router_id);
  const days = form.rental_start && form.rental_end
    ? Math.max(1, Math.round((new Date(form.rental_end).getTime() - new Date(form.rental_start).getTime()) / 86400000))
    : 0;
  const rentalAmount = days * (selectedRouter?.rental_price_per_day ?? 0);
  const totalWithDeposit = rentalAmount + DEPOSIT_AMOUNT;

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.router_id || !form.customer_email || !form.rental_start || !form.rental_end) {
      alert("Remplis tous les champs obligatoires"); return;
    }
    setSaving(true);
    try {
      // Créer la location
      const { data: rental, error } = await supabase.from("router_rentals").insert({
        router_id: form.router_id,
        customer_email: form.customer_email,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        rental_start: form.rental_start,
        rental_end: form.rental_end,
        rental_days: days,
        price_per_day: selectedRouter?.rental_price_per_day ?? 0,
        rental_amount: rentalAmount,
        deposit_amount: DEPOSIT_AMOUNT,
        deposit_status: "held",
        payment_status: "pending",
        status: "upcoming",
        notes: form.notes,
      }).select("id").single();

      if (error) throw error;

      // Créer lien de paiement Stripe
      const stripeRes = await fetch("/api/create-payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(totalWithDeposit * 100),
          currency: "eur",
          description: `Location routeur ${selectedRouter?.model} - ${days}j + caution 50€`,
          customer_email: form.customer_email,
          metadata: { rental_id: rental.id, type: "router_rental" },
        }),
      });

      if (stripeRes.ok) {
        const { url } = await stripeRes.json();
        setStripeLink(url);
        // Mettre à jour la location avec le lien Stripe
        await supabase.from("router_rentals").update({ payment_status: "pending" }).eq("id", rental.id);
      }

      // Mettre à jour le statut du routeur
      await supabase.from("routers").update({ status: "rented" }).eq("id", form.router_id);

      if (!stripeLink) onDone();
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (stripeLink) return (
    <Modal title="Location créée ✅" onClose={onDone}>
      <div className="text-center py-4">
        <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
        <p className="text-sm text-gray-700 mb-4">Location créée. Envoie ce lien au client pour le paiement :</p>
        <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-600 break-all mb-4">{stripeLink}</div>
        <div className="flex gap-2 justify-center">
          <button onClick={() => navigator.clipboard.writeText(stripeLink)}
            className="text-xs px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
            Copier le lien
          </button>
          <button onClick={onDone}
            className="text-xs px-4 py-2 rounded-xl text-white font-medium" style={{ background: G }}>
            Terminer
          </button>
        </div>
      </div>
    </Modal>
  );

  return (
    <Modal title="Nouvelle location" onClose={onClose}>
      <Field label="Routeur *">
        <select value={form.router_id} onChange={e => set("router_id", e.target.value)} className={inputCls}>
          {routers.map(r => (
            <option key={r.id} value={r.id}>{r.model} — {r.serial_number} ({fmtEur(r.rental_price_per_day)}/j)</option>
          ))}
        </select>
        {routers.length === 0 && <p className="text-xs text-red-500 mt-1">Aucun routeur disponible</p>}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date début *">
          <input type="date" value={form.rental_start} onChange={e => set("rental_start", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Date fin *">
          <input type="date" value={form.rental_end} min={form.rental_start} onChange={e => set("rental_end", e.target.value)} className={inputCls} />
        </Field>
      </div>
      <Field label="Email client *">
        <input type="email" value={form.customer_email} onChange={e => set("customer_email", e.target.value)} className={inputCls} placeholder="client@email.com" />
      </Field>
      <Field label="Nom client">
        <input type="text" value={form.customer_name} onChange={e => set("customer_name", e.target.value)} className={inputCls} placeholder="Prénom Nom" />
      </Field>
      <Field label="Téléphone">
        <input type="tel" value={form.customer_phone} onChange={e => set("customer_phone", e.target.value)} className={inputCls} placeholder="+689 XX XX XX XX" />
      </Field>
      <Field label="Notes">
        <textarea value={form.notes} onChange={e => set("notes", e.target.value)} className={inputCls} rows={2} placeholder="Notes internes..." />
      </Field>

      {days > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm">
          <div className="flex justify-between mb-1"><span className="text-gray-500">Loyer ({days}j × {fmtEur(selectedRouter?.rental_price_per_day ?? 0)})</span><span className="font-medium">{fmtEur(rentalAmount)}</span></div>
          <div className="flex justify-between mb-1"><span className="text-gray-500">Caution (remboursable)</span><span className="font-medium">{fmtEur(DEPOSIT_AMOUNT)}</span></div>
          <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold"><span>Total à encaisser</span><span style={{ color: "#A020F0" }}>{fmtEur(totalWithDeposit)}</span></div>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 text-sm px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600">Annuler</button>
        <button onClick={handleSave} disabled={saving || routers.length === 0}
          className="flex-1 text-sm px-4 py-2.5 rounded-xl text-white font-medium disabled:opacity-50" style={{ background: G }}>
          {saving ? "Création…" : "Créer + lien Stripe"}
        </button>
      </div>
    </Modal>
  );
}

// ── Modal : Retour routeur ─────────────────────────────────────
function ReturnModal({ rental, onClose, onDone }: { rental: Rental; onClose: () => void; onDone: () => void }) {
  const [depositAction, setDepositAction] = useState<"refund" | "retain_partial" | "retain_full">("refund");
  const [retainAmount, setRetainAmount] = useState("");
  const [retainReason, setRetainReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleReturn = async () => {
    setSaving(true);
    try {
      const retained = depositAction === "retain_full" ? rental.deposit_amount
        : depositAction === "retain_partial" ? parseFloat(retainAmount) || 0 : 0;
      const refunded = rental.deposit_amount - retained;

      await supabase.from("router_rentals").update({
        status: "completed",
        actual_return: today(),
        deposit_status: depositAction === "refund" ? "refunded" : depositAction === "retain_full" ? "fully_retained" : "partially_retained",
        deposit_refunded_amount: refunded,
        deposit_retained_amount: retained,
        deposit_retention_reason: retainReason || null,
        deposit_settled_at: new Date().toISOString(),
      }).eq("id", rental.id);

      await supabase.from("routers").update({ status: "available" }).eq("id", rental.router_id);
      onDone();
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Retour du routeur" onClose={onClose}>
      <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm">
        <p className="font-medium text-gray-700">{rental.customer_name} — {rental.routers?.model}</p>
        <p className="text-xs text-gray-400 mt-1">Caution détenue : {fmtEur(rental.deposit_amount)}</p>
      </div>

      <Field label="Caution">
        <div className="space-y-2">
          {[
            { key: "refund", label: `Restituer intégralement (${fmtEur(rental.deposit_amount)})`, color: "text-green-600" },
            { key: "retain_partial", label: "Retenue partielle", color: "text-amber-600" },
            { key: "retain_full", label: `Retenue totale (${fmtEur(rental.deposit_amount)})`, color: "text-red-600" },
          ].map(opt => (
            <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="deposit" value={opt.key}
                checked={depositAction === opt.key}
                onChange={() => setDepositAction(opt.key as any)} />
              <span className={`text-sm ${opt.color}`}>{opt.label}</span>
            </label>
          ))}
        </div>
      </Field>

      {depositAction === "retain_partial" && (
        <Field label="Montant retenu (€)">
          <input type="number" value={retainAmount} onChange={e => setRetainAmount(e.target.value)}
            className={inputCls} placeholder="Ex: 20" max={rental.deposit_amount} />
        </Field>
      )}

      {depositAction !== "refund" && (
        <Field label="Motif de retenue">
          <input type="text" value={retainReason} onChange={e => setRetainReason(e.target.value)}
            className={inputCls} placeholder="Ex: Câble manquant, écran rayé..." />
        </Field>
      )}

      <div className="flex gap-2 mt-4">
        <button onClick={onClose} className="flex-1 text-sm px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600">Annuler</button>
        <button onClick={handleReturn} disabled={saving}
          className="flex-1 text-sm px-4 py-2.5 rounded-xl text-white font-medium disabled:opacity-50" style={{ background: G }}>
          {saving ? "Enregistrement…" : "Confirmer le retour"}
        </button>
      </div>
    </Modal>
  );
}

// ── Modal : Ajouter routeur ───────────────────────────────────
function AddRouterModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ model: "", serial_number: "", rental_price_per_day: "5", deposit_amount: "50", imei: "" });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.model || !form.serial_number) { alert("Modèle et numéro de série requis"); return; }
    setSaving(true);
    const { error } = await supabase.from("routers").insert({
      model: form.model, serial_number: form.serial_number,
      rental_price_per_day: parseFloat(form.rental_price_per_day),
      deposit_amount: parseFloat(form.deposit_amount),
      imei: form.imei || null, status: "available",
    });
    setSaving(false);
    if (error) { alert(`Erreur : ${error.message}`); return; }
    onDone();
  };

  return (
    <Modal title="Ajouter un routeur" onClose={onClose}>
      <Field label="Modèle *"><input type="text" value={form.model} onChange={e => set("model", e.target.value)} className={inputCls} placeholder="Ex: Glocalme G4 Pro" /></Field>
      <Field label="Numéro de série *"><input type="text" value={form.serial_number} onChange={e => set("serial_number", e.target.value)} className={inputCls} placeholder="GLC-001" /></Field>
      <Field label="IMEI"><input type="text" value={form.imei} onChange={e => set("imei", e.target.value)} className={inputCls} placeholder="Optionnel" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prix/jour (€)"><input type="number" value={form.rental_price_per_day} onChange={e => set("rental_price_per_day", e.target.value)} className={inputCls} /></Field>
        <Field label="Caution (€)"><input type="number" value={form.deposit_amount} onChange={e => set("deposit_amount", e.target.value)} className={inputCls} /></Field>
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 text-sm px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600">Annuler</button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 text-sm px-4 py-2.5 rounded-xl text-white font-medium disabled:opacity-50" style={{ background: G }}>
          {saving ? "Enregistrement…" : "Ajouter"}
        </button>
      </div>
    </Modal>
  );
}

// ── Modal : Lier eSIM ─────────────────────────────────────────
function LinkEsimModal({ rental, onClose, onDone }: { rental: Rental; onClose: () => void; onDone: () => void }) {
  const [search, setSearch] = useState(rental.customer_email);
  const [orders, setOrders] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSearch = async () => {
    setSearching(true);
    const { data } = await supabase.from("orders")
      .select("id, email, package_name, created_at, airalo_order_id")
      .ilike("email", `%${search}%`)
      .in("status", ["completed", "paid"])
      .order("created_at", { ascending: false })
      .limit(10);
    setOrders(data ?? []);
    setSearching(false);
  };

  const handleLink = async (orderId: string) => {
    setSaving(true);
    await supabase.from("router_rentals").update({ order_id: orderId }).eq("id", rental.id);
    setSaving(false);
    onDone();
  };

  return (
    <Modal title="Lier une commande eSIM" onClose={onClose}>
      <p className="text-xs text-gray-400 mb-4">Associe ce routeur à une commande eSIM existante du même client</p>
      <div className="flex gap-2 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          className={`${inputCls} flex-1`} placeholder="Email du client" />
        <button onClick={handleSearch} disabled={searching}
          className="text-xs px-4 py-2 rounded-xl text-white font-medium" style={{ background: G }}>
          {searching ? "…" : "Chercher"}
        </button>
      </div>
      <div className="space-y-2">
        {orders.map(o => (
          <div key={o.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">{o.package_name}</p>
              <p className="text-xs text-gray-400">{o.email} · {fmtDate(o.created_at)}</p>
            </div>
            <button onClick={() => handleLink(o.id)} disabled={saving}
              className="text-xs px-3 py-1.5 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50">
              Lier
            </button>
          </div>
        ))}
        {orders.length === 0 && search && <p className="text-xs text-gray-400 text-center py-4">Aucune commande trouvée</p>}
      </div>
    </Modal>
  );
}

AdminRouteurs.getLayout = (page: ReactElement) => page;
