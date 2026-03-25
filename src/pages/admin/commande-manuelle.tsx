// ============================================================
// FENUA SIM – Commande manuelle eSIM (virement)
// src/pages/admin/commande-manuelle.tsx
// ============================================================

import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "@/lib/supabaseClient";
import { ChevronLeft, LogOut, Search, CheckCircle, Plus } from "lucide-react";

const ADMIN_EMAIL = "admin@fenuasim.com";
const G = "linear-gradient(135deg, #A020F0 0%, #FF4D6D 50%, #FF7F11 100%)";
const inputCls = "w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide";

interface Pkg {
  id: string; name: string; data_amount: string; data_unit: string;
  validity_days: number; validity: string;
  price_eur: number; final_price_eur: number;
  price_xpf: number; final_price_xpf: number;
  region_fr: string; region: string; country: string;
  operator_name: string;
}

function getData(p: Pkg): string {
  if (!p.data_unit || p.data_unit === "illimite" || p.data_unit === "unlimited") return "Illimite";
  if (p.data_amount) return p.data_amount + " " + (p.data_unit || "Go");
  return p.data_unit || "Illimite";
}

function getValidity(p: Pkg): string {
  if (p.validity_days) return p.validity_days + " jours";
  const v = p.validity?.toString() || p.name;
  const m = v.match(/(\d+)\s*jours?/i) || v.match(/(\d+)\s*days?/i);
  return m ? m[1] + " jours" : "";
}

function getRegion(p: Pkg): string {
  return p.region_fr || p.region || p.country || "-";
}

const fmtNum = (n: number) => {
  const s = Math.round(n * 100) / 100;
  return s.toLocaleString("fr-FR", { minimumFractionDigits: 2 });
};
const fmtEur = (n: number) => fmtNum(n) + " €";
const fmtXpf = (n: number) => Math.round(n).toLocaleString("fr-FR") + " XPF";

export default function CommandeManuelle() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  // Catalogue
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedPkg, setSelectedPkg] = useState<Pkg | null>(null);

  // Formulaire
  const [email, setEmail]         = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [phone, setPhone]         = useState("");
  const [isCompany, setIsCompany] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress]     = useState("");
  const [currency, setCurrency]   = useState<"eur" | "xpf">("eur");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [partnerCode, setPartnerCode] = useState("");
  const [notes, setNotes] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!router.isReady) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || session.user?.email !== ADMIN_EMAIL) router.push("/admin/login");
      else setAuthChecked(true);
    });
  }, [router.isReady]);

  useEffect(() => {
    if (!authChecked) return;
    (async () => {
      let all: Pkg[] = [];
      let from = 0;
      while (true) {
        const { data, error: e } = await supabase
          .from("airalo_packages")
          .select("id,name,data_amount,data_unit,validity_days,validity,price_eur,final_price_eur,price_xpf,final_price_xpf,region_fr,region,country,operator_name")
          .eq("status", "active")
          .range(from, from + 999);
        if (e || !data || data.length === 0) break;
        all = [...all, ...data];
        if (data.length < 1000) break;
        from += 1000;
      }
      setPackages(all);
    })();
  }, [authChecked]);

  // Grouper par région
  const byRegion = packages.reduce((acc, p) => {
    const r = getRegion(p);
    if (!acc[r]) acc[r] = [];
    acc[r].push(p);
    return acc;
  }, {} as Record<string, Pkg[]>);

  const allRegions = Object.keys(byRegion).sort();
  const filteredRegions = allRegions.filter(r =>
    !search || r.toLowerCase().includes(search.toLowerCase()) ||
    byRegion[r].some(p => p.name.toLowerCase().includes(search.toLowerCase()))
  );

  const regionPkgs = selectedRegion
    ? (byRegion[selectedRegion] || []).sort((a, b) => {
        const pa = a.price_xpf || a.final_price_xpf || a.price_eur || 0;
        const pb = b.price_xpf || b.final_price_xpf || b.price_eur || 0;
        return pa - pb;
      })
    : [];

  const esimPrice = selectedPkg
    ? currency === "xpf"
      ? (selectedPkg.price_xpf || selectedPkg.final_price_xpf || Math.round((selectedPkg.price_eur || selectedPkg.final_price_eur) * 119.33))
      : (selectedPkg.price_eur || selectedPkg.final_price_eur)
    : 0;

  const handleSubmit = async () => {
    if (!email || !selectedPkg || !amount) {
      setError("Email, forfait et montant sont obligatoires"); return;
    }
    if (isCompany && !companyName.trim()) {
      setError("La raison sociale est obligatoire"); return;
    }
    setLoading(true); setError("");
    try {
      const priceNum = parseFloat(amount.replace(",", "."));
      if (isNaN(priceNum) || priceNum <= 0) throw new Error("Montant invalide");

      // Insérer dans orders
      const { error: insertErr } = await supabase.from("orders").insert({
        email,
        customer_name: isCompany ? companyName : (firstName + " " + lastName).trim(),
        customer_first_name: firstName || null,
        customer_last_name: lastName || null,
        customer_phone: phone || null,
        customer_address: address || null,
        company_name: isCompany ? companyName : null,
        is_company: isCompany,
        package_id: selectedPkg.id,
        package_name: selectedPkg.name,
        price: currency === "xpf" ? priceNum : priceNum,
        currency: currency.toUpperCase(),
        status: "completed",
        source: "virement",
        payment_method: "virement",
        virement_reference: reference || null,
        partner_code: partnerCode || null,
        notes: notes || null,
        created_at: new Date(orderDate).toISOString(),
        stripe_session_id: "vir_" + Date.now().toString() + "_" + Math.random().toString(36).slice(2, 8),
      });

      if (insertErr) throw new Error(insertErr.message);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSuccess(false); setEmail(""); setSelectedPkg(null);
    setFirstName(""); setLastName(""); setPhone(""); setAddress("");
    setIsCompany(false); setCompanyName("");
    setAmount(""); setReference(""); setPartnerCode(""); setNotes("");
    setSearch(""); setSelectedRegion("");
    setOrderDate(new Date().toISOString().slice(0, 10));
  };

  if (!authChecked) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
    </div>
  );

  if (success) return (
    <>
      <Head><title>Commande enregistrée</title></Head>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-sm border border-gray-100">
          <CheckCircle size={52} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Commande enregistrée ✅</h2>
          <p className="text-sm text-gray-500 mb-6">
            La vente par virement a été ajoutée à la base de données.<br />
            Elle apparaîtra dans le dashboard et les statistiques.
          </p>
          <div className="bg-gray-50 rounded-xl px-5 py-4 text-sm text-left text-gray-600 mb-6 space-y-1">
            <p><span className="text-gray-400">Client :</span> <strong>{isCompany ? companyName : (firstName + " " + lastName).trim() || email}</strong></p>
            <p><span className="text-gray-400">Email :</span> {email}</p>
            <p><span className="text-gray-400">Forfait :</span> {selectedPkg?.name}</p>
            <p><span className="text-gray-400">Montant :</span> {currency === "xpf" ? fmtXpf(parseFloat(amount)) : fmtEur(parseFloat(amount))}</p>
            {reference && <p><span className="text-gray-400">Référence :</span> {reference}</p>}
          </div>
          <div className="flex gap-2 justify-center">
            <button onClick={reset}
              className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl text-white font-medium hover:opacity-90"
              style={{ background: G }}>
              <Plus size={14} /> Nouvelle commande
            </button>
            <a href="/admin" className="flex items-center gap-1.5 text-sm px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
              ← Admin
            </a>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Head><title>Commande manuelle — Admin FENUA SIM</title><meta name="robots" content="noindex" /></Head>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: G }}>
                <Plus size={19} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">Commande manuelle</h1>
                <p className="text-xs text-gray-400">Enregistrer une vente par virement</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a href="/admin" className="flex items-center gap-1 text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-500 hover:text-gray-800 shadow-sm">
                <ChevronLeft size={12} /> Admin
              </a>
              <button onClick={async () => { await supabase.auth.signOut(); router.push("/admin/login"); }}
                className="flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-400 hover:text-red-500 shadow-sm">
                <LogOut size={12} /> Déconnexion
              </button>
            </div>
          </div>

          <div className="space-y-5">

            {/* Client */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className={labelCls}>Client *</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isCompany} onChange={e => setIsCompany(e.target.checked)} className="rounded" />
                  <span className="text-xs text-gray-500">Société</span>
                </label>
              </div>

              {isCompany ? (
                <div>
                  <label className={labelCls}>Raison sociale *</label>
                  <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                    className={inputCls} placeholder="SAS Mon Entreprise" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Prénom</label>
                    <input value={firstName} onChange={e => setFirstName(e.target.value)}
                      className={inputCls} placeholder="Jean" />
                  </div>
                  <div>
                    <label className={labelCls}>Nom</label>
                    <input value={lastName} onChange={e => setLastName(e.target.value)}
                      className={inputCls} placeholder="Dupont" />
                  </div>
                </div>
              )}

              <div>
                <label className={labelCls}>Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className={inputCls} placeholder="client@email.com" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Téléphone</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    className={inputCls} placeholder="+689 XX XX XX XX" />
                </div>
                <div>
                  <label className={labelCls}>Adresse</label>
                  <input value={address} onChange={e => setAddress(e.target.value)}
                    className={inputCls} placeholder="Ville, Pays" />
                </div>
              </div>
            </div>

            {/* Devise */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <p className={labelCls}>Devise</p>
              <div className="flex gap-2 mt-2">
                {(["eur", "xpf"] as const).map(c => (
                  <button key={c} onClick={() => setCurrency(c)}
                    className={"flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all " + (currency === c ? "text-white border-transparent" : "text-gray-500 border-gray-200 bg-white hover:border-purple-200")}
                    style={currency === c ? { background: G } : {}}>
                    {c.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Forfait eSIM */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <p className={labelCls}>Forfait eSIM *</p>
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => { setSearch(e.target.value); setSelectedRegion(""); }}
                  className={inputCls + " pl-9"} placeholder="Rechercher une destination..." />
              </div>

              {selectedPkg && (
                <div className="mb-3 bg-purple-50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-purple-800">{selectedPkg.name}</p>
                    <p className="text-xs text-purple-500">{getData(selectedPkg)} · {getValidity(selectedPkg)} · {getRegion(selectedPkg)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-purple-600">{currency === "xpf" ? fmtXpf(esimPrice) : fmtEur(esimPrice)}</p>
                    <button onClick={() => { setSelectedPkg(null); setSelectedRegion(""); setSearch(""); }}
                      className="text-xs text-gray-400 hover:text-red-500">✕</button>
                  </div>
                </div>
              )}

              {!selectedRegion && !selectedPkg && (
                <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
                  {packages.length === 0
                    ? <p className="text-xs text-gray-400 text-center py-6">Chargement…</p>
                    : filteredRegions.length === 0
                    ? <p className="text-xs text-gray-400 text-center py-6">Aucun résultat</p>
                    : filteredRegions.map(region => (
                      <button key={region} onClick={() => { setSelectedRegion(region); setSearch(""); }}
                        className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                        <p className="text-sm font-medium text-gray-700">{region}</p>
                        <span className="text-xs text-gray-400">{byRegion[region]?.length} forfaits →</span>
                      </button>
                    ))
                  }
                </div>
              )}

              {selectedRegion && !selectedPkg && (
                <div>
                  <button onClick={() => { setSelectedRegion(""); setSearch(""); }}
                    className="flex items-center gap-1 text-xs text-purple-600 mb-2 hover:underline">
                    ← {selectedRegion}
                  </button>
                  <div className="max-h-60 overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
                    {regionPkgs.map(p => {
                      const price = currency === "xpf"
                        ? (p.price_xpf || p.final_price_xpf || Math.round((p.price_eur || p.final_price_eur || 0) * 119.33))
                        : (p.price_eur || p.final_price_eur || 0);
                      return (
                        <button key={p.id} onClick={() => {
                          setSelectedPkg(p);
                          setAmount(String(price));
                        }}
                          className="w-full text-left px-4 py-3 hover:bg-purple-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-700">{getData(p)}</p>
                              <p className="text-xs text-gray-400">{getValidity(p)}{p.operator_name ? " · " + p.operator_name : ""}</p>
                            </div>
                            <p className="text-sm font-bold text-purple-700 shrink-0 ml-4">
                              {currency === "xpf" ? fmtXpf(price) : fmtEur(price)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Paiement */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <p className={labelCls}>Paiement</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={labelCls}>Montant encaissé * ({currency.toUpperCase()})</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    className={inputCls} placeholder={currency === "xpf" ? "2000" : "16.90"} step="0.01" min="0" />
                </div>
                <div>
                  <label className={labelCls}>Date de la vente</label>
                  <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)}
                    className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Référence virement</label>
                <input value={reference} onChange={e => setReference(e.target.value)}
                  className={inputCls} placeholder="Ex: VIR-20260324-001" />
              </div>
            </div>

            {/* Optionnel */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <p className={labelCls}>Informations optionnelles</p>
              <div className="space-y-3 mt-2">
                <div>
                  <label className={labelCls}>Code partenaire</label>
                  <input value={partnerCode} onChange={e => setPartnerCode(e.target.value)}
                    className={inputCls} placeholder="Ex: MATARII" />
                </div>
                <div>
                  <label className={labelCls}>Notes internes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    className={inputCls} rows={2}
                    placeholder="Informations complémentaires..." />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">⚠️ {error}</div>
            )}

            <button onClick={handleSubmit}
              disabled={loading || !email || !selectedPkg || !amount}
              className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
              style={{ background: G }}>
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enregistrement…</>
                : "Enregistrer la vente →"
              }
            </button>

            <p className="text-xs text-gray-400 text-center pb-8">
              La commande sera visible dans le dashboard · Aucune action Airalo déclenchée
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

CommandeManuelle.getLayout = (page: ReactElement) => page;
