"use client";
import Head from "next/head";
import { usePartnerCodes } from "@/hooks/usePartnerCodes";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/lib/supabase/config";
import Image from "next/image";
import { Camera, Globe, Video, MessageSquare, ArrowLeft, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import React from "react";
import { stripePromise } from "@/lib/stripe/config";
import { getFrenchRegionName } from "@/lib/regionTranslations";

type Package = Database["public"]["Tables"]["airalo_packages"]["Row"] & {
  region_image_url?: string;
  region_description?: string;
  region_slug?: string;
  image_url?: string;
};

type DataTip = { photo: string; web: string; video: string; chat: string; };

function getDataTip(amount: number, unit: string): DataTip {
  const go = unit.toLowerCase() === "mb" ? amount / 1024 : amount;
  return {
    photo: Math.floor(go * 500).toLocaleString(),
    web: Math.floor(go / 0.06) + "h",
    video: Math.floor(go / 1) + "h",
    chat: Math.floor(go * 3333).toLocaleString(),
  };
}

const FRENCH_TO_ENGLISH_REGION: Record<string, string> = {
  "japon": "Japan", "etats-unis": "United States", "australie": "Australia",
  "nouvelle-zelande": "New Zealand", "mexique": "Mexico", "fidji": "Fiji",
  "thailande": "Thailand", "singapour": "Singapore", "malaisie": "Malaysia",
  "indonesie": "Indonesia", "philippines": "Philippines", "viet-nam": "Vietnam",
  "inde": "India", "chine": "China", "taiwan": "Taiwan",
  "royaume-uni": "United Kingdom", "allemagne": "Germany", "espagne": "Spain",
  "italie": "Italy", "grece": "Greece", "portugal": "Portugal",
  "pays-bas": "Netherlands", "belgique": "Belgium", "suisse": "Switzerland",
  "autriche": "Austria", "pologne": "Poland", "republique-tcheque": "Czech Republic",
  "turquie": "Turkey", "egypte": "Egypt", "maroc": "Morocco",
  "afrique-du-sud": "South Africa", "bresil": "Brazil", "argentine": "Argentina",
  "chili": "Chile", "colombie": "Colombia", "perou": "Peru",
  "emirats-arabes-unis": "United Arab Emirates", "arabie-saoudite": "Saudi Arabia",
  "israel": "Israel", "jordanie": "Jordan", "qatar": "Qatar",
  "koweit": "Kuwait", "bahrein": "Bahrain", "oman": "Oman",
  "azerbaidjan": "Azerbaijan", "jamaique": "Jamaica", "asie": "Asia",
  "europe": "Europe", "decouvrir-global": "Discover Global",
  "iles-canaries": "Canary Islands", "coree-du-sud": "South Korea",
  "france": "France", "canada": "Canada",
};

function slugToRegionFr(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ").toLowerCase();
}

function getEnglishRegionFromSlug(slug: string): string {
  return FRENCH_TO_ENGLISH_REGION[slug.toLowerCase().trim()] || slug;
}

async function validateAndApplyPromoCode(code: string, packagePrice: number) {
  try {
    const { data: promoCode, error } = await supabase.from("promo_codes").select("*").eq("code", code).single();
    if (error || !promoCode) return { isValid: false, discountedPrice: packagePrice, error: "Code promo invalide" };
    if (!promoCode.is_active) return { isValid: false, discountedPrice: packagePrice, error: "Ce code promo n'est plus actif" };
    const now = new Date();
    if (new Date(promoCode.valid_from) > now || new Date(promoCode.valid_until) < now)
      return { isValid: false, discountedPrice: packagePrice, error: "Ce code promo n'est plus valide" };
    if (promoCode.usage_limit && promoCode.times_used >= promoCode.usage_limit)
      return { isValid: false, discountedPrice: packagePrice, error: "Ce code promo a atteint sa limite d'utilisation" };
    let discountedPrice = packagePrice;
    if (promoCode.discount_percentage) discountedPrice = packagePrice * (1 - promoCode.discount_percentage / 100);
    else if (promoCode.discount_amount) discountedPrice = Math.max(0, packagePrice - promoCode.discount_amount);
    return { isValid: true, discountedPrice };
  } catch {
    return { isValid: false, discountedPrice: packagePrice, error: "Une erreur est survenue" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RECOMMANDEUR INTELLIGENT
// ─────────────────────────────────────────────────────────────────────────────
function RecommenderWidget({ packages, currency, onRecommend }: {
  packages: Package[];
  currency: "EUR" | "USD" | "XPF";
  onRecommend: (pkg: Package) => void;
}) {
  const [days, setDays] = useState<number | null>(null);
  const [usage, setUsage] = useState<string | null>(null);
  const [recommended, setRecommended] = useState<Package | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const PER_DAY: Record<string, number> = { light: 0.3, medium: 0.8, heavy: 2.0 };

  const neededGo = (d: number, u: string) => Math.ceil(d * (PER_DAY[u] || 1));

  const compute = (d: number, u: string): Package | null => {
    const needed = neededGo(d, u);

    // Pour usage intensif, chercher d'abord un forfait illimité valable assez longtemps
    if (u === "heavy") {
      const unlimited = packages.filter((p) => {
        const name = (p.name || "").toLowerCase();
        const desc = (p.description || "").toLowerCase();
        const pkgDays = parseInt(p.validity?.toString().split(" ")[0] || "0");
        const isUnlimited = name.includes("illimit") || name.includes("unlimited") || name.includes("∞") || desc.includes("illimit") || desc.includes("unlimited");
        return isUnlimited && pkgDays >= d;
      }).sort((a, b) => (a.final_price_eur ?? 0) - (b.final_price_eur ?? 0));
      if (unlimited.length > 0) return unlimited[0];

      // Pas d'illimité → proposer le plus gros forfait disponible (max Go)
      const biggest = packages.filter((p) => {
        const pkgDays = parseInt(p.validity?.toString().split(" ")[0] || "0");
        return pkgDays >= d;
      }).sort((a, b) => (b.data_amount ?? 0) - (a.data_amount ?? 0));
      return biggest[0] || null;
    }

    // Léger / Modéré → forfait avec assez de Go ET validité suffisante, prix le plus bas
    const valid = packages.filter((p) => {
      const go = (p.data_unit?.toLowerCase().includes("gb") || p.data_unit?.toLowerCase().includes("go"))
        ? (p.data_amount ?? 0)
        : (p.data_amount ?? 0) / 1024;
      const pkgDays = parseInt(p.validity?.toString().split(" ")[0] || "0");
      return go >= needed && pkgDays >= d;
    }).sort((a, b) => (a.final_price_eur ?? 0) - (b.final_price_eur ?? 0));
    return valid[0] || null;
  };

  const DAY_OPTIONS = [3, 7, 10, 14, 21, 30];

  const handleSelect = (d: number | null, u: string | null) => {
    if (!d || !u) return;
    const rec = compute(d, u);
    setRecommended(rec);
    if (rec) onRecommend(rec);
  };

  const USAGE_OPTIONS = [
    { key: "light", label: "Léger", desc: "Réseaux sociaux, messages, maps", icon: "📱", go: "~300 Mo/jour" },
    { key: "medium", label: "Modéré", desc: "Navigation, appels vidéo ponctuels", icon: "💻", go: "~800 Mo/jour" },
    { key: "heavy", label: "Intensif", desc: "Streaming, télétravail, vidéos", icon: "🎬", go: "~2 Go/jour" },
  ];

  return (
    <div style={{ background: "linear-gradient(135deg,#F9F5FF,#FFF7ED)", borderRadius: "16px", border: "1.5px solid #DDD6FE", padding: "20px", marginBottom: "16px", position: "relative" }}>
      <button onClick={() => setDismissed(true)} style={{ position: "absolute", top: "12px", right: "14px", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: "20px", lineHeight: 1 }}>×</button>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "linear-gradient(135deg,#A020F0,#FF7F11)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>🎯</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: "15px", color: "#111827" }}>Quel forfait me convient ?</div>
          <div style={{ fontSize: "12px", color: "#6B7280" }}>Répondez à 2 questions pour ne pas manquer de data</div>
        </div>
      </div>

      {/* Durée — slider */}
      <div style={{ marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#374151" }}>🗓️ Combien de jours voyagez-vous ?</div>
          {days && (
            <div style={{ fontWeight: 800, fontSize: "14px", background: "linear-gradient(90deg,#A020F0,#FF7F11)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {days} jours
            </div>
          )}
        </div>

        {/* Track + labels */}
        <div style={{ position: "relative", padding: "0 4px" }}>
          <input
            type="range"
            min={0}
            max={DAY_OPTIONS.length - 1}
            step={1}
            value={days ? DAY_OPTIONS.indexOf(days) : 0}
            onChange={(e) => {
              const d = DAY_OPTIONS[parseInt(e.target.value)];
              setDays(d);
              handleSelect(d, usage);
            }}
            style={{ width: "100%", accentColor: "#A020F0", cursor: "pointer", height: "4px" }}
          />
          <style>{`
            input[type=range]::-webkit-slider-thumb { width:20px; height:20px; border-radius:50%; background:linear-gradient(135deg,#A020F0,#FF7F11); border:2px solid #fff; box-shadow:0 1px 6px rgba(160,32,240,.3); }
            input[type=range]::-webkit-slider-runnable-track { height:4px; border-radius:2px; background:linear-gradient(90deg,#A020F0,#E5E7EB); }
          `}</style>
          {/* Labels sous le slider */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
            {DAY_OPTIONS.map((d) => (
              <span key={d} style={{ fontSize: "10px", fontWeight: days === d ? 800 : 500, color: days === d ? "#A020F0" : "#9CA3AF", transition: "all .15s" }}>
                {d}j
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Usage */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>📶 Quel est votre usage prévu ?</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
          {USAGE_OPTIONS.map(({ key, label, desc, icon, go }) => (
            <button key={key} onClick={() => { setUsage(key); handleSelect(days, key); }}
              style={{ padding: "10px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: usage === key ? "2px solid #A020F0" : "1.5px solid #E5E7EB", transition: "all .15s", background: usage === key ? "#F9F5FF" : "#fff", color: "#374151", textAlign: "center" }}>
              <div style={{ fontSize: "20px", marginBottom: "4px" }}>{icon}</div>
              <div style={{ fontWeight: 700, marginBottom: "2px" }}>{label}</div>
              <div style={{ fontSize: "10px", color: "#9CA3AF", lineHeight: 1.3 }}>{desc}</div>
              <div style={{ fontSize: "10px", color: "#A020F0", fontWeight: 700, marginTop: "4px" }}>{go}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Résultat */}
      {days && usage && (
        <div style={{ borderTop: "0.5px solid #E5E7EB", paddingTop: "14px" }}>
          {recommended ? (
            <div style={{ background: "linear-gradient(135deg,#A020F0,#FF7F11)", borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,.75)", fontWeight: 600, marginBottom: "3px" }}>✅ Forfait recommandé pour vous</div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#fff" }}>{recommended.name}</div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,.8)", marginTop: "2px" }}>
                  ~{neededGo(days, usage)} Go estimés pour {days} jours · valable {
                    recommended.validity?.toString()
                      .replace(/\bdays\b/g, "jours")
                      .replace(/\bday\b/g, "jour")
                  }
                </div>
                {/* Message recharge si usage intensif et pas illimité */}
                {usage === "heavy" && !["illimit","unlimited","∞"].some(k => (recommended.name || "").toLowerCase().includes(k) || (recommended.description || "").toLowerCase().includes(k)) && (
                  <div style={{ marginTop: "8px", background: "rgba(255,255,255,.15)", borderRadius: "8px", padding: "7px 10px", fontSize: "11px", color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>🔄</span>
                    <span>Pas d'illimité disponible pour cette durée. Vous pouvez recharger ce forfait directement depuis votre espace client sans racheter de nouvelle eSIM.</span>
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff" }}>
                  {currency === "XPF"
                    ? `${Math.round(recommended.final_price_xpf ?? 0).toLocaleString("fr-FR")} ₣`
                    : currency === "USD"
                    ? `$${recommended.final_price_usd?.toFixed(2)}`
                    : `${recommended.final_price_eur?.toFixed(2)}€`}
                </div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,.7)" }}>meilleur rapport</div>
              </div>
            </div>
          ) : (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "12px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "20px" }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "13px", color: "#991B1B" }}>Aucun forfait ne couvre ce besoin</div>
                <div style={{ fontSize: "12px", color: "#B91C1C" }}>
                  Vous avez besoin d'environ {neededGo(days, usage)} Go. Contactez-nous sur WhatsApp pour une solution sur-mesure.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function RegionPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();
  const params = useParams();
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [destinationImage, setDestinationImage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showRecapModal, setShowRecapModal] = useState(false);
  const [destinationInfo, setDestinationInfo] = useState<any>();
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", codePromo: "", codePartenaire: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<"EUR" | "USD" | "XPF">("EUR");
  const { partnerCode, promoCode: partnerPromoCode, isFromPartnerLink } = usePartnerCodes();

  useEffect(() => {
    if (partnerCode || partnerPromoCode) {
      setForm((prev) => ({ ...prev, codePartenaire: prev.codePartenaire || partnerCode, codePromo: prev.codePromo || partnerPromoCode }));
    }
  }, [partnerCode, partnerPromoCode]);

  const [cart, setCart] = useState<Package[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cur = localStorage.getItem("currency") as "EUR" | "USD" | "XPF" | null;
      if (cur) setCurrency(cur);
    }
  }, []);

  useEffect(() => { const stored = localStorage.getItem("cart"); if (stored) setCart(JSON.parse(stored)); }, []);
  useEffect(() => { localStorage.setItem("cart", JSON.stringify(cart)); }, [cart]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true); setError(null);
      try {
        if (!params?.region) { setError("Destination non trouvée"); setLoading(false); return; }
        const regionParam = Array.isArray(params.region) ? params.region[0] : params.region;
        const regionFr = slugToRegionFr(regionParam.toLowerCase());
        const englishRegion = getEnglishRegionFromSlug(regionParam);
        const dbSlug = englishRegion.toLowerCase();
        const { data: pkgs, error: pkgError } = await supabase.from("airalo_packages").select("*").eq("slug", dbSlug).gt("final_price_eur", 0).order("final_price_eur", { ascending: true });
        const { data: dest } = await supabase.from("destination_info").select("*").eq("name", pkgs?.[0]?.region_fr);
        setDestinationInfo(dest);
        const region = regionFr.toLowerCase().replace(/\s+/g, "-");
        const { data } = await supabase.storage.from("product-images").getPublicUrl(`esim-${region}.jpg`);
        setDestinationImage(data.publicUrl);
        if (pkgError) throw pkgError;
        if (!pkgs || pkgs.length === 0) { setError("Aucun forfait disponible pour cette destination"); setLoading(false); return; }
        setPackages(pkgs);
        setSelectedPackage(pkgs[0]);
      } catch (err) { setError("Erreur lors du chargement des données"); console.error(err); }
      finally { setLoading(false); }
    }
    fetchData();
  }, [params?.region]);

  useEffect(() => { if (packages.length > 0) setSelectedPackage(packages[currentIndex]); }, [currentIndex, packages]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", border: "4px solid #F3E8FF", borderTopColor: "#A020F0", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>😕</div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "12px" }}>{error}</h2>
          <button onClick={() => router.push("/shop")} style={{ background: "linear-gradient(90deg,#A020F0,#FF7F11)", color: "#fff", padding: "10px 24px", borderRadius: "10px", border: "none", fontWeight: 700, cursor: "pointer" }}>
            Retour à la boutique
          </button>
        </div>
      </div>
    );
  }

  const regionParam = Array.isArray(params.region) ? params.region[0] : params.region;
  const regionName = packages[0] ? getFrenchRegionName(packages[0].region_fr, packages[0].region) : regionParam;
  const margin = parseFloat(typeof window !== "undefined" ? localStorage.getItem("global_margin") || "0" : "0");

  const getPackagePrice = (pkg: Package) => {
    let price = pkg.final_price_eur;
    let symbol = "€";
    if (currency === "USD") { price = pkg.final_price_usd; symbol = "$"; }
    else if (currency === "XPF") { price = pkg.final_price_xpf; symbol = "₣"; }
    return { price: (price ?? 0) * (1 + margin), symbol };
  };

  const selectedPrice = selectedPackage ? getPackagePrice(selectedPackage) : null;
  const seoTitle = regionName ? `eSIM ${regionName} — Connexion instantanée | FENUA SIM` : "Forfait eSIM — FENUA SIM";
  const minPrice = packages.length > 0 ? Math.min(...packages.map((p) => p.final_price_eur || 999)).toFixed(2) : null;
  const seoDescription = regionName && minPrice ? `Achetez votre eSIM ${regionName}. ${packages.length} forfait${packages.length > 1 ? "s" : ""} à partir de ${minPrice}€. Activation instantanée.` : "Forfait eSIM de voyage — Activation instantanée.";
  const canonicalSlug = Array.isArray(params?.region) ? params.region[0] : params?.region || "";

  function handleAcheter(pkg: Package) { setSelectedPackage(pkg); setShowRecapModal(true); }
  function handleFormChange(e: React.ChangeEvent<HTMLInputElement>) { setForm({ ...form, [e.target.name]: e.target.value }); }
  const handlePrev = () => setCurrentIndex((p) => Math.max(0, p - 3));
  const handleNext = () => setCurrentIndex((p) => Math.min(packages.length - 1, p + 3));

  async function handleRecapSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom || !form.prenom || !form.email) { setFormError("Merci de remplir tous les champs obligatoires."); return; }
    if (!selectedPackage?.id) { setFormError("Erreur: Données du forfait incomplètes."); return; }
    setFormError(null);
    let basePrice = selectedPackage.final_price_eur!;
    if (currency === "USD") basePrice = selectedPackage.final_price_usd!;
    else if (currency === "XPF") basePrice = selectedPackage.final_price_xpf!;
    let finalPrice = basePrice * (1 + margin);
    let promoCodeToSave = null;
    if (form.codePromo) {
      const promoResult = await validateAndApplyPromoCode(form.codePromo, finalPrice);
      if (!promoResult.isValid) { setFormError(promoResult.error || "Code promo invalide"); return; }
      finalPrice = promoResult.discountedPrice;
      promoCodeToSave = form.codePromo;
    }
    localStorage.setItem("packageId", selectedPackage.id);
    localStorage.setItem("customerEmail", form.email);
    localStorage.setItem("customerName", `${form.prenom} ${form.nom}`);
    if (form.codePromo) localStorage.setItem("promoCode", form.codePromo);
    if (form.codePartenaire) localStorage.setItem("partnerCode", form.codePartenaire);
    setShowRecapModal(false);
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.prenom, last_name: form.nom, customer_email: form.email,
          cartItems: [{ id: selectedPackage.id, name: selectedPackage.name, description: selectedPackage.description ?? "", price: finalPrice, currency, final_price_eur: selectedPackage.final_price_eur! * (1 + margin), final_price_usd: selectedPackage.final_price_usd! * (1 + margin), final_price_xpf: selectedPackage.final_price_xpf! * (1 + margin), promo_code: promoCodeToSave || undefined, partner_code: form.codePartenaire || undefined }],
        }),
      });
      const responseData = await response.json();
      if (!response.ok) { setFormError(responseData.message || "Une erreur est survenue."); return; }
      const { sessionId } = responseData;
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe non initialisé");
      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) throw error;
    } catch (err) {
      console.error("Erreur Stripe:", err);
      setFormError("Une erreur est survenue lors du paiement. Veuillez réessayer.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      <Head>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={`https://www.fenuasim.com/shop/${canonicalSlug}`} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
      </Head>

      {/* ── HERO ── */}
      <div style={{ position: "relative", height: "280px", overflow: "hidden" }}>
        <img
          src={destinationImage || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1400&fit=crop"}
          alt={regionName || "Destination"}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1400&fit=crop"; }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(160,32,240,.75),rgba(10,2,30,.6) 60%,rgba(255,127,17,.3) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "24px" }}>
          <button onClick={() => router.push("/shop")} style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "rgba(255,255,255,.85)", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", borderRadius: "50px", padding: "5px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer", marginBottom: "14px", width: "fit-content" }}>
            <ArrowLeft size={13} /> Retour
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {packages[0]?.flag_url && (
              <img src={packages[0].flag_url} alt={regionName || ""} style={{ width: "52px", height: "36px", objectFit: "cover", borderRadius: "6px", border: "2px solid rgba(255,255,255,.3)", flexShrink: 0 }} />
            )}
            <div>
              <h1 style={{ fontSize: "clamp(24px,5vw,40px)", fontWeight: 900, color: "#fff", letterSpacing: "-.05em", lineHeight: 1.1 }}>{regionName}</h1>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,.7)", marginTop: "4px" }}>
                {packages.length} forfait{packages.length > 1 ? "s" : ""} disponible{packages.length > 1 ? "s" : ""} · Activation instantanée
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px 20px" }}>

        {/* ── RECOMMANDEUR ── */}
        <RecommenderWidget packages={packages} currency={currency} onRecommend={(pkg) => { setSelectedPackage(pkg); setCurrentIndex(packages.indexOf(pkg)); }} />

        {/* ── TRUST + CURRENCY ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {["⚡ Activation instantanée", "📩 Email immédiat", "🔒 Paiement Stripe", "💬 Support 24/7"].map((t) => (
              <span key={t} style={{ fontSize: "12px", color: "#6B7280", fontWeight: 600 }}>{t}</span>
            ))}
          </div>
          <select value={currency} onChange={(e) => { setCurrency(e.target.value as any); localStorage.setItem("currency", e.target.value); }}
            style={{ border: "1.5px solid rgba(160,32,240,.3)", borderRadius: "8px", padding: "6px 12px", fontSize: "13px", fontWeight: 700, color: "#A020F0", background: "#F9F5FF", cursor: "pointer", outline: "none" }}>
            <option value="EUR">€ EUR</option>
            <option value="XPF">₣ XPF</option>
            <option value="USD">$ USD</option>
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: "24px", alignItems: "start" }} className="product-grid">
          <style>{`@media(max-width:768px){.product-grid{grid-template-columns:1fr!important}}`}</style>

          {/* ── LEFT ── */}
          <div>
            {/* FORFAITS */}
            <div style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #E5E7EB", padding: "20px", marginBottom: "16px" }}>
              <h2 style={{ fontWeight: 800, fontSize: "18px", letterSpacing: "-.04em", marginBottom: "4px" }}>Forfaits disponibles</h2>
              <p style={{ fontSize: "12px", color: "#9CA3AF", marginBottom: "18px" }}>
                {packages.length} forfait{packages.length > 1 ? "s" : ""} — sélectionnez celui adapté à votre séjour
              </p>

              {/* Mobile — 1 forfait + flèches */}
              <div className="block sm:hidden">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))} disabled={currentIndex === 0}
                    style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid #E5E7EB", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, opacity: currentIndex === 0 ? 0.3 : 1 }}>
                    <ChevronLeft size={16} />
                  </button>
                  {packages[currentIndex] && (() => {
                    const pkg = packages[currentIndex];
                    const { price, symbol } = getPackagePrice(pkg);
                    return (
                      <div style={{ flex: 1, background: "#F9F5FF", borderRadius: "12px", border: "2px solid #A020F0", padding: "16px", textAlign: "center" }}>
                        <div style={{ fontWeight: 800, fontSize: "18px", marginBottom: "4px" }}>{pkg.name}</div>
                        <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "12px" }}>{pkg.description}</div>
                        <div style={{ fontWeight: 900, fontSize: "24px", background: "linear-gradient(90deg,#A020F0,#FF7F11)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "14px" }}>
                          {price.toFixed(2)} {symbol}
                        </div>
                        <button onClick={() => handleAcheter(pkg)} style={{ width: "100%", background: "linear-gradient(90deg,#A020F0,#FF7F11)", color: "#fff", border: "none", borderRadius: "10px", padding: "12px", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>
                          Acheter — Paiement sécurisé
                        </button>
                      </div>
                    );
                  })()}
                  <button onClick={() => setCurrentIndex((p) => Math.min(packages.length - 1, p + 1))} disabled={currentIndex === packages.length - 1}
                    style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid #E5E7EB", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, opacity: currentIndex === packages.length - 1 ? 0.3 : 1 }}>
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "12px" }}>
                  {packages.map((_, i) => (
                    <button key={i} onClick={() => setCurrentIndex(i)}
                      style={{ width: "8px", height: "8px", borderRadius: "50%", border: "none", cursor: "pointer", background: i === currentIndex ? "#A020F0" : "#E5E7EB" }} />
                  ))}
                </div>
              </div>

              {/* Desktop — 3 forfaits + flèches */}
              <div className="hidden sm:block">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button onClick={handlePrev} disabled={currentIndex === 0}
                    style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1.5px solid #E5E7EB", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: currentIndex === 0 ? "default" : "pointer", flexShrink: 0, opacity: currentIndex === 0 ? 0.3 : 1 }}>
                    <ChevronLeft size={16} color="#374151" />
                  </button>

                  <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
                    {packages.slice(currentIndex, currentIndex + 3).map((pkg) => {
                      const { price, symbol } = getPackagePrice(pkg);
                      const isSelected = selectedPackage?.id === pkg.id;
                      const isRecommended = selectedPackage?.id === pkg.id && pkg.id === packages[0]?.id;
                      return (
                        <div key={pkg.id} onClick={() => setSelectedPackage(pkg)}
                          style={{ background: isSelected ? "#F9F5FF" : "#fff", borderRadius: "14px", border: isSelected ? "2px solid #A020F0" : "1px solid #E5E7EB", padding: "18px 14px", cursor: "pointer", transition: "all .2s", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", boxShadow: isSelected ? "0 4px 16px rgba(160,32,240,.12)" : "none", position: "relative" }}>
                          <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "4px", color: "#111827" }}>{pkg.name}</div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", marginBottom: "10px", lineHeight: 1.4 }}>{pkg.description}</div>
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "center", marginBottom: "12px" }}>
                            <span style={{ fontSize: "10px", background: pkg.includes_voice ? "#EFF6FF" : "#F9FAFB", color: pkg.includes_voice ? "#1D4ED8" : "#9CA3AF", padding: "2px 8px", borderRadius: "50px", fontWeight: 700 }}>
                              {pkg.includes_voice ? "Appels ✓" : "Sans appels"}
                            </span>
                            <span style={{ fontSize: "10px", background: pkg.includes_sms ? "#FFF7ED" : "#F9FAFB", color: pkg.includes_sms ? "#C2410C" : "#9CA3AF", padding: "2px 8px", borderRadius: "50px", fontWeight: 700 }}>
                              {pkg.includes_sms ? "SMS ✓" : "Sans SMS"}
                            </span>
                          </div>
                          <div style={{ fontWeight: 900, fontSize: "22px", background: "linear-gradient(90deg,#A020F0,#FF7F11)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "14px" }}>
                            {price > 0 ? `${price.toFixed(2)} ${symbol}` : "N/A"}
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleAcheter(pkg); }}
                            style={{ width: "100%", background: "linear-gradient(90deg,#A020F0,#FF7F11)", color: "#fff", border: "none", borderRadius: "10px", padding: "11px", fontWeight: 700, fontSize: "13px", cursor: "pointer", boxShadow: "0 2px 8px rgba(160,32,240,.2)" }}>
                            Acheter →
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <button onClick={handleNext} disabled={currentIndex + 3 >= packages.length}
                    style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1.5px solid #E5E7EB", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: currentIndex + 3 >= packages.length ? "default" : "pointer", flexShrink: 0, opacity: currentIndex + 3 >= packages.length ? 0.3 : 1 }}>
                    <ChevronRight size={16} color="#374151" />
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginTop: "16px" }}>
                  <span style={{ fontSize: "12px", color: "#9CA3AF", fontWeight: 600 }}>
                    {currentIndex + 1}–{Math.min(currentIndex + 3, packages.length)} sur {packages.length} forfaits
                  </span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {Array.from({ length: Math.ceil(packages.length / 3) }).map((_, i) => (
                      <button key={i} onClick={() => setCurrentIndex(i * 3)}
                        style={{ width: i === Math.floor(currentIndex / 3) ? "20px" : "8px", height: "8px", borderRadius: "50px", border: "none", cursor: "pointer", background: i === Math.floor(currentIndex / 3) ? "#A020F0" : "#E5E7EB", transition: "all .3s" }} />
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "14px", background: "#F3E8FF", borderRadius: "10px", padding: "10px 14px", fontSize: "12px", color: "#7B15B8", fontWeight: 600 }}>
                🔄 Tous les forfaits sont rechargeables depuis votre espace client
              </div>
            </div>

            {/* QUE FAIRE AVEC X GO */}
            {selectedPackage && typeof selectedPackage.data_amount === "number" && selectedPackage.data_amount > 0 && selectedPackage.data_unit && (
              <div style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #E5E7EB", padding: "20px", marginBottom: "16px" }}>
                <h2 style={{ fontWeight: 800, fontSize: "16px", marginBottom: "16px" }}>
                  Que faire avec {selectedPackage.data_amount}{" "}
                  {["gb", "go"].includes(selectedPackage.data_unit?.toLowerCase() ?? "") ? "Go" : ["mb", "mo"].includes(selectedPackage.data_unit?.toLowerCase() ?? "") ? "Mo" : selectedPackage.data_unit} ?
                </h2>
                {(() => {
                  const tips = getDataTip(selectedPackage.data_amount, selectedPackage.data_unit);
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "10px" }}>
                      {[
                        { icon: <Camera size={20} />, label: "Photos", value: tips.photo + " photos" },
                        { icon: <Globe size={20} />, label: "Navigation", value: tips.web },
                        { icon: <Video size={20} />, label: "Vidéo HD", value: tips.video },
                        { icon: <MessageSquare size={20} />, label: "Messages", value: tips.chat },
                      ].map(({ icon, label, value }) => (
                        <div key={label} style={{ background: "#F9F5FF", borderRadius: "10px", padding: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ color: "#A020F0", flexShrink: 0 }}>{icon}</div>
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 600 }}>{label}</div>
                            <div style={{ fontSize: "14px", fontWeight: 700, color: "#7B15B8" }}>{value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ACTIVATION */}
            <div style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #E5E7EB", padding: "20px" }}>
              <h2 style={{ fontWeight: 800, fontSize: "16px", marginBottom: "16px" }}>Comment activer ma eSIM ?</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "12px" }}>
                {[
                  { step: "1", title: "Recevez votre QR code", desc: "Par email immédiatement après paiement." },
                  { step: "2", title: "Ouvrez les réglages", desc: "Allez dans Réglages → Données mobiles." },
                  { step: "3", title: "Scannez le QR code", desc: "Ajoutez la ligne eSIM en scannant." },
                  { step: "4", title: "Connecté !", desc: "Votre eSIM s'active à l'atterrissage." },
                ].map(({ step, title, desc }) => (
                  <div key={step} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg,#A020F0,#FF7F11)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "12px", flexShrink: 0 }}>{step}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "2px" }}>{title}</div>
                      <div style={{ fontSize: "11px", color: "#6B7280" }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: STICKY RECAP ── */}
          <div style={{ position: "sticky", top: "80px" }}>
            {selectedPackage && selectedPrice && (
              <div style={{ background: "#fff", borderRadius: "16px", border: "1.5px solid rgba(160,32,240,.15)", padding: "20px", boxShadow: "0 4px 20px rgba(160,32,240,.08)" }}>
                <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "16px", color: "#111827" }}>Récapitulatif</div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                  {packages[0]?.flag_url && <img src={packages[0].flag_url} alt="" style={{ width: "36px", height: "24px", objectFit: "cover", borderRadius: "4px" }} />}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "15px" }}>{regionName}</div>
                    <div style={{ fontSize: "12px", color: "#9CA3AF" }}>{selectedPackage.name}</div>
                  </div>
                </div>
                <div style={{ background: "#F9F5FF", borderRadius: "10px", padding: "12px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", color: "#6B7280" }}>Prix</span>
                    <span style={{ fontWeight: 800, fontSize: "20px", background: "linear-gradient(90deg,#A020F0,#FF7F11)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {selectedPrice.price.toFixed(2)} {selectedPrice.symbol}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "12px", color: "#6B7280" }}>Opérateur</span>
                    <span style={{ fontSize: "12px", fontWeight: 600 }}>{selectedPackage.operator_name}</span>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                  {[{ icon: "⚡", label: "Activation instantanée" }, { icon: "📩", label: "Email immédiat" }, { icon: "🔄", label: "Rechargeable" }, { icon: "💬", label: "Support 24/7" }].map(({ icon, label }) => (
                    <div key={label} style={{ background: "#F9FAFB", borderRadius: "8px", padding: "8px 10px", fontSize: "11px", fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: "5px" }}>
                      <span>{icon}</span><span>{label}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => handleAcheter(selectedPackage)}
                  style={{ width: "100%", background: "linear-gradient(90deg,#A020F0,#FF7F11)", color: "#fff", border: "none", borderRadius: "12px", padding: "14px", fontWeight: 800, fontSize: "15px", cursor: "pointer", boxShadow: "0 4px 16px rgba(160,32,240,.3)", marginBottom: "10px" }}>
                  ⚡ Acheter maintenant →
                </button>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", fontSize: "11px", color: "#9CA3AF" }}>
                  <Shield size={12} /> Paiement 100% sécurisé via Stripe
                </div>
                {destinationInfo?.[0]?.description && (
                  <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "0.5px solid #F3F4F6", fontSize: "11px", color: "#6B7280", lineHeight: 1.6 }}>
                    {destinationInfo[0].description}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL PANIER */}
      {showCartModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 max-w-sm w-full text-center">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-purple-700">Ajouté au panier !</h2>
            <p className="mb-6 text-sm sm:text-base">Le forfait <span className="font-semibold">{selectedPackage?.data_amount} {selectedPackage?.data_unit}</span> a bien été ajouté.</p>
            <div className="flex flex-col gap-3">
              <button className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 px-4 rounded-xl font-semibold" onClick={() => router.push("/cart")}>Voir le panier</button>
              <button className="w-full border border-purple-200 text-purple-700 py-3 px-4 rounded-xl font-semibold" onClick={() => setShowCartModal(false)}>Continuer mes achats</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAIEMENT */}
      {showRecapModal && selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-lg p-4 sm:p-6 w-full max-w-md relative max-h-[85dvh] overflow-y-auto">
            <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold" onClick={() => setShowRecapModal(false)}>×</button>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-purple-700 pr-8">Récapitulatif de la commande</h2>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base sm:text-lg font-bold">{selectedPackage.data_amount} {selectedPackage.data_unit === "GB" ? "Go" : selectedPackage.data_unit}</span>
                {selectedPackage.operator_logo_url ? (
                  <Image src={selectedPackage.operator_logo_url} alt={selectedPackage.operator_name || ""} width={24} height={24} className="rounded-full bg-white border border-gray-100" />
                ) : (
                  <span className="text-xs text-gray-400">{selectedPackage.operator_name}</span>
                )}
              </div>
              <div className="flex gap-1 flex-wrap text-xs mb-2">
                <span className={`px-2 py-0.5 rounded-full font-semibold ${selectedPackage.includes_sms ? "bg-orange-50 text-orange-700" : "bg-gray-100 text-gray-400"}`}>SMS {selectedPackage.includes_sms ? "Oui" : "Non"}</span>
                <span className={`px-2 py-0.5 rounded-full font-semibold ${selectedPackage.includes_voice ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-400"}`}>Appels {selectedPackage.includes_voice ? "Oui" : "Non"}</span>
              </div>
              <div className="text-xl font-bold text-gray-900 mb-2">
                {(() => { const { price, symbol } = getPackagePrice(selectedPackage); return `${price.toFixed(2)} ${symbol}`; })()}
              </div>
            </div>
            <form onSubmit={handleRecapSubmit} className="space-y-3">
              <div className="flex gap-2">
                <input type="text" name="prenom" placeholder="Prénom *" value={form.prenom} onChange={handleFormChange} className="w-1/2 border border-gray-300 rounded-lg px-3 py-2.5 text-sm" required />
                <input type="text" name="nom" placeholder="Nom *" value={form.nom} onChange={handleFormChange} className="w-1/2 border border-gray-300 rounded-lg px-3 py-2.5 text-sm" required />
              </div>
              <input type="email" name="email" placeholder="Email *" value={form.email} onChange={handleFormChange} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" required />
              <input type="text" name="codePromo" placeholder="Code promo (optionnel)" value={form.codePromo} onChange={handleFormChange} readOnly={isFromPartnerLink && !!form.codePromo} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              <input type="text" name="codePartenaire" placeholder="Code partenaire (optionnel)" value={form.codePartenaire} onChange={handleFormChange} readOnly={isFromPartnerLink && !!form.codePartenaire} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              {formError && <div className="text-red-500 text-sm">{formError}</div>}
              <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-orange-500 text-white py-3 px-4 rounded-xl font-bold text-base shadow-md">
                Payer en toute sécurité 🔒
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
