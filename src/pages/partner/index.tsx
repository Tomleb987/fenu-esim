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
  "Albania": "Albanie", "Algeria": "Algérie", "Armenia": "Arménie",
  "Bangladesh": "Bangladesh", "Bulgaria": "Bulgarie", "Cambodia": "Cambodge",
  "Croatia": "Croatie", "Cyprus": "Chypre", "Denmark": "Danemark",
  "Ecuador": "Équateur", "Estonia": "Estonie", "Ethiopia": "Éthiopie",
  "Finland": "Finlande", "Georgia": "Géorgie", "Ghana": "Ghana",
  "Hungary": "Hongrie", "Iceland": "Islande", "Ireland": "Irlande",
  "Kazakhstan": "Kazakhstan", "Kenya": "Kenya", "Laos": "Laos",
  "Latvia": "Lettonie", "Lithuania": "Lituanie", "Luxembourg": "Luxembourg",
  "Madagascar": "Madagascar", "Maldives": "Maldives", "Malta": "Malte",
  "Mauritius": "Maurice", "Mongolia": "Mongolie", "Montenegro": "Monténégro",
  "Myanmar": "Myanmar", "Namibia": "Namibie", "Nepal": "Népal",
  "Nigeria": "Nigeria", "Norway": "Norvège", "Pakistan": "Pakistan",
  "Panama": "Panama", "Romania": "Roumanie", "Russia": "Russie",
  "Rwanda": "Rwanda", "Senegal": "Sénégal", "Serbia": "Serbie",
  "Slovakia": "Slovaquie", "Slovenia": "Slovénie", "Sri Lanka": "Sri Lanka",
  "Sweden": "Suède", "Tanzania": "Tanzanie", "Tunisia": "Tunisie",
  "Ukraine": "Ukraine", "Uruguay": "Uruguay", "Venezuela": "Venezuela",
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
  const [selectedRegion, setSelectedRegion] = useState("");
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
    let allData: AiraloPackage[] = [];
    let from = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from("airalo_packages")
        .select("id, name, data_amount, data_unit, validity_days, validity, price_xpf, final_price_xpf, price_eur, final_price_eur, currency, status, country, region, region_fr, operator_name, flag_url, type")
        .eq("status", "active")
        .range(from, from + pageSize - 1);
      
      if (error || !data || data.length === 0) break;
      allData = [...allData, ...data];
      if (data.length < pageSize) break;
      from += pageSize;
    }
    
    setPackages(allData);
  };

  const loadOrders = async (partnerCode: string) => {
    const { data } = await supabase.from("partner_orders_view").select("*").eq("partner_code", partnerCode).order("created_at", { ascending: false }).limit(50);
    if (data) setOrders(data as PartnerOrder[]);
  };

  const packagesByRegion = packages.reduce((acc, pkg) => {
    const region = getFrenchName(pkg);
    if (!acc[region]) acc[region] = [];
    acc[region].push(pkg);
    return acc;
  }, {} as Record<string, AiraloPackage[]>);

  const regionStats = Object.entries(packagesByRegion).reduce((acc, [region, pkgs]) => {
    const pricesXpf = pkgs.map(p => p.price_xpf || p.final_price_xpf || p.price_eur || 0).filter(p => p > 0);
    acc[region] = {
      minPriceXpf: pricesXpf.length > 0 ? Math.min(...pricesXpf) : 0,
      packageCount: pkgs.length,
      operatorName: pkgs[0]?.operator_name || "—",
    };
    return acc;
  }, {} as Record<string, { minPriceXpf: number; packageCount: number; operatorName: string }>);

  const allRegions = Object.keys(packagesByRegion).sort((a, b) => (regionStats[a]?.minPriceXpf || 0) - (regionStats[b]?.minPriceXpf || 0));
  const filteredRegions = allRegions.filter(r => !searchQuery || r.toLowerCase().includes(searchQuery.toLowerCase()));
  const topRegions = filteredRegions.filter(r => TOP_DESTINATIONS.some(t => t.toLowerCase() === r.toLowerCase()));
  const otherRegions = filteredRegions.filter(r => !TOP_DESTINATIONS.some(t => t.toLowerCase() === r.toLowerCase()));
  const regionPackages = selectedRegion 
    ? (packagesByRegion[selectedRegion] || []).sort((a, b) => {
        const pa = a.price_xpf || a.final_price_xpf || a.price_eur || 0;
        const pb = b.price_xpf || b.final_price_xpf || b.price_eur || 0;
        return pa - pb;
      })
    : [];

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
        body: JSON.stringify({ packageId: selectedPackage.id, clientFirstName: clientForm.firstName, clientLastName: clientForm.lastName, clientEmail: clientForm.email, clientPhone: clientForm.phone, destination: selectedRegion }),
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

  const stepKeys: Step[] = ["destination", "forfait", "client", "recap", "lien"];
  const stepLabels = ["Destination", "Forfait", "Client", "Récap", "Lien"];
  const currentStepIdx = stepKeys.indexOf(step);

  const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
    pending:   { label: "En attente", bg: "#FFF7ED", text: "#C2410C" },
    paid:      { label: "Payé",        bg: "#EDE9FE", text: "#7C3AED" },
    esim_sent: { label: "eSIM envoyée", bg: "#F0FDF4", text: "#15803D" },
    error:     { label: "Erreur",       bg: "#FEF2F2", text: "#DC2626" },
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fafafa" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 44, height: 44, border: "3px solid #f3e8ff", borderTopColor: "#A020F0", borderRadius: "50%", animation: "spin .7s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ color: "#888", fontSize: 14 }}>Chargement...</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const G = "linear-gradient(135deg, #A020F0 0%, #FF4D6D 50%, #FF7F11 100%)";
  const Gsoft = "linear-gradient(135deg, #f3e8ff 0%, #ffe4e6 50%, #fff7ed 100%)";

  return (
    <>
      <Head><title>Espace Partenaire — FENUA SIM</title></Head>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .ani{animation:fadein .2s ease}
        .dest-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(160,32,240,0.12)}
        .pkg-card:hover{border-color:#A020F0 !important}
        .nav-btn:hover{background:rgba(255,255,255,0.08)}
        input:focus,select:focus{outline:none;border-color:#A020F0 !important;box-shadow:0 0 0 3px rgba(160,32,240,0.1)}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#e5e7eb;border-radius:3px}
      `}</style>

      <div style={{ minHeight: "100vh", display: "flex", background: "#f8f7ff", fontFamily: "Arial, Helvetica, sans-serif" }}>

        {/* ── SIDEBAR */}
        <aside style={{ width: 220, background: "#1a0533", display: "flex", flexDirection: "column", flexShrink: 0, position: "relative", overflow: "hidden" }}>
          {/* Gradient overlay */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(160,32,240,0.3) 0%, transparent 60%)", pointerEvents: "none" }} />

          {/* Logo */}
          <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", position: "relative" }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.3px" }}>
              <span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FENUA</span>
              <span style={{ color: "rgba(255,255,255,0.3)", margin: "0 2px" }}>•</span>
              <span style={{ background: "linear-gradient(135deg, #FF4D6D, #FF7F11)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>SIM</span>
            </div>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2, letterSpacing: "0.5px", textTransform: "uppercase" }}>Espace partenaire</p>
          </div>

          {/* Profil */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "relative" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, fontSize: 14, fontWeight: 700, color: "#fff" }}>
              {(partnerProfile?.advisor_name || "?")[0].toUpperCase()}
            </div>
            <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: 0 }}>{partnerProfile?.advisor_name}</p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 }}>Code : {partnerProfile?.partner_code}</p>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "12px 0", position: "relative" }}>
            {[
              { key: "new", label: "Nouvelle commande", icon: "+" },
              { key: "orders", label: "Mes commandes", icon: "≡" },
            ].map(item => (
              <button key={item.key} onClick={() => { setActiveTab(item.key as any); if (item.key === "new") resetForm(); }}
                className="nav-btn"
                style={{ width: "100%", textAlign: "left", padding: "10px 20px", fontSize: 13, fontWeight: activeTab === item.key ? 600 : 400, color: activeTab === item.key ? "#fff" : "rgba(255,255,255,0.5)", background: activeTab === item.key ? "rgba(160,32,240,0.2)" : "transparent", border: "none", borderLeft: `3px solid ${activeTab === item.key ? "#A020F0" : "transparent"}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "all .15s" }}>
                <span style={{ fontSize: 16, opacity: 0.8 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div style={{ padding: 16, position: "relative" }}>
            <button onClick={async () => { await supabase.auth.signOut(); router.push("/partner/login"); }}
              style={{ width: "100%", padding: "8px", fontSize: 12, color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, cursor: "pointer" }}>
              Déconnexion
            </button>
          </div>
        </aside>

        {/* ── MAIN */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>

          {/* Topbar */}
          <header style={{ background: "#fff", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f0e8ff", flexShrink: 0 }}>
            <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#1a0533" }}>
              {activeTab === "new" ? "Nouvelle commande" : "Mes commandes"}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#16a34a", fontWeight: 500 }}>
              <span style={{ width: 7, height: 7, background: "#16a34a", borderRadius: "50%", display: "inline-block" }} />
              Connecté
            </div>
          </header>

          <div style={{ padding: 32, flex: 1 }}>

            {/* ══ TAB NOUVELLE COMMANDE ══ */}
            {activeTab === "new" && (
              <div style={{ maxWidth: 860, margin: "0 auto" }}>

                {/* Stepper */}
                <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
                  {stepKeys.map((s, i) => {
                    const done = i < currentStepIdx;
                    const active = i === currentStepIdx;
                    return (
                      <div key={s} style={{ display: "flex", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, background: done ? G : active ? G : "#e5e7eb", color: done || active ? "#fff" : "#9ca3af", flexShrink: 0, transition: "all .3s" }}>
                            {done ? "✓" : i + 1}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#A020F0" : done ? "#6b7280" : "#9ca3af", display: window.innerWidth < 500 ? "none" : "block" }}>{stepLabels[i]}</span>
                        </div>
                        {i < stepKeys.length - 1 && <div style={{ width: 36, height: 2, margin: "0 10px", background: done ? G : "#e5e7eb", flexShrink: 0, borderRadius: 1 }} />}
                      </div>
                    );
                  })}
                </div>

                <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 16px rgba(160,32,240,0.06)", border: "1px solid #f0e8ff" }}>

                  {/* ── ÉTAPE 1 : DESTINATION */}
                  {step === "destination" && (
                    <div className="ani" style={{ padding: 28 }}>
                      <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1a0533", marginBottom: 20 }}>🌍 Choisissez une destination</h2>

                      {/* Recherche */}
                      <div style={{ position: "relative", marginBottom: 24 }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#A020F0", fontSize: 16 }}>🔍</span>
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Rechercher une destination... (ex: Japon, Europe, États-Unis)"
                          style={{ width: "100%", padding: "11px 36px 11px 38px", border: "1.5px solid #e9d5ff", borderRadius: 10, fontSize: 14, color: "#1a0533", background: "#faf5ff", boxSizing: "border-box" }} />
                        {searchQuery && <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#9ca3af" }}>×</button>}
                      </div>

                      {packages.length === 0 ? (
                        <p style={{ textAlign: "center", color: "#9ca3af", padding: "40px 0", fontSize: 14 }}>Chargement...</p>
                      ) : filteredRegions.length === 0 ? (
                        <p style={{ textAlign: "center", color: "#9ca3af", padding: "40px 0", fontSize: 14 }}>Aucune destination trouvée pour « {searchQuery} »</p>
                      ) : (
                        <>
                          {/* Top destinations */}
                          {topRegions.length > 0 && !searchQuery && (
                            <div style={{ marginBottom: 28 }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: "#A020F0", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>⭐ Destinations populaires</p>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
                                {topRegions.map(region => (
                                  <button key={region} onClick={() => { setSelectedRegion(region); setStep("forfait"); }}
                                    className="dest-card"
                                    style={{ textAlign: "left", border: "2px solid #e9d5ff", borderRadius: 12, padding: "14px 12px", background: Gsoft, cursor: "pointer", transition: "all .2s" }}>
                                    <p style={{ fontWeight: 700, fontSize: 13, color: "#6b21a8", margin: "0 0 4px" }}>{region}</p>
                                    <p style={{ fontSize: 11, color: "#9333ea", margin: "0 0 6px" }}>{regionStats[region]?.packageCount} forfaits</p>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: "#A020F0", margin: 0 }}>dès {Math.round(regionStats[region]?.minPriceXpf || 0).toLocaleString("fr")} XPF</p>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Toutes destinations */}
                          <div>
                            {!searchQuery && <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>🌍 Toutes les destinations ({otherRegions.length})</p>}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
                              {(searchQuery ? filteredRegions : otherRegions).map(region => (
                                <button key={region} onClick={() => { setSelectedRegion(region); setStep("forfait"); }}
                                  className="dest-card"
                                  style={{ textAlign: "left", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "12px", background: "#fff", cursor: "pointer", transition: "all .2s" }}>
                                  <p style={{ fontWeight: 600, fontSize: 12, color: "#1a0533", margin: "0 0 3px" }}>{region}</p>
                                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 4px" }}>{regionStats[region]?.packageCount} forfaits</p>
                                  <p style={{ fontSize: 11, fontWeight: 700, color: "#A020F0", margin: 0 }}>dès {Math.round(regionStats[region]?.minPriceXpf || 0).toLocaleString("fr")} XPF</p>
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
                    <div className="ani" style={{ padding: 28 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                        <button onClick={() => setStep("destination")} style={{ background: "#f3e8ff", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#A020F0", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
                        <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1a0533", margin: 0 }}>Forfaits — {selectedRegion}</h2>
                        <span style={{ fontSize: 12, background: "#f3e8ff", color: "#A020F0", padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>{regionPackages.length} forfaits</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, maxHeight: 420, overflowY: "auto", paddingRight: 4, marginBottom: 20 }}>
                        {regionPackages.map(pkg => (
                          <button key={pkg.id} onClick={() => setSelectedPackage(pkg)} className="pkg-card"
                            style={{ textAlign: "left", border: `2px solid ${selectedPackage?.id === pkg.id ? "#A020F0" : "#e5e7eb"}`, borderRadius: 12, padding: 16, background: selectedPackage?.id === pkg.id ? "#faf5ff" : "#fff", cursor: "pointer", transition: "all .15s", position: "relative" }}>
                            {selectedPackage?.id === pkg.id && <span style={{ position: "absolute", top: 10, right: 12, color: "#A020F0", fontWeight: 800, fontSize: 16 }}>✓</span>}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingRight: selectedPackage?.id === pkg.id ? 20 : 0 }}>
                              <div>
                                <p style={{ fontWeight: 700, fontSize: 15, color: "#1a0533", margin: "0 0 4px" }}>{getData(pkg)}</p>
                                <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 2px" }}>{getValidity(pkg)}</p>
                                {pkg.operator_name && <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{pkg.operator_name}</p>}
                              </div>
                              <p style={{ fontWeight: 800, fontSize: 14, color: "#A020F0", margin: 0, flexShrink: 0 }}>{formatPrice(pkg)}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button onClick={() => setStep("client")} disabled={!selectedPackage}
                          style={{ background: selectedPackage ? G : "#e5e7eb", color: selectedPackage ? "#fff" : "#9ca3af", border: "none", borderRadius: 10, padding: "11px 28px", fontSize: 14, fontWeight: 600, cursor: selectedPackage ? "pointer" : "not-allowed" }}>
                          Suivant →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── ÉTAPE 3 : CLIENT */}
                  {step === "client" && (
                    <div className="ani" style={{ padding: 28 }}>
                      <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1a0533", marginBottom: 20 }}>👤 Informations du client</h2>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                        {[
                          { label: "Prénom *", key: "firstName", placeholder: "Marie", type: "text", full: false },
                          { label: "Nom *", key: "lastName", placeholder: "Dupont", type: "text", full: false },
                          { label: "Email *", key: "email", placeholder: "marie.dupont@email.com", type: "email", full: true },
                          { label: "Téléphone (optionnel, pour WhatsApp)", key: "phone", placeholder: "+689 87 XX XX XX", type: "tel", full: true },
                        ].map(f => (
                          <div key={f.key} style={{ gridColumn: f.full ? "1 / -1" : "auto" }}>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>{f.label}</label>
                            <input type={f.type} value={(clientForm as any)[f.key]} onChange={e => setClientForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                              placeholder={f.placeholder} style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 14, color: "#1a0533", boxSizing: "border-box" }} />
                          </div>
                        ))}
                      </div>

                      <div style={{ background: "#faf5ff", border: "2px solid #e9d5ff", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                          <input type="radio" checked readOnly style={{ marginTop: 3, accentColor: "#A020F0" }} />
                          <div>
                            <p style={{ fontWeight: 700, fontSize: 14, color: "#1a0533", margin: "0 0 4px" }}>🔗 Lien de paiement sécurisé (Stripe)</p>
                            <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Un lien est généré et envoyé au client. Il règle depuis son appareil. Aucune carte bancaire ne transite par vous.</p>
                          </div>
                        </div>
                      </div>

                      {formError && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{formError}</p>}
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <button onClick={() => setStep("forfait")} style={{ background: "#f3f4f6", border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 13, color: "#374151", cursor: "pointer" }}>← Retour</button>
                        <button onClick={() => {
                          if (!clientForm.firstName || !clientForm.lastName || !clientForm.email) { setFormError("Prénom, nom et email sont obligatoires."); return; }
                          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientForm.email)) { setFormError("Email invalide."); return; }
                          setFormError(""); setStep("recap");
                        }} style={{ background: G, color: "#fff", border: "none", borderRadius: 10, padding: "11px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                          Suivant →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── ÉTAPE 4 : RÉCAPITULATIF */}
                  {step === "recap" && selectedPackage && (
                    <div className="ani" style={{ padding: 28 }}>
                      <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1a0533", marginBottom: 20 }}>📋 Récapitulatif</h2>
                      <div style={{ background: "#faf5ff", borderRadius: 12, padding: 4, marginBottom: 20 }}>
                        {[
                          ["Client", `${clientForm.firstName} ${clientForm.lastName}`],
                          ["Email", clientForm.email],
                          ["Téléphone", clientForm.phone || "—"],
                          ["Destination", selectedRegion],
                          ["Forfait", selectedPackage.name],
                          ["Données", getData(selectedPackage)],
                          ["Validité", getValidity(selectedPackage)],
                        ].map(([label, value], i) => (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "11px 16px", borderBottom: "1px solid #f0e8ff", fontSize: 14 }}>
                            <span style={{ color: "#6b7280" }}>{label}</span>
                            <span style={{ fontWeight: 500, color: "#1a0533" }}>{value}</span>
                          </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px", fontSize: 16 }}>
                          <span style={{ fontWeight: 600, color: "#1a0533" }}>Total</span>
                          <span style={{ fontWeight: 800, background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: 18 }}>{formatPrice(selectedPackage)}</span>
                        </div>
                      </div>
                      <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 20 }}>Un lien Stripe sera généré instantanément, valable 24h. Après paiement, le QR code eSIM est envoyé automatiquement à {clientForm.email}.</p>
                      {formError && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{formError}</p>}
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <button onClick={() => setStep("client")} style={{ background: "#f3f4f6", border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 13, color: "#374151", cursor: "pointer" }}>← Retour</button>
                        <button onClick={generateLink} disabled={generating}
                          style={{ background: generating ? "#e5e7eb" : G, color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 600, cursor: generating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                          {generating ? <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} />Génération...</> : "Générer le lien de paiement"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── ÉTAPE 5 : LIEN GÉNÉRÉ */}
                  {step === "lien" && (
                    <div className="ani" style={{ padding: 40, textAlign: "center" }}>
                      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #f3e8ff, #ffe4e6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32 }}>✓</div>
                      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1a0533", marginBottom: 8 }}>Lien de paiement prêt !</h2>
                      <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 28, lineHeight: 1.6 }}>
                        Partagez ce lien avec <strong style={{ color: "#1a0533" }}>{clientForm.firstName} {clientForm.lastName}</strong>.<br />
                        Une fois payé, l'eSIM sera envoyée automatiquement à {clientForm.email}.
                      </p>

                      {/* Lien */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#faf5ff", border: "1.5px solid #e9d5ff", borderRadius: 12, padding: "12px 16px", maxWidth: 560, margin: "0 auto 24px" }}>
                        <span style={{ flex: 1, fontFamily: "monospace", fontSize: 12, color: "#7c3aed", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>{generatedLink}</span>
                        <button onClick={copyLink} style={{ background: copied ? "#16a34a" : G, color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, transition: "all .2s" }}>
                          {copied ? "✓ Copié" : "Copier"}
                        </button>
                      </div>

                      {/* Boutons envoi */}
                      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 28 }}>
                        <button onClick={sendPaymentLinkEmail} disabled={sendingEmail}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", border: `2px solid ${emailSent ? "#16a34a" : "#e9d5ff"}`, borderRadius: 10, fontSize: 13, fontWeight: 500, background: emailSent ? "#f0fdf4" : "#fff", color: emailSent ? "#16a34a" : "#1a0533", cursor: sendingEmail ? "not-allowed" : "pointer", opacity: sendingEmail ? 0.7 : 1, transition: "all .2s" }}>
                          {emailSent ? "✓ Email envoyé !" : sendingEmail ? <><div style={{ width: 14, height: 14, border: "2px solid #e9d5ff", borderTopColor: "#A020F0", borderRadius: "50%", animation: "spin .7s linear infinite" }} />Envoi...</> : "📧 Envoyer par email"}
                        </button>
                        {clientForm.phone && (
                          <button onClick={sendViaWhatsApp}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", border: "2px solid #dcfce7", borderRadius: 10, fontSize: 13, fontWeight: 500, background: "#fff", color: "#16a34a", cursor: "pointer" }}>
                            💬 WhatsApp
                          </button>
                        )}
                      </div>

                      <button onClick={resetForm} style={{ background: G, color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                        + Nouvelle commande
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══ TAB COMMANDES ══ */}
            {activeTab === "orders" && (
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f0e8ff", boxShadow: "0 2px 16px rgba(160,32,240,0.06)", overflow: "hidden" }}>
                <div style={{ padding: "18px 24px", borderBottom: "1px solid #f0e8ff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a0533", margin: 0 }}>Historique des commandes</h2>
                  <button onClick={() => loadOrders(partnerProfile?.partner_code)} style={{ fontSize: 12, color: "#A020F0", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>↻ Actualiser</button>
                </div>
                {orders.length === 0 ? (
                  <div style={{ padding: "60px 0", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>Aucune commande pour l'instant</div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#faf5ff" }}>
                          {["Client", "Forfait", "Montant", "Statut", "ICCID", "Date"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "10px 18px", fontSize: 11, fontWeight: 700, color: "#A020F0", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #f0e8ff" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(order => {
                          const s = statusConfig[order.status] || { label: order.status, bg: "#f3f4f6", text: "#374151" };
                          const iccid = (order as any).esim_iccid;
                          return (
                            <tr key={order.id} style={{ borderBottom: "1px solid #faf5ff" }}>
                              <td style={{ padding: "13px 18px" }}>
                                <p style={{ fontWeight: 600, color: "#1a0533", margin: "0 0 2px" }}>{order.client_name}</p>
                                <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{order.client_email}</p>
                              </td>
                              <td style={{ padding: "13px 18px", color: "#374151" }}>{order.package_name}</td>
                              <td style={{ padding: "13px 18px", fontWeight: 700, color: "#1a0533" }}>
                                {order.currency === "xpf" ? `${order.amount.toLocaleString("fr")} XPF` : `${(order.amount / 100).toFixed(2)} €`}
                              </td>
                              <td style={{ padding: "13px 18px" }}>
                                <span style={{ background: s.bg, color: s.text, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                              </td>
                              <td style={{ padding: "13px 18px", fontFamily: "monospace", fontSize: 12, color: "#6b7280" }}>
                                {iccid ? `••••••••••••••••${iccid.toString().slice(-4)}` : "—"}
                              </td>
                              <td style={{ padding: "13px 18px", fontSize: 12, color: "#9ca3af" }}>
                                {new Date(order.created_at).toLocaleDateString("fr-FR")}
                              </td>
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
