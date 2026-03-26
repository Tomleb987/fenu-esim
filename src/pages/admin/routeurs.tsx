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
  CheckCircle, Download, Wifi,
} from "lucide-react";

const ADMIN_EMAIL = "admin@fenuasim.com";
const G = "linear-gradient(135deg, #A020F0 0%, #FF4D6D 50%, #FF7F11 100%)";
const DEPOSIT_AMOUNT = 67;

// ── Formatage ─────────────────────────────────────────────────
const fmtEur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n || 0);

const fmtDate = (s: string) => (s ? new Date(s).toLocaleDateString("fr-FR") : "-");

const today = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dateOnly = (value: string) => {
  if (!value) return "";
  return value.slice(0, 10);
};

const getRentalStatus = (rental: { rental_start: string; rental_end: string; status?: string }) => {
  if (rental.status === "completed" || rental.status === "cancelled") return rental.status;

  const currentDay = today();
  const startDay = dateOnly(rental.rental_start);
  const endDay = dateOnly(rental.rental_end);

  if (currentDay < startDay) return "upcoming";
  if (currentDay > endDay) return "completed";
  return "active";
};

// ── Types ─────────────────────────────────────────────────────
interface RouterItem {
  id: string;
  model: string;
  serial_number: string;
  status: string;
  rental_price_per_day: number;
  deposit_amount: number;
  imei?: string | null;
}

interface Rental {
  id: string;
  router_id: string;
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  rental_start: string;
  rental_end: string;
  rental_days: number;
  price_per_day: number;
  rental_amount: number;
  original_rental_amount?: number;
  rental_offered?: boolean;
  deposit_amount: number;
  deposit_status: string;
  deposit_retained_amount: number;
  deposit_refunded_amount?: number;
  deposit_retention_reason?: string | null;
  deposit_settled_at?: string | null;
  payment_status: string;
  status: string;
  notes: string;
  invoice_id: string;
  order_id: string;
  stripe_payment_intent?: string | null;
  actual_return?: string | null;
  esim_package_name?: string;
  routers?: { model: string; serial_number: string };
  orders?: { package_name: string; airalo_order_id: string };
}

// ── Composants UI ─────────────────────────────────────────────
function Badge({
  label,
  color,
}: {
  label: string;
  color: "green" | "amber" | "blue" | "gray" | "red";
}) {
  const cls = {
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    gray: "bg-gray-100 text-gray-500",
    red: "bg-red-100 text-red-700",
  };

  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${cls[color]}`}>
      {label}
    </span>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">
            ✕
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full text-sm px-3 py-2 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:border-purple-400";

// ── Page principale ───────────────────────────────────────────
export default function AdminRouteurs() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [routers, setRouters] = useState<RouterItem[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"rentals" | "stock">("rentals");

  const [showAddRouter, setShowAddRouter] = useState(false);
  const [showNewRental, setShowNewRental] = useState(false);
  const [showReturn, setShowReturn] = useState<Rental | null>(null);
  const [showLinkEsim, setShowLinkEsim] = useState<Rental | null>(null);
  const [sendingContract, setSendingContract] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || session.user?.email !== ADMIN_EMAIL) {
        router.push("/admin/login");
      } else {
        setAuthChecked(true);
      }
    });
  }, [router.isReady, router]);

  const load = useCallback(async () => {
    setLoading(true);

    const [routersRes, rentalsRes] = await Promise.all([
      supabase.from("routers").select("*").order("model"),
      supabase
        .from("router_rentals")
        .select("*, routers(model, serial_number)")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    setRouters((routersRes.data as RouterItem[]) ?? []);
    setRentals((rentalsRes.data as Rental[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authChecked) load();
  }, [authChecked, load]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const handleSendContractLink = async (rental: Rental) => {
    if (!rental.customer_email) {
      alert("Email client manquant");
      return;
    }

    if (!confirm("Envoyer le lien de signature à " + rental.customer_email + " ?")) return;

    setSendingContract(rental.id);
    try {
      const res = await fetch("/api/admin/send-contract-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rentalId: rental.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("✅ Lien de signature envoyé à " + rental.customer_email);
      load();
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setSendingContract(null);
    }
  };

  const handleGenerateContract = async (rental: Rental) => {
    const res = await fetch("/api/admin/rental-contract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rentalId: rental.id }),
    });

    if (!res.ok) {
      alert("Erreur génération contrat");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contrat-location-" + rental.id.slice(0, 8) + ".pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateInvoice = async (rental: Rental) => {
    const res = await fetch("/api/admin/generate-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rentalId: rental.id, type: "router_rental" }),
    });

    if (!res.ok) {
      alert("Erreur génération facture");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `facture-location-${rental.id.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  const activeRentals = rentals.filter((r) => getRentalStatus(r) === "active");
  const upcomingRentals = rentals.filter((r) => getRentalStatus(r) === "upcoming");
  const pastRentals = rentals.filter((r) => {
    const computed = getRentalStatus(r);
    return computed === "completed" || computed === "cancelled";
  });

  const availableCount = routers.filter((routerItem) => {
    const hasBlockingRental = rentals.some(
      (r) =>
        r.router_id === routerItem.id &&
        (getRentalStatus(r) === "active" || getRentalStatus(r) === "upcoming")
    );
    return !hasBlockingRental;
  }).length;

  return (
    <>
      <Head>
        <title>Routeurs — FENUA SIM</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                style={{ background: G }}
              >
                <Package size={19} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">
                  <span
                    style={{
                      background: G,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    FENUA
                  </span>
                  <span className="text-gray-300 mx-1">·</span>
                  <span className="text-gray-700">Routeurs</span>
                </h1>
                <p className="text-xs text-gray-400">Gestion des locations</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowNewRental(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl text-white font-medium shadow-sm hover:opacity-90"
                style={{ background: G }}
              >
                <Plus size={13} /> Nouvelle location
              </button>

              <button
                onClick={load}
                className="flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-500 hover:text-gray-800 shadow-sm"
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Actualiser
              </button>

              <a
                href="/admin/dashboard"
                className="flex items-center gap-1 text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-500 hover:text-gray-800 shadow-sm"
              >
                <ChevronLeft size={12} /> Dashboard
              </a>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-400 hover:text-red-500 shadow-sm"
              >
                <LogOut size={12} /> Déconnexion
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "En location", value: activeRentals.length, color: "text-purple-600" },
              { label: "À venir", value: upcomingRentals.length, color: "text-blue-500" },
              { label: "Disponibles", value: availableCount, color: "text-green-600" },
              { label: "Total routeurs", value: routers.length, color: "text-gray-700" },
            ].map((k) => (
              <div key={k.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">{k.label}</p>
                <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit mb-6">
            {[{ key: "rentals", label: "Locations" }, { key: "stock", label: "Stock routeurs" }].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as "rentals" | "stock")}
                className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-all ${
                  tab === t.key ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
                }`}
                style={tab === t.key ? { background: G } : {}}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "rentals" && (
            <div className="space-y-4">
              {activeRentals.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> En location ({activeRentals.length})
                  </p>
                  <RentalTable
                    rentals={activeRentals}
                    onReturn={setShowReturn}
                    onInvoice={handleGenerateInvoice}
                    onContract={handleGenerateContract}
                    onYouSign={handleSendContractLink}
                    onLinkEsim={setShowLinkEsim}
                    sendingContract={sendingContract}
                  />
                </div>
              )}

              {upcomingRentals.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> À venir ({upcomingRentals.length})
                  </p>
                  <RentalTable
                    rentals={upcomingRentals}
                    onReturn={setShowReturn}
                    onInvoice={handleGenerateInvoice}
                    onContract={handleGenerateContract}
                    onYouSign={handleSendContractLink}
                    onLinkEsim={setShowLinkEsim}
                    sendingContract={sendingContract}
                  />
                </div>
              )}

              {pastRentals.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> Terminées ({pastRentals.length})
                  </p>
                  <RentalTable
                    rentals={pastRentals}
                    onReturn={setShowReturn}
                    onInvoice={handleGenerateInvoice}
                    onContract={handleGenerateContract}
                    onYouSign={handleSendContractLink}
                    onLinkEsim={setShowLinkEsim}
                    sendingContract={sendingContract}
                  />
                </div>
              )}

              {rentals.length === 0 && !loading && (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                  <Package size={32} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">
                    Aucune location — clique sur "Nouvelle location" pour commencer
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === "stock" && (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowAddRouter(true)}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl text-white font-medium shadow-sm hover:opacity-90"
                  style={{ background: G }}
                >
                  <Plus size={13} /> Ajouter un routeur
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {routers.map((r) => {
                  const currentRental = rentals.find(
                    (rl) =>
                      rl.router_id === r.id &&
                      (getRentalStatus(rl) === "active" || getRentalStatus(rl) === "upcoming")
                  );

                  const computedRouterStatus = currentRental
                    ? getRentalStatus(currentRental)
                    : r.status === "maintenance"
                      ? "maintenance"
                      : "available";

                  return (
                    <div key={r.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold text-gray-800">{r.model}</p>
                        <Badge
                          label={
                            computedRouterStatus === "available"
                              ? "Disponible"
                              : computedRouterStatus === "upcoming"
                                ? "À venir"
                                : computedRouterStatus === "active"
                                  ? "En location"
                                  : "Maintenance"
                          }
                          color={
                            computedRouterStatus === "available"
                              ? "green"
                              : computedRouterStatus === "upcoming"
                                ? "amber"
                                : computedRouterStatus === "active"
                                  ? "blue"
                                  : "amber"
                          }
                        />
                      </div>

                      <p className="text-xs text-gray-400">S/N : {r.serial_number}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {fmtEur(r.rental_price_per_day)}/jour · Caution {fmtEur(r.deposit_amount)}
                      </p>

                      {(computedRouterStatus === "active" || computedRouterStatus === "upcoming") && currentRental && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs font-medium text-gray-700">
                            {currentRental.customer_name || currentRental.customer_email}
                          </p>

                          <p className="text-xs text-gray-400 mt-0.5">
                            {computedRouterStatus === "upcoming"
                              ? `Départ prévu : ${fmtDate(currentRental.rental_start)}`
                              : `Retour prévu : ${fmtDate(currentRental.rental_end)}`}
                          </p>

                          <p className="text-xs text-gray-400 mt-0.5">
                            {currentRental.rental_days}j ·{" "}
                            {currentRental.rental_offered
                              ? `Offerte (valeur ${fmtEur(currentRental.original_rental_amount ?? currentRental.rental_amount)})`
                              : fmtEur(currentRental.rental_amount)}
                          </p>

                          <div className="flex gap-1.5 mt-2">
                            <button
                              onClick={() => setShowReturn(currentRental)}
                              className="text-xs px-2 py-1 rounded-lg border border-green-200 text-green-700 hover:bg-green-50"
                            >
                              Retour
                            </button>

                            <button
                              onClick={() => handleGenerateInvoice(currentRental)}
                              className="text-xs px-2 py-1 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 flex items-center gap-1"
                            >
                              <Download size={10} /> Facture
                            </button>
                          </div>
                        </div>
                      )}

                      {r.status === "rented" && !currentRental && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <button
                            onClick={async () => {
                              if (!confirm("Remettre ce routeur en disponible ?")) return;
                              await supabase.from("routers").update({ status: "available" }).eq("id", r.id);
                              load();
                            }}
                            className="mt-1 w-full text-xs px-2 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center gap-1"
                          >
                            ⏹ Stop location
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {routers.length === 0 && (
                  <p className="text-sm text-gray-400 col-span-full text-center py-8">
                    Aucun routeur — ajoutes-en un
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showNewRental && (
        <NewRentalModal
          routers={routers}
          onClose={() => setShowNewRental(false)}
          onDone={() => {
            setShowNewRental(false);
            load();
          }}
        />
      )}

      {showAddRouter && (
        <AddRouterModal
          onClose={() => setShowAddRouter(false)}
          onDone={() => {
            setShowAddRouter(false);
            load();
          }}
        />
      )}

      {showReturn && (
        <ReturnModal
          rental={showReturn}
          onClose={() => setShowReturn(null)}
          onDone={() => {
            setShowReturn(null);
            load();
          }}
        />
      )}

      {showLinkEsim && (
        <LinkEsimModal
          rental={showLinkEsim}
          onClose={() => setShowLinkEsim(null)}
          onDone={() => {
            setShowLinkEsim(null);
            load();
          }}
        />
      )}
    </>
  );
}

// ── Tableau locations ─────────────────────────────────────────
function RentalTable({
  rentals,
  onReturn,
  onInvoice,
  onContract,
  onYouSign,
  onLinkEsim,
  sendingContract,
}: {
  rentals: Rental[];
  onReturn: (r: Rental) => void;
  onInvoice: (r: Rental) => void;
  onContract: (r: Rental) => void;
  onYouSign: (r: Rental) => void;
  onLinkEsim: (r: Rental) => void;
  sendingContract: string | null;
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
          {rentals.map((r) => (
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
                <p className="text-gray-700">
                  {fmtDate(r.rental_start)} → {fmtDate(r.rental_end)}
                </p>
                <p className="text-xs text-gray-400">
                  {r.rental_days} jour{r.rental_days > 1 ? "s" : ""}
                </p>
              </td>

              <td className="px-4 py-3 text-right">
                <p className="font-semibold text-gray-800">
                  {r.rental_offered ? "Offerte" : fmtEur(r.rental_amount)}
                </p>
                <p className="text-xs text-gray-400">
                  {r.rental_offered
                    ? `Valeur ${fmtEur(r.original_rental_amount ?? r.rental_amount)}`
                    : r.payment_status === "paid"
                      ? "✓ Payé"
                      : "En attente"}
                </p>
              </td>

              <td className="px-4 py-3 text-right">
                <p className="text-gray-700">{fmtEur(r.deposit_amount)}</p>
                <Badge
                  label={
                    r.deposit_status === "held"
                      ? "Détenue"
                      : r.deposit_status === "refunded"
                        ? "Restituée"
                        : "Retenue"
                  }
                  color={
                    r.deposit_status === "held"
                      ? "amber"
                      : r.deposit_status === "refunded"
                        ? "green"
                        : "red"
                  }
                />
              </td>

              <td className="px-4 py-3 text-right">
                {r.order_id ? (
                  <div className="flex items-center justify-end gap-1 text-xs text-purple-600">
                    <Wifi size={11} />
                    <span>{r.esim_package_name || "eSIM liée"}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => onLinkEsim(r)}
                    className="text-xs text-gray-400 hover:text-purple-600 flex items-center gap-1 ml-auto"
                  >
                    <Wifi size={11} /> Lier
                  </button>
                )}
              </td>

              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                  <button
                    onClick={() => onInvoice(r)}
                    className="text-xs px-2 py-1 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50"
                    title="Télécharger la facture"
                  >
                    <Download size={11} />
                  </button>

                  <button
                    onClick={() => onContract(r)}
                    className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                    title="Télécharger le contrat"
                  >
                    Contrat
                  </button>

                  <button
                    onClick={() => onYouSign(r)}
                    disabled={sendingContract === r.id}
                    className="text-xs px-2 py-1 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                    title="Envoyer le lien de signature"
                  >
                    {sendingContract === r.id ? "Envoi…" : "Signature"}
                  </button>

                  {(getRentalStatus(r) === "active" || getRentalStatus(r) === "upcoming") && (
                    <button
                      onClick={() => onReturn(r)}
                      className="text-xs px-2 py-1 rounded-lg border border-green-200 text-green-700 hover:bg-green-50"
                    >
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
function NewRentalModal({
  routers,
  onClose,
  onDone,
}: {
  routers: RouterItem[];
  onClose: () => void;
  onDone: () => void;
}) {
  const todayStr = today();
  const [form, setForm] = useState({
    router_id: routers[0]?.id ?? "",
    customer_email: "",
    customer_name: "",
    customer_phone: "",
    rental_start: todayStr,
    rental_end: "",
    notes: "",
    rental_offered: false,
  });

  const [saving, setSaving] = useState(false);
  const [stripeLink, setStripeLink] = useState("");
  const [createdRentalId, setCreatedRentalId] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<
    Record<string, { available: boolean; next_available: string | null }>
  >({});

  const selectedRouter = routers.find((r) => r.id === form.router_id);

  const days =
    form.rental_start && form.rental_end
      ? Math.max(
          1,
          Math.round(
            (new Date(form.rental_end).getTime() - new Date(form.rental_start).getTime()) / 86400000
          )
        )
      : 0;

  const originalRentalAmount = days * (selectedRouter?.rental_price_per_day ?? 0);
  const rentalAmount = form.rental_offered ? 0 : originalRentalAmount;
  const totalWithDeposit = rentalAmount + DEPOSIT_AMOUNT;

  const set = (k: string, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const checkAvailability = async (start: string, end: string) => {
    if (!start || !end) return;

    setChecking(true);
    try {
      const res = await fetch("/api/admin/router-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, end }),
      });

      const data = await res.json();
      const map: Record<string, { available: boolean; next_available: string | null }> = {};

      (data.routers ?? []).forEach((r: any) => {
        map[r.id] = { available: r.available, next_available: r.next_available };
      });

      setAvailability(map);

      if (form.router_id && map[form.router_id] && !map[form.router_id].available) {
        const firstAvailable = (data.available ?? [])[0];
        if (firstAvailable) set("router_id", firstAvailable.id);
      }
    } catch {
      //
    }
    setChecking(false);
  };

  const handleSave = async () => {
    if (!form.router_id || !form.customer_email || !form.rental_start || !form.rental_end) {
      alert("Remplis tous les champs obligatoires");
      return;
    }

    if (form.rental_end <= form.rental_start) {
      alert("La date de fin doit être après la date de début");
      return;
    }

    if (availability[form.router_id] && !availability[form.router_id].available) {
      alert("Ce routeur n'est pas disponible sur cette période. Choisis un autre routeur ou des dates différentes.");
      return;
    }

    setSaving(true);

    try {
      const computedStatus = form.rental_start <= today() ? "active" : "upcoming";

      const { data: rental, error } = await supabase
        .from("router_rentals")
        .insert({
          router_id: form.router_id,
          customer_email: form.customer_email,
          customer_name: form.customer_name,
          customer_phone: form.customer_phone,
          rental_start: form.rental_start,
          rental_end: form.rental_end,
          rental_days: days,
          price_per_day: selectedRouter?.rental_price_per_day ?? 0,
          original_rental_amount: originalRentalAmount,
          rental_amount: rentalAmount,
          rental_offered: form.rental_offered,
          deposit_amount: DEPOSIT_AMOUNT,
          deposit_status: "held",
          payment_status: "pending",
          status: computedStatus,
          notes: form.notes,
        })
        .select("id")
        .single();

      if (error) throw error;

      setCreatedRentalId(rental.id);

      const stripeRes = await fetch("/api/admin/router-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_checkout", rentalId: rental.id }),
      });

      if (stripeRes.ok) {
        const { url } = await stripeRes.json();
        setStripeLink(url);
      } else {
        const err = await stripeRes.json();
        alert(`Erreur Stripe : ${err.error}`);
      }

      await supabase.from("routers").update({ status: "rented" }).eq("id", form.router_id);
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (stripeLink) {
    return (
      <Modal title="Location créée ✅" onClose={onDone}>
        <div className="text-center py-4">
          <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
          <p className="text-sm text-gray-700 mb-4">
            Location créée. Envoie ce lien au client pour le paiement :
          </p>

          <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-600 break-all mb-4">
            {stripeLink}
          </div>

          <div className="flex gap-2 justify-center">
            <button
              onClick={() => navigator.clipboard.writeText(stripeLink)}
              className="text-xs px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
            >
              Copier le lien
            </button>

            <button
              onClick={onDone}
              className="text-xs px-4 py-2 rounded-xl text-white font-medium"
              style={{ background: G }}
            >
              Terminer
            </button>
          </div>

          {createdRentalId && (
            <p className="text-[11px] text-gray-400 mt-4">
              Référence location : {createdRentalId.slice(0, 8)}
            </p>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Nouvelle location" onClose={onClose}>
      <Field label="Routeur *">
        <select value={form.router_id} onChange={(e) => set("router_id", e.target.value)} className={inputCls}>
          {routers.map((r) => {
            const avail = availability[r.id];
            const unavail = !!avail && !avail.available;

            return (
              <option key={r.id} value={r.id} disabled={unavail}>
                {unavail ? "⛔ " : form.rental_start && form.rental_end ? "✓ " : ""}
                {r.model} — {r.serial_number} ({fmtEur(r.rental_price_per_day)}/j)
                {unavail && avail.next_available
                  ? " — libre le " + new Date(avail.next_available).toLocaleDateString("fr-FR")
                  : ""}
              </option>
            );
          })}
        </select>

        {routers.length === 0 && <p className="text-xs text-red-500 mt-1">Aucun routeur enregistré</p>}
        {checking && <p className="text-xs text-gray-400 mt-1 animate-pulse">Vérification des disponibilités…</p>}

        {form.router_id && availability[form.router_id] && !availability[form.router_id].available && (
          <div className="mt-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">
            ⛔ Ce routeur est déjà loué sur cette période.
            {availability[form.router_id].next_available && (
              <span className="ml-1 font-medium">
                Libre à partir du{" "}
                {new Date(availability[form.router_id].next_available!).toLocaleDateString("fr-FR")}
              </span>
            )}
          </div>
        )}

        {form.router_id &&
          availability[form.router_id]?.available &&
          form.rental_start &&
          form.rental_end && (
            <p className="text-xs text-green-600 mt-1">✓ Disponible sur cette période</p>
          )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date début *">
          <input
            type="date"
            value={form.rental_start}
            onChange={async (e) => {
              set("rental_start", e.target.value);
              if (e.target.value && form.rental_end) await checkAvailability(e.target.value, form.rental_end);
            }}
            className={inputCls}
          />
        </Field>

        <Field label="Date fin *">
          <input
            type="date"
            value={form.rental_end}
            min={form.rental_start || today()}
            onChange={async (e) => {
              set("rental_end", e.target.value);
              if (form.rental_start && e.target.value) {
                await checkAvailability(form.rental_start, e.target.value);
              }
            }}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Email client *">
        <input
          type="email"
          value={form.customer_email}
          onChange={(e) => set("customer_email", e.target.value)}
          className={inputCls}
          placeholder="client@email.com"
        />
      </Field>

      <Field label="Nom client">
        <input
          type="text"
          value={form.customer_name}
          onChange={(e) => set("customer_name", e.target.value)}
          className={inputCls}
          placeholder="Prénom Nom"
        />
      </Field>

      <Field label="Téléphone">
        <input
          type="tel"
          value={form.customer_phone}
          onChange={(e) => set("customer_phone", e.target.value)}
          className={inputCls}
          placeholder="+689 XX XX XX XX"
        />
      </Field>

      <Field label="Offre commerciale">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.rental_offered}
            onChange={(e) => set("rental_offered", e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-700">Offrir la location du routeur</span>
        </label>
        <p className="text-xs text-gray-400 mt-1">
          Le client paiera uniquement la caution de {fmtEur(DEPOSIT_AMOUNT)}.
        </p>
      </Field>

      <Field label="Notes">
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          className={inputCls}
          rows={2}
          placeholder="Notes internes..."
        />
      </Field>

      {days > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm">
          <div className="flex justify-between mb-1">
            <span className="text-gray-500">
              Loyer théorique ({days}j × {fmtEur(selectedRouter?.rental_price_per_day ?? 0)})
            </span>
            <span className="font-medium">{fmtEur(originalRentalAmount)}</span>
          </div>

          {form.rental_offered && (
            <div className="flex justify-between mb-1">
              <span className="text-green-600">Remise commerciale</span>
              <span className="font-medium text-green-600">- {fmtEur(originalRentalAmount)}</span>
            </div>
          )}

          <div className="flex justify-between mb-1">
            <span className="text-gray-500">Loyer facturé</span>
            <span className="font-medium">{fmtEur(rentalAmount)}</span>
          </div>

          <div className="flex justify-between mb-1">
            <span className="text-gray-500">Caution (remboursable)</span>
            <span className="font-medium">{fmtEur(DEPOSIT_AMOUNT)}</span>
          </div>

          <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold">
            <span>Total à encaisser</span>
            <span style={{ color: "#A020F0" }}>{fmtEur(totalWithDeposit)}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 text-sm px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600"
        >
          Annuler
        </button>

        <button
          onClick={handleSave}
          disabled={saving || routers.length === 0}
          className="flex-1 text-sm px-4 py-2.5 rounded-xl text-white font-medium disabled:opacity-50"
          style={{ background: G }}
        >
          {saving ? "Création…" : "Créer + lien Stripe"}
        </button>
      </div>
    </Modal>
  );
}

// ── Modal : Retour routeur ─────────────────────────────────────
function ReturnModal({
  rental,
  onClose,
  onDone,
}: {
  rental: Rental;
  onClose: () => void;
  onDone: () => void;
}) {
  const [depositAction, setDepositAction] = useState<"refund" | "retain_partial" | "retain_full">("refund");
  const [retainAmount, setRetainAmount] = useState("");
  const [retainReason, setRetainReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleReturn = async () => {
    setSaving(true);

    try {
      const retained =
        depositAction === "retain_full"
          ? rental.deposit_amount
          : depositAction === "retain_partial"
            ? parseFloat(retainAmount) || 0
            : 0;

      const refunded = rental.deposit_amount - retained;

      if (rental.stripe_payment_intent && refunded > 0) {
        const refundRes = await fetch("/api/admin/router-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "refund_deposit",
            rentalId: rental.id,
            amount: refunded,
          }),
        });

        if (!refundRes.ok) {
          const err = await refundRes.json();
          const proceed = confirm(`Remboursement Stripe échoué : ${err.error}

Continuer quand même et marquer manuellement ?`);

          if (!proceed) {
            setSaving(false);
            return;
          }
        }
      }

      await supabase
        .from("router_rentals")
        .update({
          status: "completed",
          actual_return: today(),
          deposit_status:
            depositAction === "refund"
              ? "refunded"
              : depositAction === "retain_full"
                ? "fully_retained"
                : "partially_retained",
          deposit_refunded_amount: refunded,
          deposit_retained_amount: retained,
          deposit_retention_reason: retainReason || null,
          deposit_settled_at: new Date().toISOString(),
        })
        .eq("id", rental.id);

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
        <p className="font-medium text-gray-700">
          {rental.customer_name} — {rental.routers?.model}
        </p>
        <p className="text-xs text-gray-400 mt-1">Caution détenue : {fmtEur(rental.deposit_amount)}</p>
        {rental.stripe_payment_intent ? (
          <p className="text-xs text-green-600 mt-1">✓ Remboursement Stripe automatique</p>
        ) : (
          <p className="text-xs text-amber-600 mt-1">⚠ Pas de paiement Stripe — remboursement manuel</p>
        )}
      </div>

      <Field label="Caution">
        <div className="space-y-2">
          {[
            {
              key: "refund",
              label: `Restituer intégralement (${fmtEur(rental.deposit_amount)})`,
              color: "text-green-600",
            },
            { key: "retain_partial", label: "Retenue partielle", color: "text-amber-600" },
            {
              key: "retain_full",
              label: `Retenue totale (${fmtEur(rental.deposit_amount)})`,
              color: "text-red-600",
            },
          ].map((opt) => (
            <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="deposit"
                value={opt.key}
                checked={depositAction === opt.key}
                onChange={() => setDepositAction(opt.key as "refund" | "retain_partial" | "retain_full")}
              />
              <span className={`text-sm ${opt.color}`}>{opt.label}</span>
            </label>
          ))}
        </div>
      </Field>

      {depositAction === "retain_partial" && (
        <Field label="Montant retenu (€)">
          <input
            type="number"
            value={retainAmount}
            onChange={(e) => setRetainAmount(e.target.value)}
            className={inputCls}
            placeholder="Ex: 20"
            max={rental.deposit_amount}
          />
        </Field>
      )}

      {depositAction !== "refund" && (
        <Field label="Motif de retenue">
          <input
            type="text"
            value={retainReason}
            onChange={(e) => setRetainReason(e.target.value)}
            className={inputCls}
            placeholder="Ex: Câble manquant, écran rayé..."
          />
        </Field>
      )}

      <div className="flex gap-2 mt-4">
        <button
          onClick={onClose}
          className="flex-1 text-sm px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600"
        >
          Annuler
        </button>

        <button
          onClick={handleReturn}
          disabled={saving}
          className="flex-1 text-sm px-4 py-2.5 rounded-xl text-white font-medium disabled:opacity-50"
          style={{ background: G }}
        >
          {saving ? "Enregistrement…" : "Confirmer le retour"}
        </button>
      </div>
    </Modal>
  );
}

// ── Modal : Ajouter routeur ───────────────────────────────────
function AddRouterModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    model: "",
    serial_number: "",
    rental_price_per_day: "5",
    deposit_amount: "67",
    imei: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.model || !form.serial_number) {
      alert("Modèle et numéro de série requis");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("routers").insert({
      model: form.model,
      serial_number: form.serial_number,
      rental_price_per_day: parseFloat(form.rental_price_per_day),
      deposit_amount: parseFloat(form.deposit_amount),
      imei: form.imei || null,
      status: "available",
    });

    setSaving(false);

    if (error) {
      alert(`Erreur : ${error.message}`);
      return;
    }

    onDone();
  };

  return (
    <Modal title="Ajouter un routeur" onClose={onClose}>
      <Field label="Modèle *">
        <input
          type="text"
          value={form.model}
          onChange={(e) => set("model", e.target.value)}
          className={inputCls}
          placeholder="Ex: Glocalme G4 Pro"
        />
      </Field>

      <Field label="Numéro de série *">
        <input
          type="text"
          value={form.serial_number}
          onChange={(e) => set("serial_number", e.target.value)}
          className={inputCls}
          placeholder="GLC-001"
        />
      </Field>

      <Field label="IMEI">
        <input
          type="text"
          value={form.imei}
          onChange={(e) => set("imei", e.target.value)}
          className={inputCls}
          placeholder="Optionnel"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Prix/jour (€)">
          <input
            type="number"
            value={form.rental_price_per_day}
            onChange={(e) => set("rental_price_per_day", e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Caution (€)">
          <input
            type="number"
            value={form.deposit_amount}
            onChange={(e) => set("deposit_amount", e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 text-sm px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600"
        >
          Annuler
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 text-sm px-4 py-2.5 rounded-xl text-white font-medium disabled:opacity-50"
          style={{ background: G }}
        >
          {saving ? "Enregistrement…" : "Ajouter"}
        </button>
      </div>
    </Modal>
  );
}

// ── Modal : Lier eSIM ─────────────────────────────────────────
function LinkEsimModal({
  rental,
  onClose,
  onDone,
}: {
  rental: Rental;
  onClose: () => void;
  onDone: () => void;
}) {
  const [search, setSearch] = useState(rental.customer_email);
  const [orders, setOrders] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSearch = async () => {
    setSearching(true);

    const { data } = await supabase
      .from("orders")
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
      <p className="text-xs text-gray-400 mb-4">
        Associe ce routeur à une commande eSIM existante du même client
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputCls} flex-1`}
          placeholder="Email du client"
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="text-xs px-4 py-2 rounded-xl text-white font-medium"
          style={{ background: G }}
        >
          {searching ? "…" : "Chercher"}
        </button>
      </div>

      <div className="space-y-2">
        {orders.map((o) => (
          <div key={o.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">{o.package_name}</p>
              <p className="text-xs text-gray-400">
                {o.email} · {fmtDate(o.created_at)}
              </p>
            </div>

            <button
              onClick={() => handleLink(o.id)}
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              Lier
            </button>
          </div>
        ))}

        {orders.length === 0 && search && (
          <p className="text-xs text-gray-400 text-center py-4">Aucune commande trouvée</p>
        )}
      </div>
    </Modal>
  );
}

AdminRouteurs.getLayout = (page: ReactElement) => page;
