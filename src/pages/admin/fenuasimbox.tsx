// ============================================================
// FENUA SIM – Tunnel admin FENUASIMBOX
// src/pages/admin/fenuasimbox.tsx
// ============================================================

import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "@/lib/supabaseClient";
import {
  Package, Wifi, ChevronLeft, LogOut, CheckCircle,
  Search, Copy, ExternalLink, User, Calendar,
} from "lucide-react";

const ADMIN_EMAIL = "admin@fenuasim.com";
const G = "linear-gradient(135deg, #A020F0 0%, #FF4D6D 50%, #FF7F11 100%)";
const DEPOSIT_XPF = 12000;
const DEPOSIT_EUR = 100;

const fmtEur = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(n);
const fmtXpf = (n: number) => `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} XPF`;
const inputCls = "w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide";

interface Package {
  id: string; name: string; data_amount: string; data_unit: string;
  validity_days: number; validity: string; price_eur: number;
  final_price_eur: number; price_xpf: number; final_price_xpf: number;
  region_fr: string; region: string; type: string; country: string;
  operator_name: string; includes_voice: boolean; includes_sms: boolean;
  flag_url: string;
}

// Même logique que le tunnel partenaire
const REGION_TRANSLATIONS: Record<string, string> = {
  "Discover Global": "Monde", Asia: "Asie", Europe: "Europe", Japan: "Japon",
  "Canary Islands": "Iles Canaries", "South Korea": "Coree du Sud",
  "Hong Kong": "Hong Kong", "United States": "Etats-Unis", Australia: "Australie",
  "New Zealand": "Nouvelle-Zelande", Mexico: "Mexique", Fiji: "Fidji",
  Thailand: "Thailande", Singapore: "Singapour", Malaysia: "Malaisie",
  Indonesia: "Indonesie", Philippines: "Philippines", Vietnam: "Viet Nam",
  India: "Inde", China: "Chine", Taiwan: "Taiwan", "United Kingdom": "Royaume-Uni",
  Germany: "Allemagne", Spain: "Espagne", Italy: "Italie", Greece: "Grece",
  Portugal: "Portugal", Netherlands: "Pays-Bas", Belgium: "Belgique",
  Switzerland: "Suisse", France: "France", Canada: "Canada",
  "French Polynesia": "Polynesie francaise", UAE: "Emirats arabes unis",
  "Saudi Arabia": "Arabie saoudite", Israel: "Israel", Jordan: "Jordanie",
  Qatar: "Qatar", Brazil: "Bresil", Argentina: "Argentine", Chile: "Chili",
  Turkey: "Turquie", Egypt: "Egypte", Morocco: "Maroc",
  "South Africa": "Afrique du Sud", Oceania: "Oceanie",
  "North America": "Amerique du Nord",
  "Middle East and North Africa": "Moyen-Orient et Afrique du Nord",
};

function getFrenchName(pkg: Package): string {
  const raw = pkg.region || pkg.country || "";
  if (pkg.region_fr && pkg.region_fr !== raw) return pkg.region_fr;
  return REGION_TRANSLATIONS[raw] || raw || "-";
}

function getData(pkg: Package): string {
  if (pkg.data_unit === "illimite" || pkg.data_unit === "unlimited") return "Illimite";
  if (pkg.data_amount) return `${pkg.data_amount} ${pkg.data_unit || "Go"}`;
  return pkg.data_unit || "Illimite";
}

function getValidity(pkg: Package): string {
  if (pkg.validity_days) return `${pkg.validity_days} jours`;
  const v = pkg.validity?.toString() || pkg.name;
  const m = v.match(/(\d+)\s*jours?/i) || v.match(/(\d+)\s*days?/i);
  return m ? `${m[1]} jours` : "";
}
interface Router {
  id: string; model: string; serial_number: string;
  rental_price_per_day: number; status: string;
}

export default function AdminFenuasimBox() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  // Données
  const [packages, setPackages] = useState<Package[]>([]);
  const [routers, setRouters] = useState<Router[]>([]);

  // Formulaire client
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Forfait eSIM
  const [search, setSearch] = useState("");
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [currency, setCurrency] = useState<"eur" | "xpf">("eur");

  // Routeur
  const [withRouter, setWithRouter] = useState(true);
  const [selectedRouter, setSelectedRouter] = useState<Router | null>(null);
  const [rentalStart, setRentalStart] = useState("");
  const [rentalEnd, setRentalEnd] = useState("");

  // Résultat
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // Auth
  useEffect(() => {
    if (!router.isReady) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || session.user?.email !== ADMIN_EMAIL) router.push("/admin/login");
      else setAuthChecked(true);
    });
  }, [router.isReady]);

  // Chargement données
  useEffect(() => {
    if (!authChecked) return;
    // Chargement paginé comme le tunnel partenaire
    (async () => {
      let allData: Package[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("airalo_packages")
          .select("id, name, data_amount, data_unit, validity_days, validity, price_eur, final_price_eur, price_xpf, final_price_xpf, region_fr, region, type, country, operator_name, includes_voice, includes_sms, flag_url")
          .eq("status", "active")
          .range(from, from + pageSize - 1);
        if (error || !data || data.length === 0) break;
        allData = [...allData, ...data];
        if (data.length < pageSize) break;
        from += pageSize;
      }
      setPackages(allData);
    })();

    supabase.from("routers")
      .select("*")
      .eq("status", "available")
      .then(({ data }) => {
        setRouters(data ?? []);
        if (data?.[0]) setSelectedRouter(data[0]);
      });
  }, [authChecked]);

  const today = new Date().toISOString().slice(0, 10);

  const rentalDays = rentalStart && rentalEnd
    ? Math.max(1, Math.round((new Date(rentalEnd).getTime() - new Date(rentalStart).getTime()) / 86400000))
    : 0;

  const rentalAmount = selectedRouter && rentalDays > 0
    ? currency === "xpf"
      ? Math.round(selectedRouter.rental_price_per_day * 119.33 * rentalDays)
      : selectedRouter.rental_price_per_day * rentalDays
    : 0;

  const esimPrice = selectedPkg
    ? currency === "xpf"
      ? (selectedPkg.price_xpf || selectedPkg.final_price_xpf || Math.round((selectedPkg.price_eur || selectedPkg.final_price_eur) * 119.33))
      : (selectedPkg.price_eur || selectedPkg.final_price_eur)
    : 0;

  const deposit = withRouter && selectedRouter
    ? currency === "xpf" ? DEPOSIT_XPF : DEPOSIT_EUR
    : 0;

  const total = esimPrice + (withRouter ? rentalAmount + deposit : 0);

  // Grouper par région comme le tunnel partenaire
  const packagesByRegion = packages.reduce((acc, pkg) => {
    const region = getFrenchName(pkg);
    if (!acc[region]) acc[region] = [];
    acc[region].push(pkg);
    return acc;
  }, {} as Record<string, Package[]>);

  const allRegions = Object.keys(packagesByRegion).sort();

  const filteredRegions = allRegions.filter(r =>
    !search || r.toLowerCase().includes(search.toLowerCase())
  );

  // Filtrer les packages de la région sélectionnée
  const regionPackages = selectedRegion
    ? (packagesByRegion[selectedRegion] || []).sort((a, b) => {
        const pa = a.price_xpf || a.final_price_xpf || a.price_eur || 0;
        const pb = b.price_xpf || b.final_price_xpf || b.price_eur || 0;
        return pa - pb;
      })
    : [];

  // Pour la recherche directe de forfait par nom
  const filteredPackages = search && !selectedRegion
    ? packages.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) ||
        getFrenchName(p).toLowerCase().includes(search.toLowerCase()))
    : regionPackages;

  const handleSubmit = async () => {
    if (!firstName || !lastName || !email || !selectedPkg) {
      setError("Remplis tous les champs obligatoires"); return;
    }
    if (withRouter && (!selectedRouter || !rentalStart || !rentalEnd)) {
      setError("Sélectionne un routeur et des dates"); return;
    }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/fenuasimbox-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientFirstName: firstName, clientLastName: lastName,
          clientEmail: email, clientPhone: phone,
          packageId: selectedPkg.id, currency,
          routerId: withRouter ? selectedRouter?.id : null,
          rentalStart: withRouter ? rentalStart : null,
          rentalEnd: withRouter ? rentalEnd : null,
          rentalDays: withRouter ? rentalDays : 0,
          rentalAmount: withRouter ? rentalAmount : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      setError(err.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const buildDevis = () => ({
    firstName, lastName, email, phone,
    packageName: selectedPkg?.name ?? "",
    packageData: selectedPkg ? getData(selectedPkg) : "",
    packageValidity: selectedPkg ? getValidity(selectedPkg) : "",
    currency,
    esimPrice,
    withRouter,
    routerModel: selectedRouter?.model ?? "",
    rentalStart, rentalEnd, rentalDays,
    rentalAmount,
    deposit,
    total,
    paymentUrl: result?.url ?? "",
  });

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await fetch("/api/admin/fenuasimbox-devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pdf", devis: buildDevis() }),
      });
      if (!res.ok) throw new Error("Erreur PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "devis-fenuasimbox.pdf"; a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { alert("Erreur : " + err.message); }
    finally { setDownloadingPdf(false); }
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      const res = await fetch("/api/admin/fenuasimbox-devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "email", devis: buildDevis() }),
      });
      if (!res.ok) throw new Error("Erreur email");
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 3000);
    } catch (err: any) { alert("Erreur : " + err.message); }
    finally { setSendingEmail(false); }
  };

  const handleCopy = () => {
    if (!result?.url) return;
    navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!authChecked) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
    </div>
  );

  // ── Écran succès
  if (result) return (
    <>
      <Head><title>FENUASIMBOX — Lien créé</title></Head>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-lg w-full text-center shadow-sm border border-gray-100">
          <CheckCircle size={52} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Lien de paiement créé ✅</h2>
          <p className="text-sm text-gray-500 mb-4">
            Notification envoyée à <strong>hello@fenuasim.com</strong>.<br />
            Envoie ce lien à <strong>{email}</strong>.
          </p>

          <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-600 break-all mb-5 text-left">
            {result.url}
          </div>

          {/* Actions lien */}
          <div className="flex gap-2 justify-center mb-5">
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 text-sm px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
              <Copy size={14} /> {copied ? "Copié !" : "Copier le lien"}
            </button>
            <a href={result.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl text-white font-medium hover:opacity-90"
              style={{ background: G }}>
              <ExternalLink size={14} /> Ouvrir
            </a>
          </div>

          {/* Devis */}
          <div className="border-t border-gray-100 my-4" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Devis client</p>
          <div className="flex gap-2 justify-center mb-6">
            <button onClick={handleDownloadPdf} disabled={downloadingPdf}
              className="flex items-center gap-1.5 text-sm px-4 py-2.5 border border-purple-200 rounded-xl text-purple-700 hover:bg-purple-50 disabled:opacity-50 transition-colors">
              {downloadingPdf
                ? <><div className="w-3.5 h-3.5 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /> Génération…</>
                : <><Download size={13} /> Télécharger PDF</>
              }
            </button>
            <button onClick={handleSendEmail} disabled={sendingEmail || emailSent}
              className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl text-white font-medium disabled:opacity-70 hover:opacity-90 transition-all"
              style={{ background: emailSent ? "#16a34a" : G }}>
              {emailSent
                ? "✓ Email envoyé !"
                : sendingEmail
                ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi…</>
                : "📧 Envoyer au client"
              }
            </button>
          </div>

          <button onClick={() => {
            setResult(null); setFirstName(""); setLastName(""); setEmail(""); setPhone("");
            setSelectedPkg(null); setSearch(""); setSelectedRegion(""); setRentalStart(""); setRentalEnd("");
            setEmailSent(false);
          }} className="text-xs text-gray-400 hover:text-gray-600">
            ← Créer un nouveau dossier
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Head><title>FENUASIMBOX — Admin FENUA SIM</title><meta name="robots" content="noindex" /></Head>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: G }}>
                <Package size={19} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">
                  <span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FENUASIM</span>
                  <span className="text-gray-300 mx-1">·</span>
                  <span className="text-gray-700">BOX</span>
                </h1>
                <p className="text-xs text-gray-400">Créer un dossier client</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a href="/admin"
                className="flex items-center gap-1 text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-500 hover:text-gray-800 shadow-sm">
                <ChevronLeft size={12} /> Admin
              </a>
              <button onClick={async () => { await supabase.auth.signOut(); router.push("/admin/login"); }}
                className="flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-400 hover:text-red-500 shadow-sm">
                <LogOut size={12} /> Déconnexion
              </button>
            </div>
          </div>

          <div className="space-y-5">

            {/* 1. Infos client */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: G }}>
                  <User size={13} className="text-white" />
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Client</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={labelCls}>Prénom *</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputCls} placeholder="Jean" />
                </div>
                <div>
                  <label className={labelCls}>Nom *</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} className={inputCls} placeholder="Dupont" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Email *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="jean@email.com" />
                </div>
                <div>
                  <label className={labelCls}>Téléphone</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} placeholder="+689..." />
                </div>
              </div>
            </div>

            {/* 2. Devise */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Devise</p>
              <div className="flex gap-2">
                {(["eur", "xpf"] as const).map(c => (
                  <button key={c} onClick={() => setCurrency(c)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${currency === c ? "text-white border-transparent" : "text-gray-500 border-gray-200 bg-white hover:border-purple-200"}`}
                    style={currency === c ? { background: G } : {}}>
                    {c.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Forfait eSIM */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: G }}>
                  <Wifi size={13} className="text-white" />
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Forfait eSIM *</p>
              </div>

              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  className={`${inputCls} pl-9`} placeholder="Rechercher par nom ou destination..." />
              </div>

              {selectedPkg && (
                <div className="mb-3 bg-purple-50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-purple-800">{selectedPkg.name}</p>
                    <p className="text-xs text-purple-500">{getData(selectedPkg)} · {getValidity(selectedPkg)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-purple-700">
                      {currency === "xpf" ? fmtXpf(esimPrice) : fmtEur(esimPrice)}
                    </p>
                    <button onClick={() => { setSelectedPkg(null); setSelectedRegion(""); }}
                      className="text-xs text-gray-400 hover:text-red-500">✕</button>
                  </div>
                </div>
              )}

              {!selectedRegion && !selectedPkg && (
                <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
                  {filteredRegions.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">Aucune destination trouvée</p>
                  ) : filteredRegions.map(region => (
                    <button key={region} onClick={() => { setSelectedRegion(region); setSearch(""); }}
                      className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <p className="text-sm font-medium text-gray-700">{region}</p>
                      <span className="text-xs text-gray-400">{packagesByRegion[region]?.length} forfaits →</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedRegion && !selectedPkg && (
                <div>
                  <button onClick={() => { setSelectedRegion(""); setSearch(""); }}
                    className="flex items-center gap-1 text-xs text-purple-600 mb-2 hover:underline">
                    ← {selectedRegion}
                  </button>
                  <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
                    {regionPackages.map(p => {
                      const price = currency === "xpf"
                        ? (p.price_xpf || p.final_price_xpf || Math.round((p.price_eur || p.final_price_eur || 0) * 119.33))
                        : (p.price_eur || p.final_price_eur || 0);
                      return (
                        <button key={p.id} onClick={() => setSelectedPkg(p)}
                          className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-700">{getData(p)}</p>
                              <p className="text-xs text-gray-400">{getValidity(p)} · {p.operator_name}</p>
                              <div className="flex gap-1 mt-1">
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${p.includes_voice ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"}`}>
                                  {p.includes_voice ? "Appels" : "Sans appels"}
                                </span>
                              </div>
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

            {/* 4. Routeur */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: G }}>
                    <Package size={13} className="text-white" />
                  </div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Routeur FENUASIMBOX</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={withRouter} onChange={e => setWithRouter(e.target.checked)} className="rounded" />
                  <span className="text-xs text-gray-500">Inclure</span>
                </label>
              </div>

              {withRouter && (
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Routeur</label>
                    <select value={selectedRouter?.id || ""} onChange={e => setSelectedRouter(routers.find(r => r.id === e.target.value) || null)} className={inputCls}>
                      {routers.length === 0
                        ? <option value="">Aucun routeur disponible</option>
                        : routers.map(r => <option key={r.id} value={r.id}>{r.model} — S/N {r.serial_number}</option>)
                      }
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-lg flex items-center justify-center shrink-0" style={{ background: G }}>
                      <Calendar size={9} className="text-white" />
                    </div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Dates de location</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Arrivée</label>
                      <input type="date" value={rentalStart} min={today} onChange={e => setRentalStart(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Départ</label>
                      <input type="date" value={rentalEnd} min={rentalStart || today} onChange={e => setRentalEnd(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  {rentalDays > 0 && selectedRouter && (
                    <div className="bg-orange-50 rounded-xl px-4 py-3 space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Location ({rentalDays}j × {currency === "xpf" ? fmtXpf(selectedRouter.rental_price_per_day * 119.33) : fmtEur(selectedRouter.rental_price_per_day)})</span>
                        <span className="font-medium text-gray-700">{currency === "xpf" ? fmtXpf(rentalAmount) : fmtEur(rentalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Caution (remboursable)</span>
                        <span className="font-medium text-gray-700">{currency === "xpf" ? fmtXpf(DEPOSIT_XPF) : fmtEur(DEPOSIT_EUR)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Récap total */}
            {selectedPkg && (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Récapitulatif</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">eSIM — {selectedPkg.name}</span>
                    <span className="font-medium">{currency === "xpf" ? fmtXpf(esimPrice) : fmtEur(esimPrice)}</span>
                  </div>
                  {withRouter && rentalDays > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Location routeur ({rentalDays}j)</span>
                        <span className="font-medium">{currency === "xpf" ? fmtXpf(rentalAmount) : fmtEur(rentalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Caution (remboursable)</span>
                        <span className="font-medium">{currency === "xpf" ? fmtXpf(DEPOSIT_XPF) : fmtEur(DEPOSIT_EUR)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
                    <span>Total</span>
                    <span style={{ color: "#A020F0" }}>{currency === "xpf" ? fmtXpf(total) : fmtEur(total)}</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">⚠️ {error}</div>
            )}

            <button onClick={handleSubmit} disabled={loading || !selectedPkg || !firstName || !email}
              className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
              style={{ background: G }}>
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Création du lien…</>
                : "Générer le lien de paiement →"
              }
            </button>

            <p className="text-xs text-gray-400 text-center pb-8">
              Un email de notification sera envoyé à hello@fenuasim.com · L'eSIM sera commandée automatiquement via Airalo à la réception du paiement
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

AdminFenuasimBox.getLayout = (page: ReactElement) => page;
