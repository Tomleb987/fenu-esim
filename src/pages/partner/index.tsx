// src/pages/partner/index.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "@/lib/supabaseClient";

interface AiraloPackage {
  id: string;
  name: string;
  data_amount?: string;
  data_unit?: string;
  validity_days?: number;
  price_xpf?: number;
  final_price_xpf?: number;
  price_eur?: number;
  final_price_eur?: number;
  currency?: string;
  status?: string;
  country?: string;
  region?: string;
  region_fr?: string;
  operator_name?: string;
  flag_url?: string;
  type?: string;
  validity?: string;
}

interface PartnerOrder {
  id: string;
  client_name: string;
  client_email: string;
  package_name: string;
  amount: number;
  currency: string;
  status: string;
  payment_url: string;
  esim_iccid?: string;
  created_at: string;
}

type Step = "destination" | "forfait" | "client" | "recap" | "lien";

// ── Traductions (même map que shop.tsx)
const REGION_TRANSLATIONS: Record<string, string> = {
  "Discover Global": "Monde", "Asia": "Asie", "Europe": "Europe",
  "Japan": "Japon", "Canary Islands": "Îles Canaries", "South Korea": "Corée du Sud",
  "Hong Kong": "Hong Kong", "United States": "États-Unis", "Australia": "Australie",
  "New Zealand": "Nouvelle-Zélande", "Mexico": "Mexique", "Fiji": "Fidji",
  "Thailand": "Thaïlande", "Singapore": "Singapour", "Malaysia": "Malaisie",
  "Indonesia": "Indonésie", "Philippines": "Philippines", "Vietnam": "Viêt Nam",
  "India": "Inde", "China": "Chine", "Taiwan": "Taïwan",
  "United Kingdom": "Royaume-Uni", "Germany": "Allemagne", "Spain": "Espagne",
  "Italy": "Italie", "Greece": "Grèce", "Portugal": "Portugal",
  "Netherlands": "Pays-Bas", "Belgium": "Belgique", "Switzerland": "Suisse",
  "Austria": "Autriche", "Poland": "Pologne", "Czech Republic": "République tchèque",
  "Turkey": "Turquie", "Egypt": "Égypte", "Morocco": "Maroc",
  "South Africa": "Afrique du Sud", "Brazil": "Brésil", "Argentina": "Argentine",
  "Chile": "Chili", "Colombia": "Colombie", "Peru": "Pérou",
  "UAE": "Émirats arabes unis", "United Arab Emirates": "Émirats arabes unis",
  "Saudi Arabia": "Arabie saoudite", "Israel": "Israël", "Jordan": "Jordanie",
  "Qatar": "Qatar", "Kuwait": "Koweït", "Bahrain": "Bahreïn", "Oman": "Oman",
  "Canada": "Canada", "France": "France", "Lebanon": "Liban",
  "Albania": "Albanie", "Algeria": "Algérie", "Angola": "Angola",
  "Armenia": "Arménie", "Bangladesh": "Bangladesh", "Belarus": "Biélorussie",
  "Bolivia": "Bolivie", "Bosnia and Herzegovina": "Bosnie-Herzégovine",
  "Bulgaria": "Bulgarie", "Cambodia": "Cambodge", "Cameroon": "Cameroun",
  "Croatia": "Croatie", "Cuba": "Cuba", "Cyprus": "Chypre",
  "Denmark": "Danemark", "Dominican Republic": "République dominicaine",
  "Ecuador": "Équateur", "Estonia": "Estonie", "Ethiopia": "Éthiopie",
  "Finland": "Finlande", "Georgia": "Géorgie", "Ghana": "Ghana",
  "Guatemala": "Guatemala", "Hungary": "Hongrie", "Iceland": "Islande",
  "Ireland": "Irlande", "Kazakhstan": "Kazakhstan", "Kenya": "Kenya",
  "Laos": "Laos", "Latvia": "Lettonie", "Lithuania": "Lituanie",
  "Luxembourg": "Luxembourg", "Madagascar": "Madagascar", "Maldives": "Maldives",
  "Malta": "Malte", "Mauritius": "Maurice", "Moldova": "Moldavie",
  "Mongolia": "Mongolie", "Montenegro": "Monténégro", "Myanmar": "Myanmar",
  "Namibia": "Namibie", "Nepal": "Népal", "Nigeria": "Nigeria",
  "Norway": "Norvège", "Pakistan": "Pakistan", "Panama": "Panama",
  "Romania": "Roumanie", "Russia": "Russie", "Rwanda": "Rwanda",
  "Senegal": "Sénégal", "Serbia": "Serbie", "Slovakia": "Slovaquie",
  "Slovenia": "Slovénie", "Sri Lanka": "Sri Lanka", "Sweden": "Suède",
  "Tanzania": "Tanzanie", "Tunisia": "Tunisie", "Ukraine": "Ukraine",
  "Uruguay": "Uruguay", "Venezuela": "Venezuela", "Zambia": "Zambie",
  "Oceania": "Océanie", "North America": "Amérique du Nord",
  "Middle East and North Africa": "Moyen-Orient et Afrique du Nord",
  "French Polynesia": "Polynésie française",
};

const TOP_DESTINATIONS = ["France", "Canada", "États-Unis", "Australie", "Nouvelle-Zélande", "Japon", "Europe"];

function getFrenchName(pkg: AiraloPackage): string {
  const raw = pkg.region || pkg.country || "";
  if (pkg.region_fr && pkg.region_fr !== raw) return pkg.region_fr;
  return REGION_TRANSLATIONS[raw] || raw || "—";
}

export default function PartnerDashboard() {
  const router = useRouter();
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("destination");
  const [packages, setPackages] = useState<AiraloPackage[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedPackage, setSelectedPackage] = useState<AiraloPackage | null>(null);
  const [clientForm, setClientForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [generatedLink, setGeneratedLink] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState("");
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [activeTab, setActiveTab] = useState<"new" | "orders">("new");
  const [searchQuery, setSearchQuery] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/partner/login"); return; }
      const { data: profile } = await supabase.from("partner_profiles").select("*").eq("email", session.user.email).single();
      if (!profile || !profile.is_active) { await supabase.auth.signOut(); router.push("/partner/login?error=unauthorized"); return; }
      setPartnerProfile(profile);
      setLoading(false);
      loadPackages();
      loadOrders(profile.partner_code);
    };
    checkAuth();
  }, []);

  const loadPackages = async () => {
    const { data } = await supabase
      .from("airalo_packages")
      .select("id, name, data_amount, data_unit, validity_days, validity, price_xpf, final_price_xpf, price_eur, final_price_eur, currency, status, country, region, region_fr, operator_name, flag_url, type")
      .eq("status", "active")
      .order("final_price_eur", { ascending: true });
    if (data) setPackages(data);
  };

  const loadOrders = async (partnerCode: string) => {
    const { data } = await supabase.from("partner_orders_view").select("*").eq("partner_code", partnerCode).order("created_at", { ascending: false }).limit(50);
    if (data) setOrders(data as PartnerOrder[]);
  };

  // ── Grouper les packages par destination (comme shop.tsx)
  const packagesByRegion = packages.reduce((acc, pkg) => {
    const region = getFrenchName(pkg);
    if (!acc[region]) acc[region] = [];
    acc[region].push(pkg);
    return acc;
  }, {} as Record<string, AiraloPackage[]>);

  const regionStats = Object.entries(packagesByRegion).reduce((acc, [region, pkgs]) => {
    const prices = pkgs.map(p => p.price_eur || p.final_price_eur || 0).filter(p => p > 0);
    const pricesXpf = pkgs.map(p => p.price_xpf || p.final_price_xpf || 0).filter(p => p > 0);
    acc[region] = {
      minPriceXpf: pricesXpf.length > 0 ? Math.min(...pricesXpf) : 0,
      packageCount: pkgs.length,
      operatorName: pkgs[0]?.operator_name || "—",
      flagUrl: pkgs[0]?.flag_url || "",
      maxDays: Math.max(...pkgs.map(p => parseInt((p.validity || p.validity_days?.toString() || "0").split(' ')[0]) || 0)),
    };
    return acc;
  }, {} as Record<string, { minPriceXpf: number; packageCount: number; operatorName: string; flagUrl: string; maxDays: number }>);

  const allRegions = Object.keys(packagesByRegion).sort((a, b) => (regionStats[a]?.minPriceXpf || 0) - (regionStats[b]?.minPriceXpf || 0));

  const filteredRegions = allRegions.filter(region =>
    !searchQuery || region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topRegions = filteredRegions.filter(r => TOP_DESTINATIONS.some(t => t.toLowerCase() === r.toLowerCase()));
  const otherRegions = filteredRegions.filter(r => !TOP_DESTINATIONS.some(t => t.toLowerCase() === r.toLowerCase()));

  const regionPackages = selectedRegion ? (packagesByRegion[selectedRegion] || []) : [];

  const getValidity = (pkg: AiraloPackage) => {
    if (pkg.validity_days) return `${pkg.validity_days} jours`;
    const v = pkg.validity?.toString() || pkg.name;
    const m = v.match(/(\d+)\s*jours?/i) || v.match(/(\d+)\s*days?/i);
    return m ? `${m[1]} jours` : "";
  };

  const getData = (pkg: AiraloPackage) => {
    if (pkg.data_unit === "illimité" || pkg.data_unit === "unlimited") return "Illimité";
    if (pkg.data_amount) return `${pkg.data_amount} ${pkg.data_unit || "Go"}`;
    return pkg.data_unit || "Illimité";
  };

  const formatPrice = (pkg: AiraloPackage) => {
    const price = pkg.price_xpf || pkg.final_price_xpf || pkg.price_eur || pkg.final_price_eur || 0;
    return `${Math.round(price).toLocaleString("fr")} XPF`;
  };

  const generateLink = async () => {
    if (!selectedPackage || !clientForm.firstName || !clientForm.lastName || !clientForm.email) { setFormError("Veuillez remplir tous les champs obligatoires."); return; }
    setFormError(""); setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/create-payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ packageId: selectedPackage.id, clientFirstName: clientForm.firstName, clientLastName: clientForm.lastName, clientEmail: clientForm.email, clientPhone: clientForm.phone }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur serveur");
      setGeneratedLink(data.paymentUrl);
      setStep("lien");
      if (partnerProfile) loadOrders(partnerProfile.partner_code);
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la génération du lien.");
    } finally { setGenerating(false); }
  };

  const sendPaymentLinkEmail = async () => {
    if (!generatedLink || !clientForm.email) return;
    setSendingEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch("/api/partner/send-payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          clientEmail: clientForm.email, clientFirstName: clientForm.firstName, clientLastName: clientForm.lastName,
          packageName: selectedPackage?.name, destination: selectedRegion, dataAmount: selectedPackage ? getData(selectedPackage) : "",
          validityDays: selectedPackage ? getValidity(selectedPackage) : "",
          amount: selectedPackage?.price_xpf || selectedPackage?.price_eur || 0,
          currency: "xpf", paymentUrl: generatedLink, advisorName: partnerProfile?.advisor_name,
        }),
      });
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 3000);
    } catch (err) { console.error("Erreur envoi email:", err); }
    finally { setSendingEmail(false); }
  };

  const copyLink = async () => { await navigator.clipboard.writeText(generatedLink); setCopied(true); setTimeout(() => setCopied(false), 2500); };

  const sendViaWhatsApp = () => {
    const msg = `Bonjour ${clientForm.firstName}, voici votre lien de paiement sécurisé pour votre eSIM FenuaSIM :\n${generatedLink}`;
    window.open(`https://wa.me/${clientForm.phone?.replace(/\s/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const resetForm = () => { setStep("destination"); setSelectedRegion(""); setSelectedPackage(null); setClientForm({ firstName: "", lastName: "", email: "", phone: "" }); setGeneratedLink(""); setFormError(""); setSearchQuery(""); };

  const stepLabels = ["Destination", "Forfait", "Client", "Récap", "Lien"];
  const stepKeys: Step[] = ["destination", "forfait", "client", "recap", "lien"];
  const currentStepIdx = stepKeys.indexOf(step);

  const statusLabel: Record<string, { label: string; style: string }> = {
    pending: { label: "⏳ En attente", style: "bg-amber-100 text-amber-700" },
    paid: { label: "💳 Payé", style: "bg-blue-100 text-blue-700" },
    esim_sent: { label: "✓ eSIM envoyée", style: "bg-green-100 text-green-700" },
    error: { label: "✗ Erreur", style: "bg-red-100 text-red-700" },
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-500 text-sm">Chargement...</p></div>
    </div>
  );

  return (
    <>
      <Head><title>Espace Partenaire — FenuaSIM</title></Head>
      <div className="min-h-screen bg-gray-50 flex">

        {/* Sidebar */}
        <aside className="w-56 bg-[#0a4a6e] flex flex-col shrink-0">
          <div className="px-5 py-6 border-b border-white/10">
            <span className="text-white font-semibold text-lg">Fenua<span className="text-cyan-400">SIM</span></span>
            <p className="text-white/50 text-xs mt-1">Espace partenaire</p>
          </div>
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-white text-sm font-medium">{partnerProfile?.advisor_name}</p>
            <p className="text-white/50 text-xs mt-0.5">Code : {partnerProfile?.partner_code}</p>
          </div>
          <nav className="flex-1 py-3">
            <button onClick={() => { setActiveTab("new"); resetForm(); }} className={`w-full text-left px-5 py-2.5 text-sm flex items-center gap-2.5 border-l-2 transition-all ${activeTab === "new" ? "border-cyan-400 bg-white/10 text-white font-medium" : "border-transparent text-white/60 hover:text-white hover:bg-white/5"}`}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
              Nouvelle commande
            </button>
            <button onClick={() => setActiveTab("orders")} className={`w-full text-left px-5 py-2.5 text-sm flex items-center gap-2.5 border-l-2 transition-all ${activeTab === "orders" ? "border-cyan-400 bg-white/10 text-white font-medium" : "border-transparent text-white/60 hover:text-white hover:bg-white/5"}`}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg>
              Mes commandes
            </button>
          </nav>
          <div className="p-4">
            <button onClick={async () => { await supabase.auth.signOut(); router.push("/partner/login"); }} className="w-full py-2 text-xs text-white/50 hover:text-white border border-white/10 rounded-lg transition-colors">Déconnexion</button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col overflow-auto">
          <header className="bg-white border-b border-gray-200 px-8 h-14 flex items-center justify-between shrink-0">
            <h1 className="font-semibold text-gray-800">{activeTab === "new" ? "Nouvelle commande" : "Mes commandes"}</h1>
            <span className="text-xs text-green-600 font-medium flex items-center gap-1.5"><span className="w-2 h-2 bg-green-500 rounded-full inline-block" />Connecté</span>
          </header>

          <div className="p-8 flex-1">

            {/* ── TAB NOUVELLE COMMANDE */}
            {activeTab === "new" && (
              <div className="max-w-4xl mx-auto">

                {/* Stepper */}
                <div className="flex items-center mb-8">
                  {stepKeys.map((s, i) => {
                    const done = i < currentStepIdx;
                    const active = i === currentStepIdx;
                    return (
                      <div key={s} className="flex items-center">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${done ? "bg-[#0a4a6e] border-[#0a4a6e] text-white" : active ? "bg-cyan-400 border-cyan-400 text-white" : "border-gray-300 text-gray-400"}`}>
                            {done ? "✓" : i + 1}
                          </div>
                          <span className={`text-sm hidden sm:block ${active ? "text-[#0a4a6e] font-medium" : done ? "text-gray-600" : "text-gray-400"}`}>{stepLabels[i]}</span>
                        </div>
                        {i < stepKeys.length - 1 && <div className={`mx-3 h-0.5 w-8 sm:w-12 flex-shrink-0 ${done ? "bg-[#0a4a6e]" : "bg-gray-200"}`} />}
                      </div>
                    );
                  })}
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">

                  {/* ── ÉTAPE 1 : DESTINATION */}
                  {step === "destination" && (
                    <div className="p-6">
                      <h2 className="font-semibold text-gray-800 mb-4">Choisissez une destination</h2>

                      {/* Barre de recherche */}
                      <div className="relative mb-6">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Rechercher une destination... (ex: Japon, Europe, États-Unis)"
                          className="w-full pl-9 pr-8 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#0a4a6e]" />
                        {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg">×</button>}
                      </div>

                      {packages.length === 0 ? (
                        <p className="text-gray-400 text-sm py-8 text-center">Chargement...</p>
                      ) : filteredRegions.length === 0 ? (
                        <p className="text-gray-400 text-sm py-8 text-center">Aucune destination trouvée pour « {searchQuery} »</p>
                      ) : (
                        <>
                          {/* Top destinations */}
                          {topRegions.length > 0 && !searchQuery && (
                            <div className="mb-6">
                              <p className="text-xs font-600 text-[#0a4a6e] uppercase tracking-wide mb-3">⭐ Destinations populaires</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {topRegions.map(region => (
                                  <button key={region} onClick={() => { setSelectedRegion(region); setStep("forfait"); }}
                                    className="text-left border-2 border-[#0a4a6e]/20 bg-blue-50 rounded-xl p-3 hover:border-[#0a4a6e] hover:bg-blue-100 transition-all">
                                    <p className="font-semibold text-[#0a4a6e] text-sm">{region}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{regionStats[region]?.packageCount} forfaits</p>
                                    <p className="text-xs font-semibold text-[#0a4a6e] mt-1">
                                      dès {Math.round(regionStats[region]?.minPriceXpf || 0).toLocaleString("fr")} XPF
                                    </p>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Toutes les destinations */}
                          <div>
                            {!searchQuery && <p className="text-xs font-500 text-gray-500 uppercase tracking-wide mb-3">🌍 Toutes les destinations ({otherRegions.length})</p>}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {(searchQuery ? filteredRegions : otherRegions).map(region => (
                                <button key={region} onClick={() => { setSelectedRegion(region); setStep("forfait"); }}
                                  className="text-left border border-gray-200 rounded-lg p-3 hover:border-[#0a4a6e] hover:bg-gray-50 transition-all">
                                  <p className="font-medium text-gray-800 text-sm">{region}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">{regionStats[region]?.packageCount} forfaits</p>
                                  <p className="text-xs font-semibold text-[#0a4a6e] mt-1">
                                    dès {Math.round(regionStats[region]?.minPriceXpf || 0).toLocaleString("fr")} XPF
                                  </p>
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* ── ÉTAPE 2 : FORFAIT */}
                  {step === "forfait" && (
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-5">
                        <button onClick={() => setStep("destination")} className="text-gray-400 hover:text-gray-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                        </button>
                        <h2 className="font-semibold text-gray-800">Forfaits — {selectedRegion}</h2>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{regionPackages.length} forfaits</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 max-h-96 overflow-y-auto pr-1">
                        {regionPackages.map(pkg => (
                          <button key={pkg.id} onClick={() => setSelectedPackage(pkg)}
                            className={`relative text-left border-2 rounded-xl p-4 transition-all ${selectedPackage?.id === pkg.id ? "border-[#0a4a6e] bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                            {selectedPackage?.id === pkg.id && <span className="absolute top-2 right-2 text-[#0a4a6e] font-bold">✓</span>}
                            <div className="flex items-start justify-between pr-6">
                              <div>
                                <p className="font-semibold text-gray-800 text-sm">{getData(pkg)}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{getValidity(pkg)}</p>
                                {pkg.operator_name && <p className="text-xs text-gray-400 mt-0.5">{pkg.operator_name}</p>}
                              </div>
                              <p className="text-sm font-bold text-[#0a4a6e] shrink-0">{formatPrice(pkg)}</p>
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="flex justify-end">
                        <button onClick={() => setStep("client")} disabled={!selectedPackage}
                          className="bg-[#0a4a6e] text-white px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-[#0e6899] transition-colors">
                          Suivant →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── ÉTAPE 3 : CLIENT */}
                  {step === "client" && (
                    <div className="p-6">
                      <h2 className="font-semibold text-gray-800 mb-4">Informations du client</h2>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1.5">Prénom *</label>
                          <input type="text" value={clientForm.firstName} onChange={e => setClientForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Marie" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0a4a6e]" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1.5">Nom *</label>
                          <input type="text" value={clientForm.lastName} onChange={e => setClientForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Dupont" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0a4a6e]" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1.5">Email *</label>
                          <input type="email" value={clientForm.email} onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))} placeholder="marie.dupont@email.com" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0a4a6e]" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1.5">Téléphone <span className="text-gray-400">(optionnel, pour WhatsApp)</span></label>
                          <input type="tel" value={clientForm.phone} onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))} placeholder="+689 87 XX XX XX" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0a4a6e]" />
                        </div>
                      </div>
                      <div className="border-2 border-[#0a4a6e] rounded-xl p-4 bg-blue-50 mb-4">
                        <div className="flex items-start gap-3">
                          <input type="radio" checked readOnly className="mt-0.5 accent-[#0a4a6e]" />
                          <div>
                            <p className="text-sm font-semibold text-gray-800">🔗 Lien de paiement sécurisé (Stripe)</p>
                            <p className="text-xs text-gray-500 mt-0.5">Un lien est généré et envoyé au client. Il règle depuis son appareil. Aucune carte bancaire ne transite par vous.</p>
                          </div>
                        </div>
                      </div>
                      {formError && <p className="text-red-500 text-xs mb-3">{formError}</p>}
                      <div className="flex justify-between">
                        <button onClick={() => setStep("forfait")} className="px-5 py-2.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors">← Retour</button>
                        <button onClick={() => {
                          if (!clientForm.firstName || !clientForm.lastName || !clientForm.email) { setFormError("Prénom, nom et email sont obligatoires."); return; }
                          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientForm.email)) { setFormError("Email invalide."); return; }
                          setFormError(""); setStep("recap");
                        }} className="bg-[#0a4a6e] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0e6899] transition-colors">Suivant →</button>
                      </div>
                    </div>
                  )}

                  {/* ── ÉTAPE 4 : RÉCAPITULATIF */}
                  {step === "recap" && selectedPackage && (
                    <div className="p-6">
                      <h2 className="font-semibold text-gray-800 mb-4">Récapitulatif</h2>
                      <div className="bg-gray-50 rounded-xl p-4 mb-5 divide-y divide-gray-200">
                        {[
                          ["Client", `${clientForm.firstName} ${clientForm.lastName}`],
                          ["Email", clientForm.email],
                          ["Téléphone", clientForm.phone || "—"],
                          ["Destination", selectedRegion],
                          ["Forfait", selectedPackage.name],
                          ["Données", getData(selectedPackage)],
                          ["Validité", getValidity(selectedPackage)],
                        ].map(([label, value]) => (
                          <div key={label} className="flex justify-between py-2.5 text-sm">
                            <span className="text-gray-400">{label}</span>
                            <span className="text-gray-700 font-medium">{value}</span>
                          </div>
                        ))}
                        <div className="flex justify-between py-3 text-base">
                          <span className="text-gray-500 font-medium">Total</span>
                          <span className="font-bold text-[#0a4a6e]">{formatPrice(selectedPackage)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mb-5">Un lien de paiement Stripe sera généré instantanément, valable 24h. Une fois payé, le QR code eSIM sera envoyé automatiquement à {clientForm.email}.</p>
                      {formError && <p className="text-red-500 text-xs mb-3">{formError}</p>}
                      <div className="flex justify-between">
                        <button onClick={() => setStep("client")} className="px-5 py-2.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors">← Retour</button>
                        <button onClick={generateLink} disabled={generating}
                          className="bg-[#0a4a6e] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0e6899] transition-colors disabled:opacity-60 flex items-center gap-2">
                          {generating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Génération...</> : "Générer le lien de paiement"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── ÉTAPE 5 : LIEN GÉNÉRÉ */}
                  {step === "lien" && (
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <h2 className="text-xl font-semibold text-gray-800 mb-1">Lien de paiement prêt !</h2>
                      <p className="text-gray-500 text-sm mb-6">Partagez ce lien avec <strong>{clientForm.firstName} {clientForm.lastName}</strong>.<br/>Une fois payé, l'eSIM sera envoyée automatiquement à {clientForm.email}.</p>
                      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-5 max-w-lg mx-auto">
                        <span className="flex-1 font-mono text-xs text-[#0a4a6e] truncate text-left">{generatedLink}</span>
                        <button onClick={copyLink} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${copied ? "bg-green-600 text-white" : "bg-[#0a4a6e] text-white hover:bg-[#0e6899]"}`}>
                          {copied ? "✓ Copié" : "Copier"}
                        </button>
                      </div>
                      <div className="flex gap-3 justify-center flex-wrap mb-6">
                        <button onClick={sendPaymentLinkEmail} disabled={sendingEmail}
                          className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${emailSent ? "border-green-500 text-green-600 bg-green-50" : "border-gray-300 text-gray-700 hover:border-[#0a4a6e] hover:text-[#0a4a6e]"} disabled:opacity-60`}>
                          {emailSent ? <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>Email envoyé !</>
                            : sendingEmail ? <><div className="w-4 h-4 border-2 border-gray-300 border-t-[#0a4a6e] rounded-full animate-spin"/>Envoi...</>
                            : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>Envoyer par email</>}
                        </button>
                        {clientForm.phone && (
                          <button onClick={sendViaWhatsApp} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-green-500 hover:text-green-600 transition-colors">
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.525 5.847L.057 24l6.306-1.54A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.007-1.374l-.36-.214-3.722.909.944-3.619-.234-.372A9.818 9.818 0 0 1 2.18 12 9.82 9.82 0 0 1 12 2.182 9.82 9.82 0 0 1 21.818 12 9.82 9.82 0 0 1 12 21.818z"/></svg>
                            WhatsApp
                          </button>
                        )}
                      </div>
                      <button onClick={resetForm} className="bg-[#0a4a6e] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0e6899] transition-colors">+ Nouvelle commande</button>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* ── TAB COMMANDES */}
            {activeTab === "orders" && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-800">Historique des commandes</h2>
                  <button onClick={() => loadOrders(partnerProfile?.partner_code)} className="text-xs text-gray-400 hover:text-gray-600">↻ Actualiser</button>
                </div>
                {orders.length === 0 ? (
                  <div className="py-16 text-center text-gray-400 text-sm">Aucune commande pour l'instant</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                          <th className="text-left px-5 py-3 font-medium">Client</th>
                          <th className="text-left px-5 py-3 font-medium">Forfait</th>
                          <th className="text-left px-5 py-3 font-medium">Montant</th>
                          <th className="text-left px-5 py-3 font-medium">Statut</th>
                          <th className="text-left px-5 py-3 font-medium">ICCID</th>
                          <th className="text-left px-5 py-3 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {orders.map(order => {
                          const s = statusLabel[order.status] || { label: order.status, style: "bg-gray-100 text-gray-600" };
                          return (
                            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-5 py-3.5"><p className="font-medium text-gray-800">{order.client_name}</p><p className="text-xs text-gray-400">{order.client_email}</p></td>
                              <td className="px-5 py-3.5 text-gray-600">{order.package_name}</td>
                              <td className="px-5 py-3.5 font-medium text-gray-700">{order.currency === "xpf" ? `${order.amount.toLocaleString("fr")} XPF` : `${(order.amount / 100).toFixed(2)} €`}</td>
                              <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.style}`}>{s.label}</span></td>
                              <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{(order as any).esim_iccid || "—"}</td>
                              <td className="px-5 py-3.5 text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString("fr-FR")}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}
