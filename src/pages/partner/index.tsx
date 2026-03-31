// src/pages/partner/index.tsx
import type { ReactElement } from "react";
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
  includes_voice?: boolean;
  includes_sms?: boolean;
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
  "Discover Global": "Monde",
  Asia: "Asie",
  Europe: "Europe",
  Japan: "Japon",
  "Canary Islands": "Iles Canaries",
  "South Korea": "Coree du Sud",
  "Hong Kong": "Hong Kong",
  "United States": "Etats-Unis",
  Australia: "Australie",
  "New Zealand": "Nouvelle-Zelande",
  Mexico: "Mexique",
  Fiji: "Fidji",
  Thailand: "Thailande",
  Singapore: "Singapour",
  Malaysia: "Malaisie",
  Indonesia: "Indonesie",
  Philippines: "Philippines",
  Vietnam: "Viet Nam",
  India: "Inde",
  China: "Chine",
  Taiwan: "Taiwan",
  "United Kingdom": "Royaume-Uni",
  Germany: "Allemagne",
  Spain: "Espagne",
  Italy: "Italie",
  Greece: "Grece",
  Portugal: "Portugal",
  Netherlands: "Pays-Bas",
  Belgium: "Belgique",
  Switzerland: "Suisse",
  Austria: "Autriche",
  Poland: "Pologne",
  "Czech Republic": "Republique tcheque",
  Turkey: "Turquie",
  Egypt: "Egypte",
  Morocco: "Maroc",
  "South Africa": "Afrique du Sud",
  Brazil: "Bresil",
  Argentina: "Argentine",
  Chile: "Chili",
  Colombia: "Colombie",
  Peru: "Perou",
  UAE: "Emirats arabes unis",
  "United Arab Emirates": "Emirats arabes unis",
  "Saudi Arabia": "Arabie saoudite",
  Israel: "Israel",
  Jordan: "Jordanie",
  Qatar: "Qatar",
  Kuwait: "Koweit",
  Bahrain: "Bahrein",
  Oman: "Oman",
  Canada: "Canada",
  France: "France",
  Lebanon: "Liban",
  Albania: "Albanie",
  Algeria: "Algerie",
  Armenia: "Armenie",
  Bangladesh: "Bangladesh",
  Bulgaria: "Bulgarie",
  Cambodia: "Cambodge",
  Croatia: "Croatie",
  Cyprus: "Chypre",
  Denmark: "Danemark",
  Ecuador: "Equateur",
  Estonia: "Estonie",
  Ethiopia: "Ethiopie",
  Finland: "Finlande",
  Georgia: "Georgie",
  Ghana: "Ghana",
  Hungary: "Hongrie",
  Iceland: "Islande",
  Ireland: "Irlande",
  Kazakhstan: "Kazakhstan",
  Kenya: "Kenya",
  Laos: "Laos",
  Latvia: "Lettonie",
  Lithuania: "Lituanie",
  Luxembourg: "Luxembourg",
  Madagascar: "Madagascar",
  Maldives: "Maldives",
  Malta: "Malte",
  Mauritius: "Maurice",
  Mongolia: "Mongolie",
  Montenegro: "Montenegro",
  Myanmar: "Myanmar",
  Namibia: "Namibie",
  Nepal: "Nepal",
  Nigeria: "Nigeria",
  Norway: "Norvege",
  Pakistan: "Pakistan",
  Panama: "Panama",
  Romania: "Roumanie",
  Russia: "Russie",
  Rwanda: "Rwanda",
  Senegal: "Senegal",
  Serbia: "Serbie",
  Slovakia: "Slovaquie",
  Slovenia: "Slovenie",
  "Sri Lanka": "Sri Lanka",
  Sweden: "Suede",
  Tanzania: "Tanzanie",
  Tunisia: "Tunisie",
  Ukraine: "Ukraine",
  Uruguay: "Uruguay",
  Venezuela: "Venezuela",
  Oceania: "Oceanie",
  "North America": "Amerique du Nord",
  "Middle East and North Africa": "Moyen-Orient et Afrique du Nord",
  "French Polynesia": "Polynesie francaise",
};

const TOP_DESTINATIONS = [
  "France",
  "Canada",
  "Etats-Unis",
  "Australie",
  "Nouvelle-Zelande",
  "Japon",
  "Europe",
];

function getFrenchName(pkg: AiraloPackage): string {
  const raw = pkg.region || pkg.country || "";
  if (pkg.region_fr && pkg.region_fr !== raw) return pkg.region_fr;
  return REGION_TRANSLATIONS[raw] || raw || "-";
}

export default function PartnerDashboard() {
  const router = useRouter();
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("destination");
  const [packages, setPackages] = useState<AiraloPackage[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<AiraloPackage | null>(null);
  const [clientForm, setClientForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [generatedLink, setGeneratedLink] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState("");
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [activeTab, setActiveTab] = useState<"new" | "orders" | "challenge">("new");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDuration, setFilterDuration] = useState<number | null>(null); // jours
  const [filterType, setFilterType] = useState<"all" | "voice" | "data">("all");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resentId, setResentId] = useState<string | null>(null);
  const [sellerName, setSellerName] = useState("");
  const [compatibilityChecked, setCompatibilityChecked] = useState(false);
  const [showCompatInfo, setShowCompatInfo] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [managerUnlocked, setManagerUnlocked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/partner/login");
        return;
      }

      const { data: profile } = await supabase
        .from("partner_profiles")
        .select("*")
        .eq("email", session.user.email)
        .single();

      if (!profile || !profile.is_active) {
        await supabase.auth.signOut();
        router.push("/partner/login?error=unauthorized");
        return;
      }

      setPartnerProfile(profile);
      setLoading(false);
      loadPackages();
      loadOrders(profile.partner_code);
    };

    checkAuth();
  }, [router]);

  const loadPackages = async () => {
    let allData: AiraloPackage[] = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("airalo_packages")
        .select(
          "id, name, data_amount, data_unit, validity_days, validity, price_xpf, final_price_xpf, price_eur, final_price_eur, currency, status, country, region, region_fr, operator_name, flag_url, type, includes_voice, includes_sms"
        )
        .eq("status", "active")
        .range(from, from + pageSize - 1);

      if (error || !data || data.length === 0) break;

      allData = [...allData, ...data];

      if (data.length < pageSize) break;
      from += pageSize;
    }

    setPackages(allData);
  };

  const loadOrders = async (partnerCode?: string) => {
    const code = partnerCode ?? partnerProfile?.partner_code;
    if (!code) return;

    // Essayer d'abord la vue
    const { data: viewData, error: viewErr } = await supabase
      .from("partner_orders_view")
      .select("*")
      .eq("partner_code", code)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!viewErr && viewData && viewData.length > 0) {
      setOrders(viewData as PartnerOrder[]);
      return;
    }

    // Fallback : requête directe sur orders si la vue ne retourne rien
    const { data: directData } = await supabase
      .from("orders")
      .select("id, email, package_name, package_id, price, currency, status, created_at, partner_code, stripe_session_id, airalo_order_id, prenom, nom, first_name, last_name, commission_amount")
      .eq("partner_code", code)
      .order("created_at", { ascending: false })
      .limit(100);

    if (directData) {
      const mapped = directData.map((o: any) => ({
        id: o.id,
        client_email: o.email,
        client_name: o.customer_name || o.email || "-",
        package_name: o.package_name || "-",
        package_id: o.package_id,
        amount: o.price,
        currency: o.currency || "EUR",
        status: o.status || "pending",
        created_at: o.created_at,
        partner_code: o.partner_code,
        payment_url: "",
        iccid: null,
        advisor_name: null,
      }));
      setOrders(mapped as PartnerOrder[]);
    }
  };

  const exportExcel = () => {
    if (orders.length === 0) { alert("Aucune commande a exporter."); return; }

    const rows = [
      ["Client", "Email", "Conseiller", "Forfait", "Montant (XPF)", "Statut", "ICCID", "Date"],
      ...orders.map(o => {
        const iccid = (o as any).esim_iccid;
        const s: { [k: string]: string } = {
          pending: "En attente", paid: "Paye", esim_sent: "eSIM envoyee", error: "Erreur"
        };
        return [
          o.client_name,
          o.client_email,
          (o as any).seller_name || "-",
          o.package_name,
          o.amount,
          s[o.status] || o.status,
          iccid ? iccid.toString().slice(-4) : "-",
          new Date(o.created_at).toLocaleDateString("fr-FR"),
        ];
      })
    ];

    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commandes-${partnerProfile?.partner_code}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const packagesByRegion = packages.reduce((acc, pkg) => {
    const region = getFrenchName(pkg);
    if (!acc[region]) acc[region] = [];
    acc[region].push(pkg);
    return acc;
  }, {} as Record<string, AiraloPackage[]>);

  const regionStats = Object.entries(packagesByRegion).reduce((acc, [region, pkgs]) => {
    const pricesXpf = pkgs
      .map((p) => p.price_xpf || p.final_price_xpf || p.price_eur || 0)
      .filter((p) => p > 0);

    acc[region] = {
      minPriceXpf: pricesXpf.length > 0 ? Math.min(...pricesXpf) : 0,
      packageCount: pkgs.length,
      operatorName: pkgs[0]?.operator_name || "-",
    };

    return acc;
  }, {} as Record<string, { minPriceXpf: number; packageCount: number; operatorName: string }>);

  const allRegions = Object.keys(packagesByRegion).sort(
    (a, b) => (regionStats[a]?.minPriceXpf || 0) - (regionStats[b]?.minPriceXpf || 0)
  );

  const filteredRegions = allRegions.filter(
    (r) => !searchQuery || r.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topRegions = filteredRegions.filter((r) =>
    TOP_DESTINATIONS.some((t) => t.toLowerCase() === r.toLowerCase())
  );

  const otherRegions = filteredRegions.filter(
    (r) => !TOP_DESTINATIONS.some((t) => t.toLowerCase() === r.toLowerCase())
  );

  const regionPackages = selectedRegion
    ? (packagesByRegion[selectedRegion] || [])
        .filter(pkg => {
          // Filtre durée
          if (filterDuration !== null) {
            const days = getValidityDays(pkg);
            if (filterDuration === 60) { if (days < 60) return false; }
            else { if (days !== filterDuration) return false; }
          }
          // Filtre type
          if (filterType === "voice" && !pkg.includes_voice) return false;
          if (filterType === "data" && pkg.includes_voice) return false;
          return true;
        })
        .sort((a, b) => {
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
    if (pkg.data_unit === "illimite" || pkg.data_unit === "unlimited") return "Illimite";
    if (pkg.data_amount) return `${pkg.data_amount} ${pkg.data_unit || "Go"}`;
    return pkg.data_unit || "Illimite";
  };

  const formatPrice = (pkg: AiraloPackage) => {
    const price =
      pkg.price_xpf || pkg.final_price_xpf || pkg.price_eur || pkg.final_price_eur || 0;
    return `${Math.round(price).toLocaleString("fr")} XPF`;
  };

  const generateLink = async () => {
    if (!selectedPackage || !clientForm.firstName || !clientForm.lastName || !clientForm.email) {
      setFormError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setFormError("");
    setGenerating(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/create-payment-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          clientFirstName: clientForm.firstName,
          clientLastName: clientForm.lastName,
          clientEmail: clientForm.email,
          clientPhone: clientForm.phone,
          destination: selectedRegion,
          sellerName: sellerName,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Erreur serveur");

      setGeneratedLink(data.paymentUrl);
      setStep("lien");

      if (partnerProfile) loadOrders(partnerProfile.partner_code);
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la generation du lien.");
    } finally {
      setGenerating(false);
    }
  };

  const sendPaymentLinkEmail = async () => {
    if (!generatedLink || !clientForm.email) return;

    setSendingEmail(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      await fetch("/api/partner/send-payment-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          clientEmail: clientForm.email,
          clientFirstName: clientForm.firstName,
          clientLastName: clientForm.lastName,
          packageName: selectedPackage?.name,
          destination: selectedRegion,
          dataAmount: selectedPackage ? getData(selectedPackage) : "",
          validityDays: selectedPackage ? getValidity(selectedPackage) : "",
          amount: selectedPackage?.price_xpf || selectedPackage?.price_eur || 0,
          currency: "xpf",
          paymentUrl: generatedLink,
          advisorName: partnerProfile?.advisor_name,
        }),
      });

      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 3000);
    } catch (err) {
      console.error("Erreur envoi email:", err);
    } finally {
      setSendingEmail(false);
    }
  };

  // Vérifie si un lien est expiré (> 24h et non payé)
  const isExpired = (order: PartnerOrder) => {
    if (order.status !== "pending") return false;
    const created = new Date(order.created_at).getTime();
    return Date.now() - created > 24 * 60 * 60 * 1000;
  };

  // Recrée un nouveau lien Stripe pour une commande expirée
  const recreateLink = async (order: PartnerOrder) => {
    setResendingId(order.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/create-payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          clientEmail: order.client_email,
          clientFirstName: order.client_name.split(" ")[0],
          clientLastName: order.client_name.split(" ").slice(1).join(" "),
          packageId: order.package_id,
          packageName: order.package_name,
          amount: order.amount,
          currency: order.currency,
          partnerCode: partnerProfile?.partner_code,
          advisorName: partnerProfile?.advisor_name,
          orderId: order.id,
        }),
      });
      const data = await res.json();
      if (data.paymentUrl) {
        // Mettre à jour le lien en base
        await supabase.from("orders").update({
          payment_url: data.paymentUrl,
          created_at: new Date().toISOString(),
        }).eq("id", order.id);
        setResentId(order.id);
        setTimeout(() => { setResentId(null); loadOrders(partnerProfile?.partner_code); }, 3000);
      }
    } catch (err) { console.error("Erreur recréation lien:", err); }
    finally { setResendingId(null); }
  };

  const resendPaymentLink = async (order: PartnerOrder) => {
    const paymentUrl = (order as any).payment_url;
    if (!paymentUrl) return;

    setResendingId(order.id);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      await fetch("/api/create-payment-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          resendOnly: true,
          paymentUrl,
          clientEmail: order.client_email,
          clientFirstName: order.client_name.split(" ")[0],
          clientLastName: order.client_name.split(" ").slice(1).join(" "),
          packageName: order.package_name,
          amount: order.amount,
          currency: order.currency,
          advisorName: partnerProfile?.advisor_name,
        }),
      });

      setResentId(order.id);
      setTimeout(() => setResentId(null), 3000);
    } catch (err) {
      console.error("Erreur renvoi lien:", err);
    } finally {
      setResendingId(null);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const sendViaWhatsApp = () => {
    const msg =
      "Bonjour " +
      clientForm.firstName +
      ", voici votre lien de paiement securise pour votre eSIM FenuaSIM :\n" +
      generatedLink;
    const waUrl =
      "https://wa.me/" +
      (clientForm.phone?.replace(/\s/g, "") || "") +
      "?text=" +
      encodeURIComponent(msg);

    window.open(waUrl, "_blank");
  };

  const resetForm = () => {
    setStep("destination");
    setSelectedRegion("");
    setSelectedPackage(null);
    setClientForm({ firstName: "", lastName: "", email: "", phone: "" });
    setGeneratedLink("");
    setFormError("");
    setSearchQuery("");
    setSellerName("");
    setCompatibilityChecked(false);
  };

  const stepKeys: Step[] = ["destination", "forfait", "client", "recap", "lien"];
  const stepLabels = ["Destination", "Forfait", "Client", "Recap", "Lien"];
  const currentStepIdx = stepKeys.indexOf(step);

  const statusConfig: { [key: string]: { label: string; bg: string; text: string } } = {
    pending:   { label: "En attente",   bg: "#FFF7ED", text: "#C2410C" },
    expired:   { label: "Expiré",       bg: "#FEF2F2", text: "#DC2626" },
    paid:      { label: "Payé",         bg: "#EDE9FE", text: "#7C3AED" },
    esim_sent: { label: "eSIM envoyée", bg: "#F0FDF4", text: "#15803D" },
    completed: { label: "Complété",     bg: "#F0FDF4", text: "#15803D" },
    error:     { label: "Erreur",       bg: "#FEF2F2", text: "#DC2626" },
    cancelled: { label: "Annulé",       bg: "#F3F4F6", text: "#6B7280" },
  };

  const G = "linear-gradient(135deg, #A020F0 0%, #FF4D6D 50%, #FF7F11 100%)";
  const Gsoft = "linear-gradient(135deg, #f3e8ff 0%, #ffe4e6 50%, #fff7ed 100%)";

  if (loading) {
    return (
      <>
        <Head>
          <style>{`
            @keyframes spin{to{transform:rotate(360deg)}}
          `}</style>
        </Head>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fafafa",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                border: "3px solid #f3e8ff",
                borderTopColor: "#A020F0",
                borderRadius: "50%",
                animation: "spin .7s linear infinite",
                margin: "0 auto 12px",
              }}
            />
            <p style={{ color: "#888", fontSize: 14 }}>Chargement...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Espace Partenaire - FENUA SIM</title>
        <style>{`
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
          .ani{animation:fadein .2s ease}
          .dest-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(160,32,240,0.12)}
          .pkg-card:hover{border-color:#A020F0!important}
          .nav-btn:hover{background:rgba(255,255,255,0.08)}
          input:focus,select:focus{outline:none;border-color:#A020F0!important;box-shadow:0 0 0 3px rgba(160,32,240,0.1)}
        `}</style>
      </Head>

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          background: "#f8f7ff",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <aside
          style={{
            width: 220,
            background: "#1a0533",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(160,32,240,0.3) 0%, transparent 60%)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              padding: "24px 20px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              position: "relative",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.3px" }}>
              <span
                style={{
                  background: G,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                FENUA
              </span>
              <span style={{ color: "rgba(255,255,255,0.3)", margin: "0 2px" }}>•</span>
              <span
                style={{
                  background: "linear-gradient(135deg, #FF4D6D, #FF7F11)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                SIM
              </span>
            </div>
            <p
              style={{
                color: "rgba(255,255,255,0.35)",
                fontSize: 11,
                marginTop: 2,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              Espace partenaire
            </p>
          </div>

          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              position: "relative",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: G,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 8,
                fontSize: 14,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              {(partnerProfile?.advisor_name || "?")[0].toUpperCase()}
            </div>
            <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: 0 }}>
              {partnerProfile?.advisor_name}
            </p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 }}>
              Code : {partnerProfile?.partner_code}
            </p>
          </div>

          <nav style={{ flex: 1, padding: "12px 0", position: "relative" }}>
            {[
              { key: "new", label: "Nouvelle commande", icon: "+" },
              { key: "orders", label: "Mes commandes", icon: "≡" },
              { key: "challenge", label: "Challenge", icon: "🏆" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  if (item.key === "orders" && !managerUnlocked) {
                    setShowPinModal(true);
                    setPinInput("");
                    setPinError("");
                    return;
                  }
                  setActiveTab(item.key as "new" | "orders" | "challenge");
                  if (item.key === "new") { resetForm(); setManagerUnlocked(false); }
                }}
                className="nav-btn"
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 20px",
                  fontSize: 13,
                  fontWeight: activeTab === item.key ? 600 : 400,
                  color: activeTab === item.key ? "#fff" : "rgba(255,255,255,0.5)",
                  background: activeTab === item.key ? "rgba(160,32,240,0.2)" : "transparent",
                  border: "none",
                  borderLeft: `3px solid ${
                    activeTab === item.key ? "#A020F0" : "transparent"
                  }`,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  transition: "all .15s",
                }}
              >
                <span style={{ fontSize: 16, opacity: 0.8 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div style={{ padding: 16, position: "relative" }}>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/partner/login");
              }}
              style={{
                width: "100%",
                padding: "8px",
                fontSize: 12,
                color: "rgba(255,255,255,0.4)",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Déconnexion
            </button>
          </div>
        </aside>

        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
          <header
            style={{
              background: "#fff",
              padding: "0 32px",
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid #f0e8ff",
              flexShrink: 0,
            }}
          >
            <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#1a0533" }}>
              {activeTab === "new" ? "Nouvelle commande" : activeTab === "orders" ? "Mes commandes" : "Challenge 🏆"}
            </h1>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "#16a34a",
                fontWeight: 500,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  background: "#16a34a",
                  borderRadius: "50%",
                  display: "inline-block",
                }}
              />
              Connecté
            </div>
          </header>

          <div style={{ padding: 32, flex: 1 }}>
            {activeTab === "new" && (
              <div style={{ maxWidth: 860, margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
                  {stepKeys.map((s, i) => {
                    const done = i < currentStepIdx;
                    const active = i === currentStepIdx;

                    return (
                      <div key={s} style={{ display: "flex", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 13,
                              fontWeight: 700,
                              background: done ? G : active ? G : "#e5e7eb",
                              color: done || active ? "#fff" : "#9ca3af",
                              flexShrink: 0,
                              transition: "all .3s",
                            }}
                          >
                            {done ? "✓" : i + 1}
                          </div>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: active ? 600 : 400,
                              color: active ? "#A020F0" : done ? "#6b7280" : "#9ca3af",
                              display: "block",
                            }}
                          >
                            {stepLabels[i]}
                          </span>
                        </div>
                        {i < stepKeys.length - 1 && (
                          <div
                            style={{
                              width: 36,
                              height: 2,
                              margin: "0 10px",
                              background: done ? G : "#e5e7eb",
                              flexShrink: 0,
                              borderRadius: 1,
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    boxShadow: "0 2px 16px rgba(160,32,240,0.06)",
                    border: "1px solid #f0e8ff",
                  }}
                >
                  {step === "destination" && (
                    <div className="ani" style={{ padding: 28 }}>
                      <h2
                        style={{
                          fontSize: 17,
                          fontWeight: 700,
                          color: "#1a0533",
                          marginBottom: 20,
                        }}
                      >
                        🌍 Choisissez une destination
                      </h2>

                      <div style={{ position: "relative", marginBottom: 24 }}>
                        <span
                          style={{
                            position: "absolute",
                            left: 12,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#A020F0",
                            fontSize: 16,
                          }}
                        >
                          🔍
                        </span>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Rechercher une destination... (ex: Japon, Europe, États-Unis)"
                          style={{
                            width: "100%",
                            padding: "11px 36px 11px 38px",
                            border: "1.5px solid #e9d5ff",
                            borderRadius: 10,
                            fontSize: 14,
                            color: "#1a0533",
                            background: "#faf5ff",
                            boxSizing: "border-box",
                          }}
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            style={{
                              position: "absolute",
                              right: 12,
                              top: "50%",
                              transform: "translateY(-50%)",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: 18,
                              color: "#9ca3af",
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {packages.length === 0 ? (
                        <p
                          style={{
                            textAlign: "center",
                            color: "#9ca3af",
                            padding: "40px 0",
                            fontSize: 14,
                          }}
                        >
                          Chargement...
                        </p>
                      ) : filteredRegions.length === 0 ? (
                        <p
                          style={{
                            textAlign: "center",
                            color: "#9ca3af",
                            padding: "40px 0",
                            fontSize: 14,
                          }}
                        >
                          Aucune destination trouvée pour « {searchQuery} »
                        </p>
                      ) : (
                        <>
                          {topRegions.length > 0 && !searchQuery && (
                            <div style={{ marginBottom: 28 }}>
                              <p
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#A020F0",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.8px",
                                  marginBottom: 12,
                                }}
                              >
                                ⭐ Destinations populaires
                              </p>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                                  gap: 10,
                                }}
                              >
                                {topRegions.map((region) => (
                                  <button
                                    key={region}
                                    onClick={() => {
                                      setSelectedRegion(region);
                                      setStep("forfait");
                                    }}
                                    className="dest-card"
                                    style={{
                                      textAlign: "left",
                                      border: "2px solid #e9d5ff",
                                      borderRadius: 12,
                                      padding: "14px 12px",
                                      background: Gsoft,
                                      cursor: "pointer",
                                      transition: "all .2s",
                                    }}
                                  >
                                    <p
                                      style={{
                                        fontWeight: 700,
                                        fontSize: 13,
                                        color: "#6b21a8",
                                        margin: "0 0 4px",
                                      }}
                                    >
                                      {region}
                                    </p>
                                    <p
                                      style={{
                                        fontSize: 11,
                                        color: "#9333ea",
                                        margin: "0 0 6px",
                                      }}
                                    >
                                      {regionStats[region]?.packageCount} forfaits
                                    </p>
                                    <p
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: "#A020F0",
                                        margin: 0,
                                      }}
                                    >
                                      dès{" "}
                                      {Math.round(
                                        regionStats[region]?.minPriceXpf || 0
                                      ).toLocaleString("fr")}{" "}
                                      XPF
                                    </p>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            {!searchQuery && (
                              <p
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#6b7280",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.8px",
                                  marginBottom: 12,
                                }}
                              >
                                🌍 Toutes les destinations ({otherRegions.length})
                              </p>
                            )}
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                                gap: 8,
                              }}
                            >
                              {(searchQuery ? filteredRegions : otherRegions).map((region) => (
                                <button
                                  key={region}
                                  onClick={() => {
                                    setSelectedRegion(region);
                                    setStep("forfait");
                                  }}
                                  className="dest-card"
                                  style={{
                                    textAlign: "left",
                                    border: "1.5px solid #e5e7eb",
                                    borderRadius: 10,
                                    padding: "12px",
                                    background: "#fff",
                                    cursor: "pointer",
                                    transition: "all .2s",
                                  }}
                                >
                                  <p
                                    style={{
                                      fontWeight: 600,
                                      fontSize: 12,
                                      color: "#1a0533",
                                      margin: "0 0 3px",
                                    }}
                                  >
                                    {region}
                                  </p>
                                  <p
                                    style={{
                                      fontSize: 11,
                                      color: "#9ca3af",
                                      margin: "0 0 4px",
                                    }}
                                  >
                                    {regionStats[region]?.packageCount} forfaits
                                  </p>
                                  <p
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: "#A020F0",
                                      margin: 0,
                                    }}
                                  >
                                    dès{" "}
                                    {Math.round(
                                      regionStats[region]?.minPriceXpf || 0
                                    ).toLocaleString("fr")}{" "}
                                    XPF
                                  </p>
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {step === "forfait" && (
                    <div className="ani" style={{ padding: 28 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                        <button
                          onClick={() => setStep("destination")}
                          style={{
                            background: "#f3e8ff",
                            border: "none",
                            borderRadius: 8,
                            width: 32,
                            height: 32,
                            cursor: "pointer",
                            fontSize: 16,
                            color: "#A020F0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          ←
                        </button>
                        <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1a0533", margin: 0 }}>
                          Forfaits - {selectedRegion}
                        </h2>
                        <span
                          style={{
                            fontSize: 12,
                            background: "#f3e8ff",
                            color: "#A020F0",
                            padding: "3px 10px",
                            borderRadius: 20,
                            fontWeight: 600,
                          }}
                        >
                          {regionPackages.length} forfaits
                        </span>
                      </div>

                      {/* Filtres durée + type */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
                        {/* Durée */}
                        <div style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 10, padding: 3 }}>
                          {[null, 7, 15, 30, 60].map(d => (
                            <button key={String(d)} onClick={() => setFilterDuration(d)}
                              style={{
                                fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 7, border: "none",
                                background: filterDuration === d ? "#A020F0" : "transparent",
                                color: filterDuration === d ? "#fff" : "#6b7280",
                                cursor: "pointer", whiteSpace: "nowrap",
                              }}>
                              {d === null ? "Tous" : d === 60 ? "60j+" : `${d}j`}
                            </button>
                          ))}
                        </div>
                        {/* Type */}
                        <div style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 10, padding: 3 }}>
                          {(["all","voice","data"] as const).map((v) => {
                            const labels = { all: "Tous", voice: "Appels+SMS", data: "Data only" };
                            return (
                              <button key={v} onClick={() => setFilterType(v)}
                                style={{
                                  fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 7, border: "none",
                                  background: filterType === v ? "#A020F0" : "transparent",
                                  color: filterType === v ? "#fff" : "#6b7280",
                                  cursor: "pointer",
                                }}>
                                {labels[v]}
                              </button>
                            );
                          })}
                        </div>
                        <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>
                          {regionPackages.length} forfait{regionPackages.length > 1 ? "s" : ""}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                          gap: 10,
                          maxHeight: 380,
                          overflowY: "auto",
                          paddingRight: 4,
                          marginBottom: 20,
                        }}
                      >
                        {regionPackages.map((pkg) => (
                          <button
                            key={pkg.id}
                            onClick={() => setSelectedPackage(pkg)}
                            className="pkg-card"
                            style={{
                              textAlign: "left",
                              border: `2px solid ${
                                selectedPackage?.id === pkg.id ? "#A020F0" : "#e5e7eb"
                              }`,
                              borderRadius: 12,
                              padding: 16,
                              background: selectedPackage?.id === pkg.id ? "#faf5ff" : "#fff",
                              cursor: "pointer",
                              transition: "all .15s",
                              position: "relative",
                            }}
                          >
                            {selectedPackage?.id === pkg.id && (
                              <span
                                style={{
                                  position: "absolute",
                                  top: 10,
                                  right: 12,
                                  color: "#A020F0",
                                  fontWeight: 800,
                                  fontSize: 16,
                                }}
                              >
                                ✓
                              </span>
                            )}

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                paddingRight: selectedPackage?.id === pkg.id ? 20 : 0,
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <p
                                  style={{
                                    fontWeight: 700,
                                    fontSize: 15,
                                    color: "#1a0533",
                                    margin: "0 0 4px",
                                  }}
                                >
                                  {getData(pkg)}
                                </p>
                                <p
                                  style={{
                                    fontSize: 12,
                                    color: "#6b7280",
                                    margin: "0 0 6px",
                                  }}
                                >
                                  {getValidity(pkg)}
                                </p>
                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: pkg.includes_voice ? "#dbeafe" : "#fce7f3", color: pkg.includes_voice ? "#1d4ed8" : "#be185d" }}>
                                    {pkg.includes_voice ? (getMinsCount(pkg) || "Appels inclus") : "Pas d'appels"}
                                  </span>
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: pkg.includes_sms ? "#ffedd5" : "#fce7f3", color: pkg.includes_sms ? "#c2410c" : "#be185d" }}>
                                    {pkg.includes_sms ? (getSmsCount(pkg) || "SMS inclus") : "Pas de SMS"}
                                  </span>
                                </div>
                                {pkg.operator_name && (
                                  <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>
                                    {pkg.operator_name}
                                  </p>
                                )}
                              </div>

                              <p
                                style={{
                                  fontWeight: 800,
                                  fontSize: 14,
                                  color: "#A020F0",
                                  margin: 0,
                                  flexShrink: 0,
                                  marginLeft: 8,
                                }}
                              >
                                {formatPrice(pkg)}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => setStep("client")}
                          disabled={!selectedPackage}
                          style={{
                            background: selectedPackage ? G : "#e5e7eb",
                            color: selectedPackage ? "#fff" : "#9ca3af",
                            border: "none",
                            borderRadius: 10,
                            padding: "11px 28px",
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: selectedPackage ? "pointer" : "not-allowed",
                          }}
                        >
                          Suivant →
                        </button>
                      </div>
                    </div>
                  )}

                  {step === "client" && (
                    <div className="ani" style={{ padding: 28 }}>
                      <h2
                        style={{
                          fontSize: 17,
                          fontWeight: 700,
                          color: "#1a0533",
                          marginBottom: 20,
                        }}
                      >
                        👤 Informations du client
                      </h2>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 16,
                          marginBottom: 16,
                        }}
                      >
                        {[
                          {
                            label: "Prénom *",
                            key: "firstName",
                            placeholder: "Marie",
                            type: "text",
                            full: false,
                          },
                          {
                            label: "Nom *",
                            key: "lastName",
                            placeholder: "Dupont",
                            type: "text",
                            full: false,
                          },
                          {
                            label: "Email *",
                            key: "email",
                            placeholder: "marie.dupont@email.com",
                            type: "email",
                            full: true,
                          },
                          {
                            label: "Téléphone (optionnel, pour WhatsApp)",
                            key: "phone",
                            placeholder: "+689 87 XX XX XX",
                            type: "tel",
                            full: true,
                          },
                        ].map((f) => (
                          <div key={f.key} style={{ gridColumn: f.full ? "1 / -1" : "auto" }}>
                            <label
                              style={{
                                display: "block",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#6b7280",
                                marginBottom: 6,
                              }}
                            >
                              {f.label}
                            </label>
                            <input
                              type={f.type}
                              value={(clientForm as any)[f.key]}
                              onChange={(e) =>
                                setClientForm((prev) => ({
                                  ...prev,
                                  [f.key]: e.target.value,
                                }))
                              }
                              placeholder={f.placeholder}
                              style={{
                                width: "100%",
                                padding: "10px 14px",
                                border: "1.5px solid #e5e7eb",
                                borderRadius: 9,
                                fontSize: 14,
                                color: "#1a0533",
                                boxSizing: "border-box",
                              }}
                            />
                          </div>
                        ))}
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#6b7280",
                            marginBottom: 6,
                          }}
                        >
                          Prénom du conseiller *
                        </label>
                        <input
                          type="text"
                          value={sellerName}
                          onChange={(e) => setSellerName(e.target.value)}
                          placeholder="Ex : Marie, Thomas..."
                          style={{
                            width: "100%",
                            padding: "10px 14px",
                            border: "1.5px solid #e5e7eb",
                            borderRadius: 9,
                            fontSize: 14,
                            color: "#1a0533",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          background: "#faf5ff",
                          border: "2px solid #e9d5ff",
                          borderRadius: 12,
                          padding: 16,
                          marginBottom: 16,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                          <input
                            type="radio"
                            checked
                            readOnly
                            style={{ marginTop: 3, accentColor: "#A020F0" }}
                          />
                          <div>
                            <p
                              style={{
                                fontWeight: 700,
                                fontSize: 14,
                                color: "#1a0533",
                                margin: "0 0 4px",
                              }}
                            >
                              🔗 Lien de paiement sécurisé (Stripe)
                            </p>
                            <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                              Un lien est généré et envoyé au client. Il règle depuis son
                              appareil. Aucune carte bancaire ne transite par vous.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Case compatibilité */}
                      <div style={{ background: compatibilityChecked ? "#f0fdf4" : "#fafafa", border: `1.5px solid ${compatibilityChecked ? "#bbf7d0" : "#e5e7eb"}`, borderRadius: 12, padding: "14px 16px", marginBottom: 16, transition: "all .2s" }}>
                        <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={compatibilityChecked}
                            onChange={e => setCompatibilityChecked(e.target.checked)}
                            style={{ marginTop: 2, width: 18, height: 18, accentColor: "#16a34a", flexShrink: 0, cursor: "pointer" }}
                          />
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 600, fontSize: 13, color: "#1a0533", margin: "0 0 2px" }}>
                              ✅ Compatibilité eSIM vérifiée *
                            </p>
                            <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                              Je confirme avoir vérifié que le téléphone du client est compatible eSIM et déverrouillé.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={e => { e.preventDefault(); setShowCompatInfo(true); }}
                            style={{ background: "#f3e8ff", border: "none", borderRadius: "50%", width: 24, height: 24, fontSize: 13, color: "#A020F0", cursor: "pointer", flexShrink: 0, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}
                            title="Comment vérifier ?"
                          >
                            ?
                          </button>
                        </label>
                      </div>

                      {/* Modal info compatibilité */}
                      {showCompatInfo && (
                        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
                          <div style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 400, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}>
                            <div style={{ textAlign: "center", marginBottom: 16 }}>
                              <div style={{ fontSize: 36, marginBottom: 8 }}>📱</div>
                              <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1a0533", margin: "0 0 4px" }}>Vérifier la compatibilité eSIM</h3>
                              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Suivez ces étapes avec le client</p>
                            </div>
                            <div style={{ background: "#faf5ff", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                              <p style={{ fontWeight: 700, fontSize: 13, color: "#A020F0", margin: "0 0 10px" }}>Étape 1 — Vérifier l'IMEI</p>
                              <div style={{ background: "#1a0533", borderRadius: 8, padding: "10px 14px", textAlign: "center", marginBottom: 8 }}>
                                <span style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: 2 }}>*#06#</span>
                              </div>
                              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Faites composer ce code sur le téléphone. Si 2 IMEI s'affichent, le téléphone est compatible eSIM.</p>
                            </div>
                            <div style={{ background: "#f0fdf4", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                              <p style={{ fontWeight: 700, fontSize: 13, color: "#15803d", margin: "0 0 8px" }}>Étape 2 — Vérifier le déverrouillage</p>
                              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Le téléphone doit être <strong>déverrouillé opérateur</strong> (ne doit pas être bloqué sur un réseau comme Vini ou Vodafone).</p>
                            </div>
                            <div style={{ background: "#eff6ff", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                              <p style={{ fontWeight: 700, fontSize: 13, color: "#1d4ed8", margin: "0 0 8px" }}>Étape 3 — Vérifier sur le site</p>
                              <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 8px" }}>Vous pouvez aussi vérifier via la page compatibilité FENUA SIM.</p>
                              <a href="https://fenuasim.com/compatibilite" target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: 12, color: "#A020F0", fontWeight: 600, textDecoration: "none" }}>
                                fenuasim.com/compatibilite →
                              </a>
                            </div>
                            <button
                              onClick={() => setShowCompatInfo(false)}
                              style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg, #A020F0, #FF7F11)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                            >
                              Compris ✓
                            </button>
                          </div>
                        </div>
                      )}

                      {formError && (
                        <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>
                          {formError}
                        </p>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <button
                          onClick={() => setStep("forfait")}
                          style={{
                            background: "#f3f4f6",
                            border: "none",
                            borderRadius: 9,
                            padding: "10px 20px",
                            fontSize: 13,
                            color: "#374151",
                            cursor: "pointer",
                          }}
                        >
                          ← Retour
                        </button>

                        <button
                          onClick={() => {
                            if (!clientForm.firstName || !clientForm.lastName || !clientForm.email) {
                              setFormError("Prénom, nom et email sont obligatoires.");
                              return;
                            }
                            if (!sellerName.trim()) {
                              setFormError("Le prénom du conseiller est obligatoire.");
                              return;
                            }
                            if (!compatibilityChecked) {
                              setFormError("Veuillez confirmer que la compatibilité eSIM a été vérifiée.");
                              return;
                            }
                            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientForm.email)) {
                              setFormError("Email invalide.");
                              return;
                            }
                            setFormError("");
                            setStep("recap");
                          }}
                          style={{
                            background: G,
                            color: "#fff",
                            border: "none",
                            borderRadius: 10,
                            padding: "11px 28px",
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Suivant →
                        </button>
                      </div>
                    </div>
                  )}

                  {step === "recap" && selectedPackage && (
                    <div className="ani" style={{ padding: 28 }}>
                      <h2
                        style={{
                          fontSize: 17,
                          fontWeight: 700,
                          color: "#1a0533",
                          marginBottom: 20,
                        }}
                      >
                        📋 Récapitulatif
                      </h2>

                      <div
                        style={{
                          background: "#faf5ff",
                          borderRadius: 12,
                          padding: 4,
                          marginBottom: 20,
                        }}
                      >
                        {[
                          ["Client", `${clientForm.firstName} ${clientForm.lastName}`],
                          ["Email", clientForm.email],
                          ["Téléphone", clientForm.phone || "-"],
                          ["Conseiller", sellerName],
                          ["Destination", selectedRegion],
                          ["Forfait", selectedPackage.name],
                          ["Données", getData(selectedPackage)],
                          ["Validité", getValidity(selectedPackage)],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              padding: "11px 16px",
                              borderBottom: "1px solid #f0e8ff",
                              fontSize: 14,
                            }}
                          >
                            <span style={{ color: "#6b7280" }}>{label}</span>
                            <span style={{ fontWeight: 500, color: "#1a0533" }}>{value}</span>
                          </div>
                        ))}

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "14px 16px",
                            fontSize: 16,
                          }}
                        >
                          <span style={{ fontWeight: 600, color: "#1a0533" }}>Total</span>
                          <span
                            style={{
                              fontWeight: 800,
                              background: G,
                              WebkitBackgroundClip: "text",
                              WebkitTextFillColor: "transparent",
                              fontSize: 18,
                            }}
                          >
                            {formatPrice(selectedPackage)}
                          </span>
                        </div>
                      </div>

                      <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 20 }}>
                        Un lien Stripe sera généré instantanément, valable 24h. Après paiement,
                        le QR code eSIM est envoyé automatiquement à {clientForm.email}.
                      </p>

                      {formError && (
                        <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>
                          {formError}
                        </p>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <button
                          onClick={() => setStep("client")}
                          style={{
                            background: "#f3f4f6",
                            border: "none",
                            borderRadius: 9,
                            padding: "10px 20px",
                            fontSize: 13,
                            color: "#374151",
                            cursor: "pointer",
                          }}
                        >
                          ← Retour
                        </button>

                        <button
                          onClick={generateLink}
                          disabled={generating}
                          style={{
                            background: generating ? "#e5e7eb" : G,
                            color: "#fff",
                            border: "none",
                            borderRadius: 10,
                            padding: "11px 24px",
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: generating ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {generating ? (
                            <>
                              <div
                                style={{
                                  width: 16,
                                  height: 16,
                                  border: "2px solid rgba(255,255,255,.3)",
                                  borderTopColor: "#fff",
                                  borderRadius: "50%",
                                  animation: "spin .7s linear infinite",
                                }}
                              />
                              Génération...
                            </>
                          ) : (
                            "Générer le lien de paiement"
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {step === "lien" && (
                    <div className="ani" style={{ padding: 40, textAlign: "center" }}>
                      <div
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #f3e8ff, #ffe4e6)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto 20px",
                          fontSize: 32,
                        }}
                      >
                        ✓
                      </div>

                      <h2
                        style={{
                          fontSize: 22,
                          fontWeight: 800,
                          color: "#1a0533",
                          marginBottom: 8,
                        }}
                      >
                        Lien de paiement prêt !
                      </h2>

                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          borderRadius: 10,
                          padding: "10px 16px",
                          marginBottom: 20,
                        }}
                      >
                        <span style={{ fontSize: 16 }}>📧</span>
                        <span style={{ fontSize: 13, color: "#15803d", fontWeight: 500 }}>
                          Email envoyé automatiquement à <strong>{clientForm.email}</strong>
                        </span>
                      </div>

                      <p
                        style={{
                          fontSize: 14,
                          color: "#6b7280",
                          marginBottom: 28,
                          lineHeight: 1.6,
                        }}
                      >
                        Partagez ce lien avec{" "}
                        <strong style={{ color: "#1a0533" }}>
                          {clientForm.firstName} {clientForm.lastName}
                        </strong>
                        .<br />
                        Une fois payé, l'eSIM sera envoyée automatiquement à {clientForm.email}.
                      </p>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          background: "#faf5ff",
                          border: "1.5px solid #e9d5ff",
                          borderRadius: 12,
                          padding: "12px 16px",
                          maxWidth: 560,
                          margin: "0 auto 24px",
                        }}
                      >
                        <span
                          style={{
                            flex: 1,
                            fontFamily: "monospace",
                            fontSize: 12,
                            color: "#7c3aed",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textAlign: "left",
                          }}
                        >
                          {generatedLink}
                        </span>

                        <button
                          onClick={copyLink}
                          style={{
                            background: copied ? "#16a34a" : G,
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            padding: "7px 16px",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            flexShrink: 0,
                            transition: "all .2s",
                          }}
                        >
                          {copied ? "✓ Copié" : "Copier"}
                        </button>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          justifyContent: "center",
                          flexWrap: "wrap",
                          marginBottom: 28,
                        }}
                      >
                        <button
                          onClick={sendPaymentLinkEmail}
                          disabled={sendingEmail}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "10px 20px",
                            border: `2px solid ${emailSent ? "#16a34a" : "#e9d5ff"}`,
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: 500,
                            background: emailSent ? "#f0fdf4" : "#fff",
                            color: emailSent ? "#16a34a" : "#1a0533",
                            cursor: sendingEmail ? "not-allowed" : "pointer",
                            opacity: sendingEmail ? 0.7 : 1,
                            transition: "all .2s",
                          }}
                        >
                          {emailSent ? (
                            "✓ Email envoyé !"
                          ) : sendingEmail ? (
                            <>
                              <div
                                style={{
                                  width: 14,
                                  height: 14,
                                  border: "2px solid #e9d5ff",
                                  borderTopColor: "#A020F0",
                                  borderRadius: "50%",
                                  animation: "spin .7s linear infinite",
                                }}
                              />
                              Envoi...
                            </>
                          ) : (
                            "📧 Envoyer par email"
                          )}
                        </button>

                        {clientForm.phone && (
                          <button
                            onClick={sendViaWhatsApp}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "10px 20px",
                              border: "2px solid #dcfce7",
                              borderRadius: 10,
                              fontSize: 13,
                              fontWeight: 500,
                              background: "#fff",
                              color: "#16a34a",
                              cursor: "pointer",
                            }}
                          >
                            💬 WhatsApp
                          </button>
                        )}
                      </div>

                      <button
                        onClick={resetForm}
                        style={{
                          background: G,
                          color: "#fff",
                          border: "none",
                          borderRadius: 10,
                          padding: "12px 28px",
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        + Nouvelle commande
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "challenge" && (() => {
              // Calculer le classement depuis les commandes payées
              const paidOrders = orders.filter(o => o.status === "paid" || o.status === "esim_sent");
              const rankMap: { [name: string]: { count: number; amount: number } } = {};
              paidOrders.forEach(o => {
                const rawName = ((o as any).seller_name || "Non renseigne").trim();
                const name = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
                if (!rankMap[name]) rankMap[name] = { count: 0, amount: 0 };
                rankMap[name].count += 1;
                rankMap[name].amount += o.amount || 0;
              });
              const ranking = Object.entries(rankMap)
                .map(([name, data]) => ({ name, ...data }))
                .sort((a, b) => b.count - a.count);
              const medals = ["🥇", "🥈", "🥉"];
              const maxCount = ranking[0]?.count || 1;

              return (
                <div style={{ maxWidth: 600, margin: "0 auto" }}>
                  <div style={{ background: "linear-gradient(135deg, #1a0533, #2d0a5c)", borderRadius: 16, padding: "28px 32px", marginBottom: 24, textAlign: "center", color: "#fff" }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>Classement des conseillers</h2>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0 }}>
                      Basé sur les ventes confirmées — {partnerProfile?.partner_code}
                    </p>
                  </div>

                  {ranking.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 14 }}>
                      Aucune vente confirmée pour le moment
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {ranking.map((r, i) => (
                        <div key={r.name} style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", border: `2px solid ${i === 0 ? "#fbbf24" : i === 1 ? "#d1d5db" : i === 2 ? "#f97316" : "#f0e8ff"}`, boxShadow: i === 0 ? "0 4px 16px rgba(251,191,36,0.2)" : "none", display: "flex", alignItems: "center", gap: 16 }}>
                          <div style={{ fontSize: 28, flexShrink: 0 }}>{medals[i] || `#${i + 1}`}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <span style={{ fontWeight: 700, fontSize: 15, color: "#1a0533" }}>{r.name}</span>
                              <span style={{ fontWeight: 800, fontSize: 14, color: "#A020F0" }}>{r.count} vente{r.count > 1 ? "s" : ""}</span>
                            </div>
                            <div style={{ background: "#f3f4f6", borderRadius: 999, height: 8, overflow: "hidden" }}>
                              <div style={{ height: "100%", borderRadius: 999, background: i === 0 ? "linear-gradient(90deg, #fbbf24, #f97316)" : "linear-gradient(90deg, #A020F0, #FF4D6D)", width: `${Math.round((r.count / maxCount) * 100)}%`, transition: "width .5s ease" }} />
                            </div>
                            <p style={{ fontSize: 11, color: "#9ca3af", margin: "6px 0 0" }}>
                              CA : {r.amount.toLocaleString("fr")} XPF
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {activeTab === "orders" && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  border: "1px solid #f0e8ff",
                  boxShadow: "0 2px 16px rgba(160,32,240,0.06)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "18px 24px",
                    borderBottom: "1px solid #f0e8ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a0533", margin: 0 }}>
                    Historique des commandes
                  </h2>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      onClick={exportExcel}
                      style={{ fontSize: 12, fontWeight: 600, color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 7, padding: "5px 12px", cursor: "pointer" }}
                    >
                      ⬇ Rapport Excel
                    </button>
                    <button
                      onClick={() => loadOrders(partnerProfile?.partner_code)}
                      style={{ fontSize: 12, color: "#A020F0", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
                    >
                      ↻ Actualiser
                    </button>
                  </div>
                </div>

                {orders.length === 0 ? (
                  <div
                    style={{
                      padding: "60px 0",
                      textAlign: "center",
                      color: "#9ca3af",
                      fontSize: 14,
                    }}
                  >
                    Aucune commande pour l'instant
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#faf5ff" }}>
                          {["Client", "Forfait", "Conseiller", "Montant", "Statut", "ICCID", "Date", "Action"].map(
                            (h) => (
                              <th
                                key={h}
                                style={{
                                  textAlign: "left",
                                  padding: "10px 18px",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#A020F0",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                  borderBottom: "1px solid #f0e8ff",
                                }}
                              >
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => {
                          const displayStatus = order.status === "pending" && isExpired(order) ? "expired" : order.status;
                                const s = statusConfig[displayStatus] || {
                            label: displayStatus,
                            bg: "#f3f4f6",
                            text: "#374151",
                          };
                          const iccid = (order as any).esim_iccid;

                          return (
                            <tr key={order.id} style={{ borderBottom: "1px solid #faf5ff" }}>
                              <td style={{ padding: "13px 18px" }}>
                                <p
                                  style={{
                                    fontWeight: 600,
                                    color: "#1a0533",
                                    margin: "0 0 2px",
                                  }}
                                >
                                  {order.client_name}
                                </p>
                                <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>
                                  {order.client_email}
                                </p>
                              </td>

                              <td style={{ padding: "13px 18px", color: "#374151" }}>
                                {order.package_name}
                              </td>

                              <td style={{ padding: "13px 18px", color: "#374151" }}>
                                {(order as any).seller_name || "-"}
                              </td>

                              <td
                                style={{
                                  padding: "13px 18px",
                                  fontWeight: 700,
                                  color: "#1a0533",
                                }}
                              >
                                {(() => {
                                  const cur = (order.currency || "EUR").toUpperCase();
                                  const raw = Number(order.amount) || 0;
                                  if (cur === "XPF" || cur === "CFP") {
                                    // partner_orders : montants en XPF entiers (ex: 2501)
                                    // orders (promo) : montants en EUR décimaux stockés avec currency XPF (ex: 6.93)
                                    if (raw >= 10) {
                                      // Vrai XPF (même 95 XPF = vrai montant XPF)
                                      const eur = raw / 119.33;
                                      return `${Math.round(raw).toLocaleString("fr")} XPF ≈ ${eur.toFixed(2)} €`;
                                    } else {
                                      // EUR mal étiqueté XPF (ex: 6.93 stocké en XPF)
                                      return `${raw.toFixed(2)} €`;
                                    }
                                  }
                                  // EUR
                                  return `${raw.toFixed(2)} €`;
                                })()}
                              </td>

                              <td style={{ padding: "13px 18px" }}>
                                <span
                                  style={{
                                    background: s.bg,
                                    color: s.text,
                                    padding: "4px 10px",
                                    borderRadius: 20,
                                    fontSize: 12,
                                    fontWeight: 600,
                                  }}
                                >
                                  {s.label}
                                </span>
                              </td>

                              <td
                                style={{
                                  padding: "13px 18px",
                                  fontFamily: "monospace",
                                  fontSize: 12,
                                  color: "#6b7280",
                                }}
                              >
                                {iccid ? `••••••••••••••••${iccid.toString().slice(-4)}` : "-"}
                              </td>

                              <td
                                style={{
                                  padding: "13px 18px",
                                  fontSize: 12,
                                  color: "#9ca3af",
                                }}
                              >
                                {new Date(order.created_at).toLocaleDateString("fr-FR")}
                              </td>

                              <td style={{ padding: "13px 18px" }}>
                                {isExpired(order) ? (
                                  <button
                                    onClick={() => recreateLink(order)}
                                    disabled={resendingId === order.id}
                                    style={{
                                      fontSize: 12, fontWeight: 600,
                                      color: "#DC2626", background: "#FEF2F2",
                                      border: "1px solid #FECACA",
                                      borderRadius: 7, padding: "5px 12px",
                                      cursor: "pointer", whiteSpace: "nowrap",
                                      opacity: resendingId === order.id ? 0.6 : 1,
                                    }}
                                  >
                                    {resendingId === order.id ? "..." : "🔄 Recréer le lien"}
                                  </button>
                                ) : order.status === "pending" && (
                                  <button
                                    onClick={() => resendPaymentLink(order)}
                                    disabled={resendingId === order.id}
                                    style={{
                                      fontSize: 12, fontWeight: 600,
                                      color: resentId === order.id ? "#15803d" : "#A020F0",
                                      background: resentId === order.id ? "#f0fdf4" : "#faf5ff",
                                      border: `1px solid ${resentId === order.id ? "#bbf7d0" : "#e9d5ff"}`,
                                      borderRadius: 7, padding: "5px 12px",
                                      cursor: "pointer", whiteSpace: "nowrap",
                                      opacity: resendingId === order.id ? 0.6 : 1,
                                    }}
                                  >
                                    {resentId === order.id ? "✓ Envoyé" : resendingId === order.id ? "..." : "↩ Renvoyer"}
                                  </button>
                                )}
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

      {/* Modal PIN Manager */}
      {showPinModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: "100%", maxWidth: 360, boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a0533", margin: "0 0 4px" }}>Accès manager</h2>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Entrez le code PIN pour voir l'historique</p>
            </div>
            <input
              type="password"
              value={pinInput}
              onChange={e => { setPinInput(e.target.value); setPinError(""); }}
              onKeyDown={e => { if (e.key === "Enter") {
                if (pinInput === partnerProfile?.manager_pin) {
                  setManagerUnlocked(true);
                  setShowPinModal(false);
                  setActiveTab("orders");
                } else {
                  setPinError("Code PIN incorrect.");
                }
              }}}
              placeholder="••••"
              maxLength={10}
              style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${pinError ? "#fca5a5" : "#e9d5ff"}`, borderRadius: 10, fontSize: 18, textAlign: "center", letterSpacing: 8, boxSizing: "border-box", marginBottom: 8 }}
              autoFocus
            />
            {pinError && <p style={{ color: "#dc2626", fontSize: 13, textAlign: "center", marginBottom: 8 }}>{pinError}</p>}
            <button
              onClick={() => {
                if (pinInput === partnerProfile?.manager_pin) {
                  setManagerUnlocked(true);
                  setShowPinModal(false);
                  setActiveTab("orders");
                } else {
                  setPinError("Code PIN incorrect.");
                }
              }}
              style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg, #A020F0, #FF7F11)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}
            >
              Confirmer
            </button>
            <button
              onClick={() => setShowPinModal(false)}
              style={{ width: "100%", padding: "10px", background: "none", border: "none", color: "#9ca3af", fontSize: 13, cursor: "pointer" }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </>
  );
}

PartnerDashboard.getLayout = (page: ReactElement) => page;
