"use client";

import Link from "next/link";
import Image from "next/image";
import Head from "next/head";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import PackageCard from "@/components/shop/PackageCard";
import type { Database } from "@/lib/supabase/config";
import ChatWidget from "@/components/ChatWidget";
import {
  ArrowRight,
  Wifi,
  CheckCircle,
  ShieldCheck,
  MapPin,
  Globe,
  ChevronDown,
  Star,
  Smartphone,
  Zap,
} from "lucide-react";

// --- CONSTANTES ---

const TOP_DESTINATIONS = [
  "Europe",
  "Japon",
  "Australie",
  "États-Unis",
  "Fidji",
  "Nouvelle-Zélande",
  "Mexique",
  "France",
  "Asie",
  "Monde",
];

const REGION_TRANSLATIONS: Record<string, string> = {
  "Discover Global": "Monde",
  "Asia": "Asie",
  "Europe": "Europe",
  "Japan": "Japon",
  "Canary Islands": "Îles Canaries",
  "South Korea": "Corée du Sud",
  "Hong Kong": "Hong Kong",
  "United States": "États-Unis",
  "Australia": "Australie",
  "New Zealand": "Nouvelle-Zélande",
  "Mexico": "Mexique",
  "Fiji": "Fidji",
  "Thailand": "Thaïlande",
  "Singapore": "Singapour",
  "Malaysia": "Malaisie",
  "Indonesia": "Indonésie",
  "Philippines": "Philippines",
  "Vietnam": "Viêt Nam",
  "India": "Inde",
  "China": "Chine",
  "Taiwan": "Taïwan",
  "United Kingdom": "Royaume-Uni",
  "Germany": "Allemagne",
  "Spain": "Espagne",
  "Italy": "Italie",
  "Greece": "Grèce",
  "Portugal": "Portugal",
  "Netherlands": "Pays-Bas",
  "Belgium": "Belgique",
  "Switzerland": "Suisse",
  "Austria": "Autriche",
  "Poland": "Pologne",
  "Czech Republic": "République tchèque",
  "Turkey": "Turquie",
  "Egypt": "Égypte",
  "Morocco": "Maroc",
  "South Africa": "Afrique du Sud",
  "Brazil": "Brésil",
  "Argentina": "Argentine",
  "Chile": "Chili",
  "Colombia": "Colombie",
  "Peru": "Pérou",
  "UAE": "Émirats arabes unis",
  "United Arab Emirates": "Émirats arabes unis",
  "Saudi Arabia": "Arabie saoudite",
  "Israel": "Israël",
  "Jordan": "Jordanie",
  "Lebanon": "Liban",
  "Qatar": "Qatar",
  "Kuwait": "Koweït",
  "Bahrain": "Bahreïn",
  "Oman": "Oman",
  "Azerbaijan": "Azerbaïdjan",
  "Jamaica": "Jamaïque",
  "Albania": "Albanie",
  "Algeria": "Algérie",
  "Angola": "Angola",
  "Armenia": "Arménie",
  "Bangladesh": "Bangladesh",
  "Belarus": "Biélorussie",
  "Bolivia": "Bolivie",
  "Bosnia and Herzegovina": "Bosnie-Herzégovine",
  "Botswana": "Botswana",
  "Bulgaria": "Bulgarie",
  "Cambodia": "Cambodge",
  "Cameroon": "Cameroun",
  "Chad": "Tchad",
  "Croatia": "Croatie",
  "Cuba": "Cuba",
  "Cyprus": "Chypre",
  "Denmark": "Danemark",
  "Dominican Republic": "République dominicaine",
  "Ecuador": "Équateur",
  "Estonia": "Estonie",
  "Ethiopia": "Éthiopie",
  "Finland": "Finlande",
  "Georgia": "Géorgie",
  "Ghana": "Ghana",
  "Guatemala": "Guatemala",
  "Honduras": "Honduras",
  "Hungary": "Hongrie",
  "Iceland": "Islande",
  "Ireland": "Irlande",
  "Ivory Coast": "Côte d'Ivoire",
  "Kazakhstan": "Kazakhstan",
  "Kenya": "Kenya",
  "Kyrgyzstan": "Kirghizistan",
  "Laos": "Laos",
  "Latvia": "Lettonie",
  "Lithuania": "Lituanie",
  "Luxembourg": "Luxembourg",
  "Madagascar": "Madagascar",
  "Malawi": "Malawi",
  "Maldives": "Maldives",
  "Mali": "Mali",
  "Malta": "Malte",
  "Mauritius": "Maurice",
  "Moldova": "Moldavie",
  "Mongolia": "Mongolie",
  "Montenegro": "Monténégro",
  "Myanmar": "Myanmar",
  "Namibia": "Namibie",
  "Nepal": "Népal",
  "Nicaragua": "Nicaragua",
  "Nigeria": "Nigeria",
  "North Macedonia": "Macédoine du Nord",
  "Norway": "Norvège",
  "Pakistan": "Pakistan",
  "Panama": "Panama",
  "Paraguay": "Paraguay",
  "Romania": "Roumanie",
  "Russia": "Russie",
  "Rwanda": "Rwanda",
  "Senegal": "Sénégal",
  "Serbia": "Serbie",
  "Slovakia": "Slovaquie",
  "Slovenia": "Slovénie",
  "Sri Lanka": "Sri Lanka",
  "Sweden": "Suède",
  "Tanzania": "Tanzanie",
  "Tunisia": "Tunisie",
  "Ukraine": "Ukraine",
  "Uruguay": "Uruguay",
  "Uzbekistan": "Ouzbékistan",
  "Venezuela": "Venezuela",
  "Zambia": "Zambie",
  "Zimbabwe": "Zimbabwe",
  "Canada": "Canada",
};

function getFrenchRegionName(regionFr: string | null, region: string | null): string {
  if (regionFr && regionFr.trim()) {
    const trimmedFr = regionFr.trim();
    if (REGION_TRANSLATIONS[trimmedFr]) return REGION_TRANSLATIONS[trimmedFr];
    return trimmedFr;
  }
  if (region && region.trim()) {
    const trimmedRegion = region.trim();
    if (REGION_TRANSLATIONS[trimmedRegion]) return REGION_TRANSLATIONS[trimmedRegion];
    const lowerRegion = trimmedRegion.toLowerCase();
    for (const [key, value] of Object.entries(REGION_TRANSLATIONS)) {
      if (key.toLowerCase() === lowerRegion) return value;
    }
  }
  return region?.trim() || "Autres";
}

type Package = Database["public"]["Tables"]["airalo_packages"]["Row"];

export default function Home() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- GESTION DE LA DEVISE ---
  const [currency, setCurrency] = useState<"EUR" | "XPF" | "USD">("EUR"); 
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [margin, setMargin] = useState(0);

  const plausible = useCallback((event: string, props?: Record<string, any>) => {
    if (typeof window !== "undefined" && (window as any).plausible) {
      (window as any).plausible(event, { props });
    }
  }, []);

  // Fetch forfaits
  useEffect(() => {
    async function fetchPackages() {
      const { data } = await supabase
        .from("airalo_packages")
        .select("*")
        .order("final_price_eur", { ascending: true });
      setPackages(data || []);
      setLoading(false);
    }
    fetchPackages();
  }, []);

  // Récupération devise & marge depuis localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cur = localStorage.getItem("currency") as
        | "EUR"
        | "USD"
        | "XPF"
        | null;
      if (cur) setCurrency(cur);

      const storedMargin = parseFloat(localStorage.getItem("global_margin") || "0");
      setMargin(storedMargin);
    }
  }, []);

  // Trustpilot widget
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://invitejs.trustpilot.com/tp.min.js";
    script.async = true;
    document.body.appendChild(script);
    script.onload = () => {
      /* @ts-ignore */
      if (window.tp) {
        /* @ts-ignore */
        window.tp("register", "t5j5yxc20tHVgyo");
      }
    };
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Helper pour obtenir le prix selon la devise
  const getPrice = (pkg: Package, currency: string): number => {
    switch (currency) {
      case "USD":
        return pkg.final_price_usd || 0;
      case "XPF":
        return pkg.final_price_xpf || 0;
      default:
        return pkg.final_price_eur || 0;
    }
  };

  // Group forfaits by region
  const packagesByRegion = packages.reduce(
    (acc, pkg) => {
      const region = getFrenchRegionName(pkg.region_fr, pkg.region);
      if (!acc[region]) acc[region] = [];
      acc[region].push(pkg);
      return acc;
    },
    {} as Record<string, Package[]>
  );

  // Stats per region (UTILISATION DE getPrice POUR LA CONVERSION)
  const regionStats = Object.entries(packagesByRegion).reduce(
    (acc, [region, pkgs]) => {
      // Calcul des prix avec la fonction getPrice qui gère la devise active
      const prices = pkgs.map((p) => getPrice(p, currency)).filter((p) => p > 0);
      
      // Calcul du min et max
      const minPriceRaw = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPriceRaw = prices.length > 0 ? Math.max(...prices) : 0;

      // Application de la marge (si elle existe)
      const minPrice = minPriceRaw * (1 + margin);
      const maxPrice = maxPriceRaw * (1 + margin);

      acc[region] = {
        minData: Math.min(...pkgs.map((p) => p.data_amount ?? 0)),
        maxData: Math.max(...pkgs.map((p) => p.data_amount ?? 0)),
        minDays: Math.min(
          ...pkgs.map((p) =>
          parseInt(p.validity?.toString().split(" ")[0] || "0")
        )),
        maxDays: Math.max(
          ...pkgs.map((p) =>
            parseInt(p.validity?.toString().split(" ")[0] || "0")
          )
        ),
        minPrice: minPrice, // Le prix est maintenant dans la bonne devise + marge
        maxPrice: maxPrice,
        packageCount: pkgs.length,
        // On garde aussi le nom original pour les liens si besoin
        originalRegion: pkgs[0]?.region || pkgs[0]?.region_fr || region
      };
      return acc;
    },
    {} as Record<string, any>
  );

  const topDestinations = TOP_DESTINATIONS.filter(
    (region) => packagesByRegion[region]
  );

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "Comment fonctionne l'eSIM ?",
                  "acceptedAnswer": { "@type": "Answer", "text": "L'eSIM est une carte SIM intégrée à votre appareil..." },
                },
                {
                  "@type": "Question",
                  "name": "Mon appareil est-il compatible ?",
                  "acceptedAnswer": { "@type": "Answer", "text": "La plupart des smartphones récents sont compatibles..." },
                },
              ],
            }),
          }}
        />
      </Head>

      {/* ----------------------------------------------------------------------------------
          HERO SECTION
         ---------------------------------------------------------------------------------- */}
      <section className="relative w-full min-h-[600px] flex items-center bg-gradient-to-br from-purple-100 via-purple-50/30 to-orange-100 overflow-hidden">
        
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-300/30 rounded-full blur-3xl opacity-70 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-300/30 rounded-full blur-3xl opacity-70 pointer-events-none"></div>

        {/* --- SELECTEUR DE DEVISE --- */}
        <div className="absolute top-6 right-6 md:right-12 z-50">
          <div className="relative">
            <button 
              onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
              className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-gray-200 text-gray-700 font-bold hover:bg-white transition-all text-sm"
            >
              <Globe className="w-4 h-4 text-purple-600" />
              <span>{currency}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showCurrencyMenu ? "rotate-180" : ""}`} />
            </button>

            {showCurrencyMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 flex flex-col">
                <button onClick={() => { setCurrency("EUR"); localStorage.setItem("currency", "EUR"); setShowCurrencyMenu(false); }} className="px-4 py-2 text-left hover:bg-purple-50 text-sm font-medium text-gray-700">EUR (€)</button>
                <button onClick={() => { setCurrency("USD"); localStorage.setItem("currency", "USD"); setShowCurrencyMenu(false); }} className="px-4 py-2 text-left hover:bg-purple-50 text-sm font-medium text-gray-700">USD ($)</button>
                <button onClick={() => { setCurrency("XPF"); localStorage.setItem("currency", "XPF"); setShowCurrencyMenu(false); }} className="px-4 py-2 text-left hover:bg-purple-50 text-sm font-medium text-gray-700">XPF (₣)</button>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 w-full py-12 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            
            {/* COLONNE GAUCHE */}
            <div className="text-left space-y-8 pt-8 lg:pt-0">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-purple-100 shadow-sm text-purple-700 text-sm font-bold">
                <Wifi className="w-4 h-4" />
                <span>La connexion de voyage simplifiée</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">
                Explorez le monde, <br />
                restez <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-orange-500">connecté.</span>
              </h1>

              <p className="text-lg text-gray-600 max-w-lg leading-relaxed">
                Fini le hors forfait. Activez votre eSIM en 2 minutes et profitez de la data locale dans +180 pays dès l'atterrissage.
              </p>

              <div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link 
                    href="/shop"
                    className="inline-flex justify-center items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-purple-200 transform hover:scale-[1.02]"
                  >
                    Nos destinations <ArrowRight className="w-5 h-5" />
                  </Link>

                  <Link 
                    href="https://www.fenuasim.com/compatibilite"
                    className="inline-flex justify-center items-center gap-3 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 px-8 py-4 rounded-xl font-bold transition-all shadow-md transform hover:scale-[1.02]"
                  >
                    <Smartphone className="w-5 h-5" />
                    Vérifier la compatibilité
                  </Link>
                </div>

                <p className="mt-4 text-sm text-gray-500 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Installation instantanée par QR code
                </p>
              </div>
            </div>

            {/* VERSION MOBILE */}
            <div className="block lg:hidden mt-4">
              <div className="grid grid-cols-2 gap-4 h-40">
                 <div className="relative rounded-2xl overflow-hidden shadow-lg border-2 border-white transform translate-y-3">
                    <img src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=600" alt="Japon" className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 left-2 text-white font-bold text-xs drop-shadow-md">Japon</div>
                 </div>
                 <div className="relative rounded-2xl overflow-hidden shadow-lg border-2 border-white transform -translate-y-3">
                    <img src="https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=600" alt="USA" className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 left-2 text-white font-bold text-xs drop-shadow-md">États-Unis</div>
                 </div>
              </div>
            </div>

            {/* VERSION DESKTOP */}
            <div className="relative hidden lg:grid grid-cols-2 gap-4 h-[500px] items-center">
              <div className="space-y-4 pt-12">
                 <div className="relative h-48 rounded-2xl overflow-hidden shadow-lg border-4 border-white transform hover:-translate-y-1 transition-transform duration-300 group">
                    <img src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=600" alt="Japon" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute bottom-3 left-3 text-white font-bold text-sm drop-shadow-md">Japon</div>
                 </div>
                 <div className="relative h-64 rounded-2xl overflow-hidden shadow-lg border-4 border-white transform hover:-translate-y-1 transition-transform duration-300 group">
                    <img src="https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=600" alt="USA" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute bottom-3 left-3 text-white font-bold text-sm drop-shadow-md">États-Unis</div>
                 </div>
              </div>
              <div className="space-y-4 pb-12">
                 <div className="relative h-64 rounded-2xl overflow-hidden shadow-lg border-4 border-white transform hover:-translate-y-1 transition-transform duration-300 group">
                    <img src="https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=600" alt="Monde" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute bottom-3 left-3 text-white font-bold text-sm drop-shadow-md">Monde</div>
                 </div>
                 <div className="relative h-48 rounded-2xl overflow-hidden shadow-lg border-4 border-white transform hover:-translate-y-1 transition-transform duration-300 group">
                    <img src="https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=600" alt="Europe" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute bottom-3 left-3 text-white font-bold text-sm drop-shadow-md">Europe</div>
                 </div>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-xl border border-white z-20 flex items-center gap-2 animate-bounce-slow">
                 <Globe className="w-5 h-5 text-purple-600" />
                 <span className="font-bold text-gray-800 text-sm whitespace-nowrap">180+ Destinations</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Destinations */}
      <div className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-8 sm:mb-12">
            Destinations populaires
          </h2>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-40 sm:h-48" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
              {topDestinations.map((region) => {
                const pkg = packagesByRegion[region]?.[0];
                if (!pkg) return null;
                
                // On récupère les stats calculées avec la bonne devise
                const stats = regionStats[region];

                return (
                  <PackageCard
                    key={region}
                    pkg={pkg}
                    {...stats}
                    // On passe la devise pour que PackageCard affiche le bon symbole
                    currency={currency}
                    isPopular={true}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Avis Clients */}
      <div className="max-w-3xl mx-auto my-12 px-4">
        <div className="bg-gradient-to-r from-purple-50 to-orange-50 rounded-2xl shadow-lg p-8 flex flex-col items-center border border-purple-100">
          <h3 className="text-2xl sm:text-3xl font-bold text-purple-800 mb-2 text-center">Ce que nos clients disent de FenuaSIM</h3>
          <p className="text-gray-700 text-center mb-6 max-w-xl">Votre satisfaction est notre priorité.</p>
          <div className="trustpilot-widget w-full" data-locale="fr-FR" data-template-id="53aa8807dec7e10d38f59f32" data-businessunit-id="t5j5yxc20tHVgyo" data-style-height="500px" data-style-width="100%" data-theme="light">
            <a href="https://fr.trustpilot.com/review/fenuasim.com" target="_blank" rel="noopener" className="text-purple-700 underline flex justify-center">Voir tous les avis sur Trustpilot</a>
          </div>
        </div>
      </div>

      {/* Avantages & FAQ */}
      <div className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-8">Questions fréquentes</h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {[{q: "Comment fonctionne l'eSIM ?", a: "Vous recevez un QR code par email, vous scannez, c'est connecté."}, {q: "Mon appareil est-il compatible ?", a: "La majorité des téléphones récents le sont. Vérifiez notre page compatibilité."}, {q: "Quand activer mon eSIM ?", a: "Installez-la avant de partir, elle s'activera sur place."}].map((item, i) => (
               <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                 <h3 className="font-bold text-gray-900 mb-2">{item.q}</h3>
                 <p className="text-gray-600">{item.a}</p>
               </div>
            ))}
            <div className="text-center mt-8">
              <Link href="/faq" className="text-purple-600 font-bold hover:underline">Voir toutes les questions &rarr;</Link>
            </div>
          </div>
        </div>
      </div>

      <ChatWidget />
    </div>
  );
}
