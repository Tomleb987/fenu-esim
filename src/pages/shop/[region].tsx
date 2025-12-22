"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/lib/supabase/config";
import Image from "next/image";
import { Camera, Globe, Video, MessageSquare } from "lucide-react";
import React from "react";
import OrderSummary from "@/components/checkout/OrderSummary";
import { stripePromise } from "@/lib/stripe/config";
import { getFrenchRegionName } from "@/lib/regionTranslations";

// Types

type Package = Database["public"]["Tables"]["airalo_packages"]["Row"] & {
  region_image_url?: string;
  region_description?: string;
  region_slug?: string;
  image_url?: string;
};

type DataTip = {
  photo: string;
  web: string;
  video: string;
  chat: string;
  calls: string;
};

function getDataTip(amount: number, unit: string): DataTip {
  // Conversion en Go
  let go = unit.toLowerCase() === "mo" ? amount / 1024 : amount;
  return {
    photo: Math.floor(go * 500).toLocaleString(), // 500 photos/Go
    web: Math.floor(go / 0.06) + "h", // 60 Mo/h => 0.06 Go/h
    video: Math.floor(go / 1) + "h", // 1 Go/h
    chat: Math.floor(go * 3333).toLocaleString(), // 3333 messages/Go
    calls: Math.floor(go / 0.036) + "h", // 36 Mo/h => 0.036 Go/h
  };
}

function deburr(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getCountryCode(region: string | null): string {
  if (!region) return "xx";

  const cleaned = region.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const words = cleaned.trim().split(/\s+/);

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toLowerCase();
  } else {
    return words[0].slice(0, 2).toLowerCase();
  }
}

// Reverse translation mapping: French slug → English region name (for DB lookup)
const FRENCH_TO_ENGLISH_REGION: Record<string, string> = {
  "japon": "Japan",
  "etats-unis": "United States",
  "australie": "Australia",
  "nouvelle-zelande": "New Zealand",
  "mexique": "Mexico",
  "fidji": "Fiji",
  "thailande": "Thailand",
  "singapour": "Singapore",
  "malaisie": "Malaysia",
  "indonesie": "Indonesia",
  "philippines": "Philippines",
  "viet-nam": "Vietnam",
  "inde": "India",
  "chine": "China",
  "taiwan": "Taiwan",
  "royaume-uni": "United Kingdom",
  "allemagne": "Germany",
  "espagne": "Spain",
  "italie": "Italy",
  "grece": "Greece",
  "portugal": "Portugal",
  "pays-bas": "Netherlands",
  "belgique": "Belgium",
  "suisse": "Switzerland",
  "autriche": "Austria",
  "pologne": "Poland",
  "republique-tcheque": "Czech Republic",
  "turquie": "Turkey",
  "egypte": "Egypt",
  "maroc": "Morocco",
  "afrique-du-sud": "South Africa",
  "bresil": "Brazil",
  "argentine": "Argentina",
  "chili": "Chile",
  "colombie": "Colombia",
  "perou": "Peru",
  "emirats-arabes-unis": "United Arab Emirates",
  "arabie-saoudite": "Saudi Arabia",
  "israel": "Israel",
  "jordanie": "Jordan",
  "liban": "Lebanon",
  "qatar": "Qatar",
  "koweit": "Kuwait",
  "bahrein": "Bahrain",
  "oman": "Oman",
  "azerbaidjan": "Azerbaijan",
  "jamaique": "Jamaica",
  "asie": "Asia",
  "europe": "Europe",
  "decouvrir-global": "Discover Global",
  "iles-canaries": "Canary Islands",
  "coree-du-sud": "South Korea",
};

function slugToRegionFr(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
    .toLowerCase();
}

// Convert French slug to English region name for database lookup
function getEnglishRegionFromSlug(slug: string): string {
  const normalizedSlug = slug.toLowerCase().trim();
  // Try direct mapping first
  if (FRENCH_TO_ENGLISH_REGION[normalizedSlug]) {
    return FRENCH_TO_ENGLISH_REGION[normalizedSlug];
  }
  // If not found, assume slug is already in English
  return slug;
}

async function validateAndApplyPromoCode(
  code: string,
  packagePrice: number,
): Promise<{
  isValid: boolean;
  discountedPrice: number;
  error?: string;
}> {
  try {
    const { data: promoCode, error } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", code)
      .single();

    if (error || !promoCode) {
      return {
        isValid: false,
        discountedPrice: packagePrice,
        error: "Code promo invalide",
      };
    }

    // Check if promo code is active
    if (!promoCode.is_active) {
      return {
        isValid: false,
        discountedPrice: packagePrice,
        error: "Ce code promo n'est plus actif",
      };
    }

    // Check validity dates
    const now = new Date();
    if (
      new Date(promoCode.valid_from) > now ||
      new Date(promoCode.valid_until) < now
    ) {
      return {
        isValid: false,
        discountedPrice: packagePrice,
        error: "Ce code promo n'est plus valide",
      };
    }

    // Check usage limit
    if (
      promoCode.usage_limit &&
      promoCode.times_used >= promoCode.usage_limit
    ) {
      return {
        isValid: false,
        discountedPrice: packagePrice,
        error: "Ce code promo a atteint sa limite d'utilisation",
      };
    }

    // Calculate discounted price
    let discountedPrice = packagePrice;
    if (promoCode.discount_percentage) {
      discountedPrice =
        packagePrice * (1 - promoCode.discount_percentage / 100);
    } else if (promoCode.discount_amount) {
      discountedPrice = Math.max(0, packagePrice - promoCode.discount_amount);
    }

    return {
      isValid: true,
      discountedPrice,
    };
  } catch (error) {
    console.error("Error validating promo code:", error);
    return {
      isValid: false,
      discountedPrice: packagePrice,
      error: "Une erreur est survenue lors de la validation du code promo",
    };
  }
}

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
  const [showSimulator, setShowSimulator] = useState(false);
  const [showRecapModal, setShowRecapModal] = useState(false);
  const [destinationInfo, setDestinationInfo] = useState();
  const [form, setForm] = useState({
    nom: "",
    first_name: "",
    last_name: "",
    prenom: "",
    email: "",
    codePromo: "",
    codePartenaire: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Panier stocké dans le localStorage
  const [cart, setCart] = useState<Package[]>([]);

  // Récupérer la devise choisie (localStorage)
  const [currency, setCurrency] = useState<"EUR" | "USD" | "XPF">("EUR");
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cur = localStorage.getItem("currency") as
        | "EUR"
        | "USD"
        | "XPF"
        | null;
      if (cur) setCurrency(cur);
    }
  }, []);

  useEffect(() => {
    // Charger le panier depuis le localStorage au montage
    const stored = localStorage.getItem("cart");
    if (stored) setCart(JSON.parse(stored));
  }, []);

  useEffect(() => {
    // Sauvegarder le panier à chaque modification
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        if (!params?.region) {
          setError("Destination non trouvée");
          setLoading(false);
          return;
        }

        const regionParam = Array.isArray(params.region)
          ? params.region[0]
          : params.region;
        const regionFr = slugToRegionFr(regionParam.toLowerCase());
        
        // Convert French slug to English region name for DB lookup if needed
        // Database uses English slugs, so we need to convert if slug is in French
        const englishRegion = getEnglishRegionFromSlug(regionParam);
        const dbSlug = englishRegion.toLowerCase();
        
        // Lookup packages by slug (DB uses English slugs like "japan", not "japon")
        const { data: pkgs, error: pkgError } = await supabase
          .from("airalo_packages")
          .select("*")
          .eq("slug", dbSlug);
        const { data: dest, error: destError } = await supabase
          .from("destination_info")
          .select("*")
          .eq("name", pkgs?.[0].region_fr);
        /* @ts-ignore */
        setDestinationInfo(dest);

        const region = regionFr.toLowerCase().replace(/\s+/g, "-");
        const { data } = await supabase.storage
          .from("product-images")
          .getPublicUrl(`esim-${region}.jpg`);

        setDestinationImage(`${data.publicUrl}`);

        if (pkgError) throw pkgError;
        if (!pkgs || pkgs.length === 0) {
          setError("Aucun forfait disponible pour cette destination");
          setLoading(false);
          return;
        }
        setPackages(pkgs);
        setSelectedPackage(pkgs[0]);
      } catch (err) {
        setError("Erreur lors du chargement des données");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params?.region]);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);
  
  useEffect(()=>{console.log(destinationInfo)},[destinationInfo])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
            {error}
          </h2>
          <button
            onClick={() => router.push("/shop")}
            className="bg-purple-600 text-white px-4 sm:px-6 py-2 rounded-xl hover:bg-purple-700 transition-colors text-sm sm:text-base"
          >
            Retour à la boutique
          </button>
        </div>
      </div>
    );
  }

  // Utiliser les infos de la région depuis le premier forfait trouvé
  const regionParam = Array.isArray(params.region)
    ? params.region[0]
    : params.region;
  // Use translated French name for display
  const regionName = packages[0] 
    ? getFrenchRegionName(packages[0].region_fr, packages[0].region)
    : regionParam;
  const regionDescription = packages[0]?.region_description || "";

  // Fonction d'ajout au panier
  function handleAddToCart(pkg: Package) {
    const margin = parseFloat(localStorage.getItem("global_margin") || "0");
    const pkgWithMargin = {
      ...pkg,
      final_price_eur: pkg.final_price_eur! * (1 + margin),
    };
    setCart((prev) => [...prev, pkgWithMargin]);
    setShowCartModal(true);
  }

  function handleAcheter(pkg: Package) {
    setSelectedPackage(pkg);
    setShowSimulator(true);
    setShowRecapModal(true);
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleRecapSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom || !form.prenom || !form.email) {
      setFormError("Merci de remplir tous les champs obligatoires.");
      return;
    }
    if (!selectedPackage) {
      setFormError("Aucun forfait sélectionné.");
      return;
    }
    setFormError(null);

    let promoCodeToSave = null; // <-- Add this line

    // Calculate price based on selected currency
    let basePrice = selectedPackage.final_price_eur!;
    if (currency === "USD") {
      basePrice = selectedPackage.final_price_usd!;
    } else if (currency === "XPF") {
      basePrice = selectedPackage.final_price_xpf!;
    }
    
    let finalPrice = basePrice * (1 + margin);
    
    if (form.codePromo) {
      const promoResult = await validateAndApplyPromoCode(
        form.codePromo,
        finalPrice,
      );
      if (!promoResult.isValid) {
        setFormError(promoResult.error || "Code promo invalide");
        return;
      }
      finalPrice = promoResult.discountedPrice;
      promoCodeToSave = form.codePromo;
    }

    // Store customer info in localStorage
    localStorage.setItem("packageId", selectedPackage.id);
    localStorage.setItem("customerId", form.email);
    localStorage.setItem("customerEmail", form.email);
    localStorage.setItem("customerName", `${form.prenom} ${form.nom}`);
    if (form.codePromo) {
      localStorage.setItem("promoCode", form.codePromo);
    }
    if (form.codePartenaire) {
      localStorage.setItem("partnerCode", form.codePartenaire);
    }

    setShowRecapModal(false);
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.prenom,
          last_name: form.nom,
          customer_email: form.email,
          cartItems: [
            {
              id: selectedPackage.id,
              name: selectedPackage.name,
              description: selectedPackage.description ?? "",
              price: finalPrice,
              currency: currency, // Send selected currency
              final_price_eur: selectedPackage.final_price_eur! * (1 + margin),
              final_price_usd: selectedPackage.final_price_usd! * (1 + margin),
              final_price_xpf: selectedPackage.final_price_xpf! * (1 + margin),
              promo_code: promoCodeToSave || undefined,
              partner_code: form.codePartenaire || undefined,
            },
          ],
        }),
      });

      const { sessionId } = await response.json();
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe non initialisé");
      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) throw error;
    } catch (err) {
      console.error("Erreur lors de la redirection Stripe:", err);
      setFormError(
        "Une erreur est survenue lors de la redirection vers le paiement. Veuillez réessayer.",
      );
    }
  }
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? packages.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === packages.length - 1 ? 0 : prev + 1));
  };

  const margin = parseFloat(localStorage.getItem("global_margin")!);
  const selectedPackagePrice = () => {
    let price = selectedPackage?.final_price_eur;
    let symbol = "€";
    if (currency === "USD") {
      price = selectedPackage?.final_price_usd;
      symbol = "$";
    } else if (currency === "XPF") {
      price = selectedPackage?.final_price_xpf;
      symbol = "₣";
    }
    const priceWithMargin = price! * (1 + margin);
    return `${priceWithMargin.toFixed(2)} ${symbol}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-6 sm:space-y-8 lg:space-y-10">
      {/* Bloc 1 : Présentation destination (2 colonnes) */}
      <section className="h-full bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 flex flex-col md:flex-row gap-4 sm:gap-6 lg:gap-8 items-center md:items-start">
        <div className="relative w-1/3 h-[40rem] hidden md:block rounded-lg overflow-hidden">
          <Image
            src={destinationImage}
            alt="Region"
            fill
            className="object-cover"
          />
          {/* Fade overlay from bottom */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-white via-white/30 to-transparent" />
          </div>
        </div>
        <div className="flex-1 flex-col">
          <div className="flex flex-col md:flex-row justify-between items-start w-full">
            <div className="flex flex-row">
              {/* Image ou drapeau à gauche */}
              <div className="pt-4 h-30 mr-4 overflow-hidden relative">
                <img
                  src={packages[0]?.flag_url ?? ""}
                  alt={regionName || ""}
                  width={70}
                  height={20}
                  className="rounded object-cover"
                />
              </div>
              {/* Titre + description à droite */}
              <div className="flex flex-col justify-start md:text-left">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 md:mb-0 text-purple-800">
                  {regionName}
                </h1>
                <p className="text-purple-700 text-base sm:text-lg leading-relaxed">
                  {packages[0]?.region_description ||
                    "Découvrez nos forfaits eSIM pour cette destination."}
                </p>
              </div>
            </div>
            <div className="hidden md:flex text-xl sm:text-2xl font-bold text-purple-700">
              {selectedPackagePrice()}
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start w-full mt-12">
            <div className="flex flex-col space-y-6 mb-3 md:mb-0">
              <div className="text-black font-semibold font-md border rounded-xl text-center py-1 bg-gray-200 my:0 md:my-2.5 w-36">
                Description
              </div>
              <div className="flex items-center w-74">
                <svg
                  className="w-5 h-5 mr-2 text-purple-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-gray-700 text-sm">
                  {/* @ts-ignore */}
                  {destinationInfo[0]?.description ?? "Description"}
                </span>
              </div>
            </div>
            <div>
              <button
                className="bg-gradient-to-r from-purple-600 to-orange-500 text-white px-6 py-2.5 rounded-xl hover:from-purple-700 hover:to-orange-600 transition-all duration-300 text-sm sm:text-base"
                onClick={() => router.push("/compatibilite")}
              >
                Vérifier la compatibilité
              </button>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <select
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value as "EUR" | "XPF" | "USD");
                localStorage.setItem("currency", e.target.value);
              }}
              className="border border-purple-300 text-purple-800 bg-white rounded-lg px-3 sm:px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-md font-semibold text-sm sm:text-base min-w-24"
            >
              <option value="EUR">€ EUR</option>
              <option value="XPF">₣ XPF</option>
              <option value="USD">$ USD</option>
            </select>
          </div>

          <div className="mt-12 rounded shadow bg-gray-100 p-6">
            <h2 className="text-xl text-purple-800 sm:text-2xl font-bold mb-4 sm:mb-6 px-1">
              Forfaits disponibles
            </h2>
            <div className="relative flex items-center justify-center">
              {/* Left Arrow */}
              <button
                onClick={handlePrev}
                className="absolute left-0 z-10 bg-white border border-gray-200 rounded-full p-2 shadow hover:bg-purple-50 transition disabled:opacity-50"
                style={{ top: "50%", transform: "translateY(-50%)" }}
                aria-label="Précédent"
                disabled={packages.length <= 2}
              >
                <svg
                  width="24"
                  height="24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M15 19l-7-7 7-7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* Carousel Cards */}
              {packages.length > 0 && (
                <div className="w-full max-w-2xl mx-auto flex justify-center gap-4">
                  {packages
                    .slice(currentIndex, currentIndex + (isMobile ? 1 : 2))
                    .map((pkg) => {
                      let price = pkg.final_price_eur;
                      let symbol = "€";
                      if (currency === "USD") {
                        price = pkg.final_price_usd;
                        symbol = "$";
                      } else if (currency === "XPF") {
                        price = pkg.final_price_xpf;
                        symbol = "₣";
                      }
                      const margin = parseFloat(
                        localStorage.getItem("global_margin") || "0",
                      );
                      const priceWithMargin = price! * (1 + margin);
                      const countryCode = pkg.country
                        ? pkg.country.toLowerCase()
                        : "xx";
                      return (
                        <div
                          key={pkg.id}
                          className={`w-full sm:w-1/2 bg-white rounded-xl border-2 p-6 flex flex-col items-center shadow transition-all duration-200 ${
                            selectedPackage?.id === pkg.id
                              ? "border-purple-500 shadow-lg"
                              : "border-gray-100 hover:border-purple-300"
                          }`}
                          onClick={() => setSelectedPackage(pkg)}
                        >
                          {/* Flag and Name */}
                          <div className="flex items-center gap-3 mb-3">
                            <img
                              src={pkg.image_url}
                              alt={""}
                              width={40}
                              height={28}
                              className="rounded object-cover border"
                            />
                            <h3 className="text-lg font-bold text-purple-800">
                              {pkg.name}
                            </h3>
                          </div>
                          {/* Data, Duration, Badges */}
                          <div className="flex flex-wrap gap-2 mb-3 justify-center">
                            <span className="text-xs sm:text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold">
                              {pkg.includes_voice
                                ? "Appels inclus"
                                : "Pas d'appels"}
                            </span>
                            <span className="text-xs sm:text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-bold">
                              {pkg.includes_sms ? "SMS inclus" : "Pas de SMS"}
                            </span>
                          </div>
                          {/* Description */}
                          <div className="text-gray-700 text-sm mb-3 text-center min-h-[40px]">
                            {pkg.description}
                          </div>
                          {/* Price */}
                          <div className="text-xl font-bold text-purple-700 mb-4">
                            {priceWithMargin && priceWithMargin > 0 ? (
                              `${priceWithMargin.toFixed(2)} ${symbol}`
                            ) : (
                              <span className="text-gray-400">
                                Prix indisponible
                              </span>
                            )}
                          </div>
                          {/* Buy Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcheter(pkg);
                            }}
                            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-orange-500 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-orange-600 transition-all duration-300 text-base"
                          >
                            Acheter - Paiement Sécurisé
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Right Arrow */}
              <button
                onClick={handleNext}
                className="absolute right-0 z-10 bg-white border border-gray-200 rounded-full p-2 shadow hover:bg-purple-50 transition disabled:opacity-50"
                style={{ top: "50%", transform: "translateY(-50%)" }}
                aria-label="Suivant"
                disabled={packages.length <= 2}
              >
                <svg
                  width="24"
                  height="24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M9 5l7 7-7 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            {/* Carousel indicators */}
            <div className="flex justify-center mt-4 gap-2">
              {packages.map((_, idx) => (
                <button
                  key={idx}
                  className={`w-2.5 h-2.5 rounded-full ${idx === currentIndex ? "bg-purple-600" : "bg-gray-300"}`}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Aller au forfait ${idx + 1}`}
                  style={{ outline: "none", border: "none" }}
                />
              ))}
            </div>
          </div>
          <div className="my-6 p-3 text-gray-600 font-semibold rounded shadow bg-gray-100">
            ✅ Tous les forfaits sont rechargeables après commande depuis votre
            espace client
          </div>
        </div>
      </section>

      {/* Bloc 3 : Que faire avec XX Go ? */}
      {selectedPackage &&
      typeof selectedPackage.data_amount === "number" &&
      selectedPackage.data_unit ? (
        <section className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 lg:p-8 text-gray-700">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center sm:text-left">
            Que faire avec {selectedPackage.data_amount}{" "}
            {selectedPackage.data_unit?.toLowerCase() === "gb"
              ? "Go"
              : selectedPackage.data_unit || "Go"}{" "}
            ?
          </h2>
          {(() => {
            const tips = getDataTip(
              selectedPackage.data_amount,
              selectedPackage.data_unit,
            );
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 sm:p-4 lg:p-6 text-center">
                  <Camera className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 mx-auto mb-2 sm:mb-3 text-purple-600" />
                  <h3 className="font-semibold mb-1 text-sm sm:text-base">
                    Photos
                  </h3>
                  <p className="text-purple-700 text-xs sm:text-sm">
                    {tips.photo} photos
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl p-3 sm:p-4 lg:p-6 text-center">
                  <Globe className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 mx-auto mb-2 sm:mb-3 text-purple-600" />
                  <h3 className="font-semibold mb-1 text-sm sm:text-base">
                    Navigation
                  </h3>
                  <p className="text-purple-700 text-xs sm:text-sm">
                    {tips.web} heures
                  </p>
                </div>
                <div className="bg-gradient-to-br from-pink-100 to-red-100 rounded-xl p-3 sm:p-4 lg:p-6 text-center">
                  <Video className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 mx-auto mb-2 sm:mb-3 text-purple-600" />
                  <h3 className="font-semibold mb-1 text-sm sm:text-base">
                    Vidéo
                  </h3>
                  <p className="text-purple-700 text-xs sm:text-sm">
                    {tips.video} heures
                  </p>
                </div>
                <div className="bg-gradient-to-br from-red-100 to-orange-100 rounded-xl p-3 sm:p-4 lg:p-6 text-center">
                  <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 mx-auto mb-2 sm:mb-3 text-purple-600" />
                  <h3 className="font-semibold mb-1 text-sm sm:text-base">
                    Messages
                  </h3>
                  <p className="text-purple-700 text-xs sm:text-sm">
                    {tips.chat} messages
                  </p>
                </div>
                <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl p-3 sm:p-4 lg:p-6 text-center col-span-2 sm:col-span-1">
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 mx-auto mb-2 sm:mb-3 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <h3 className="font-semibold mb-1 text-sm sm:text-base">
                    Appels
                  </h3>
                  <p className="text-purple-700 text-xs sm:text-sm">
                    {tips.calls} heures
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    WhatsApp/Messenger
                  </p>
                </div>
              </div>
            );
          })()}
        </section>
      ) : null}

      {/* Bloc 4 : Comment activer ma eSIM ? */}
      <section className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 lg:p-8 text-gray-800">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center sm:text-left">
          Comment activer ma eSIM ?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
              <span className="text-lg sm:text-xl font-bold text-purple-600">
                1
              </span>
            </div>
            <h3 className="font-semibold mb-2 text-sm sm:text-base">
              Scanner le QR code
            </h3>
            <p className="text-purple-700 text-xs sm:text-sm">
              Scannez le QR code reçu par email.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
              <span className="text-lg sm:text-xl font-bold text-purple-600">
                2
              </span>
            </div>
            <h3 className="font-semibold mb-2 text-sm sm:text-base">
              Aller dans les réglages
            </h3>
            <p className="text-purple-700 text-xs sm:text-sm">
              Ouvrez les réglages de votre téléphone.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
              <span className="text-lg sm:text-xl font-bold text-purple-600">
                3
              </span>
            </div>
            <h3 className="font-semibold mb-2 text-sm sm:text-base">
              Activer la ligne eSIM
            </h3>
            <p className="text-purple-700 text-xs sm:text-sm">
              Ajoutez et activez la ligne eSIM dans les réglages.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
              <span className="text-lg sm:text-xl font-bold text-purple-600">
                4
              </span>
            </div>
            <h3 className="font-semibold mb-2 text-sm sm:text-base">
              Confirmation
            </h3>
            <p className="text-purple-700 text-xs sm:text-sm">
              Votre eSIM est prête à être utilisée !
            </p>
          </div>
        </div>
      </section>

      {/* Modal panier */}
      {showCartModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 max-w-sm w-full text-center">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-purple-700">
              Ajouté au panier !
            </h2>
            <p className="mb-6 text-sm sm:text-base">
              Le forfait{" "}
              <span className="font-semibold">
                {selectedPackage?.data_amount} {selectedPackage?.data_unit}
              </span>{" "}
              a bien été ajouté à votre panier.
            </p>
            <div className="flex flex-col gap-3">
              <button
                className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-600 transition-all duration-300 text-sm sm:text-base"
                onClick={() => router.push("/cart")}
              >
                Voir le panier
              </button>
              <button
                className="w-full border border-purple-200 text-purple-700 py-3 px-4 rounded-xl font-semibold hover:bg-purple-50 transition-all duration-300 text-sm sm:text-base"
                onClick={() => setShowCartModal(false)}
              >
                Continuer mes achats
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up récapitulatif + formulaire avant Stripe */}
      {showRecapModal && selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 w-full max-w-md mx-auto relative animate-fade-in">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
              onClick={() => setShowRecapModal(false)}
              aria-label="Fermer"
            >
              ×
            </button>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-purple-700 pr-8">
              Récapitulatif de la commande
            </h2>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-bold">
                  {selectedPackage.data_amount}{" "}
                  {selectedPackage.data_unit === "GB"
                    ? "Go"
                    : selectedPackage.data_unit}
                </span>
                {selectedPackage.operator_logo_url ? (
                  <Image
                    src={selectedPackage.operator_logo_url}
                    alt={selectedPackage.operator_name || ""}
                    width={24}
                    height={24}
                    className="rounded-full bg-white border border-gray-100"
                  />
                ) : (
                  <span className="text-xs text-gray-400">
                    {selectedPackage.operator_name}
                  </span>
                )}
              </div>
              <div className="text-gray-500 text-sm mb-1">
                {selectedPackage.slug &&
                  selectedPackage.slug
                    .replace(/days?/gi, "jours")
                    .replace(/gb/gi, "Go")}
              </div>
              <div className="flex gap-1 flex-wrap text-xs mb-1">
                <span
                  className={`px-2 py-0.5 rounded-full font-semibold ${selectedPackage.includes_sms ? "bg-orange-50 text-orange-700" : "bg-gray-100 text-gray-400"}`}
                >
                  SMS {selectedPackage.includes_sms ? "Oui" : "Non"}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full font-semibold ${selectedPackage.includes_voice ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-400"}`}
                >
                  Appels {selectedPackage.includes_voice ? "Oui" : "Non"}
                </span>
              </div>
              <div className="text-xl font-bold text-gray-900 mb-2">
                {(() => {
                  let price = selectedPackage.final_price_eur! * (1 + margin);
                  let symbol = "€";
                  if (currency === "USD") {
                    price = selectedPackage.final_price_usd! * (1 + margin);
                    symbol = "$";
                  } else if (currency === "XPF") {
                    price = selectedPackage.final_price_xpf! * (1 + margin);
                    symbol = "₣";
                  }
                  return `${price.toFixed(2)} ${symbol}`;
                })()}
              </div>
            </div>
            <form onSubmit={handleRecapSubmit} className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  name="prenom"
                  placeholder="Prénom *"
                  value={form.prenom}
                  onChange={handleFormChange}
                  className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 placeholder-gray-500 text-base"
                  style={{
                    WebkitTextFillColor: "#111827",
                    opacity: 1,
                    color: "#111827",
                  }}
                  required
                />
                <input
                  type="text"
                  name="nom"
                  placeholder="Nom *"
                  value={form.nom}
                  onChange={handleFormChange}
                  className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 placeholder-gray-500 text-base"
                  style={
                    {
                      WebkitTextFillColor: "#111827",
                      color: "#111827",
                    } as React.CSSProperties
                  }
                  required
                />
              </div>
              <input
                type="email"
                name="email"
                placeholder="Email *"
                value={form.email}
                onChange={handleFormChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 placeholder-gray-500 text-base"
                style={
                  {
                    WebkitTextFillColor: "#111827",
                    color: "#111827",
                  } as React.CSSProperties
                }
                required
              />
              <input
                type="text"
                name="codePromo"
                placeholder="Code promo (optionnel)"
                value={form.codePromo}
                onChange={handleFormChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500 text-base"
                style={
                  {
                    WebkitTextFillColor: "#111827",
                    color: "#111827",
                  } as React.CSSProperties
                }
              />
              <input
                type="text"
                name="codePartenaire"
                placeholder="Code partenaire (optionnel)"
                value={form.codePartenaire}
                onChange={handleFormChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500 text-base"
                style={
                  {
                    WebkitTextFillColor: "#111827",
                    color: "#111827",
                  } as React.CSSProperties
                }
              />
              {formError && (
                <div className="text-red-500 text-sm mb-2">{formError}</div>
              )}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-orange-500 text-white py-3 px-4 rounded-xl font-bold text-base sm:text-lg shadow-md hover:from-purple-700 hover:to-orange-600 transition"
              >
                Payer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
