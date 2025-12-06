import Link from "next/link";
import Image from "next/image";
import Head from "next/head";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import PackageCard from "@/components/shop/PackageCard";
import type { Database } from "@/lib/supabase/config";
import ChatWidget from "@/components/ChatWidget";
import { 
  ArrowRight, Wifi, CheckCircle, ShieldCheck, MapPin, Globe, ChevronDown 
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
  const [currency, setCurrency] = useState("EUR"); 
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);

  // Plausible analytics helper
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

  // Stats per region
  const regionStats = Object.entries(packagesByRegion).reduce(
    (acc, [region, pkgs]) => {
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
        minPrice: Math.min(...pkgs.map((p) => p.final_price_eur ?? 0)),
        packageCount: pkgs.length,
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
        {/* FAQ JSON-LD */}
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
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text":
                      "L'eSIM est une carte SIM intégrée à votre appareil. Vous recevez un QR code par email que vous scannez pour activer votre forfait.",
                  },
                },
                {
                  "@type": "Question",
                  "name": "Mon appareil est-il compatible ?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text":
                      "La plupart des smartphones récents sont compatibles avec l'eSIM. Vérifiez la compatibilité de votre appareil dans notre guide.",
                  },
                },
                {
                  "@type": "Question",
                  "name": "Quand dois-je activer mon eSIM ?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text":
                      "Vous pouvez installer votre eSIM avant votre voyage, mais elle ne s'activera qu'à votre arrivée à destination.",
                  },
                },
              ],
            }),
          }}
        />
      </Head>

      {/* ----------------------------------------------------------------------------------
          HERO SECTION (COULEUR + MOSAÏQUE + DEVISE)
         ---------------------------------------------------------------------------------- */}
      <section className="relative w-full min-h-[600px] flex items-center bg-gradient-to-br from-purple-100 via-purple-50/30 to-orange-100 overflow-hidden">
        
        {/* Cercles décoratifs plus soutenus */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-300/30 rounded-full blur-3xl opacity-70 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-300/30 rounded-full blur-3xl opacity-70 pointer-events-none"></div>

        {/* --- SELECTEUR DE DEVISE (FLOTTANT) --- */}
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
                <button onClick={() => { setCurrency("EUR"); setShowCurrencyMenu(false); }} className="px-4 py-2 text-left hover:bg-purple-50 text-sm font-medium text-gray-700">EUR (€)</button>
                <button onClick={() => { setCurrency("USD"); setShowCurrencyMenu(false); }} className="px-4 py-2 text-left hover:bg-purple-50 text-sm font-medium text-gray-700">USD ($)</button>
                <button onClick={() => { setCurrency("XPF"); setShowCurrencyMenu(false); }} className="px-4 py-2 text-left hover:bg-purple-50 text-sm font-medium text-gray-700">XPF (₣)</button>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 w-full py-12 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            
            {/* COLONNE GAUCHE : CONTENU */}
            <div className="text-left space-y-8">
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
                <Link 
                  href="/shop"
                  className="inline-flex items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-purple-200 transform hover:scale-[1.02]"
                >
                  Nos destinations <ArrowRight className="w-5 h-5" />
                </Link>
                <p className="mt-4 text-sm text-gray-500 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Installation instantanée par QR code
                </p>
              </div>
            </div>

            {/* COLONNE DROITE : MOSAÏQUE VISUELLE */}
            <div className="relative hidden lg:grid grid-cols-2 gap-4 h-[500px] items-center">
              <div className="space-y-4 pt-12">
                 {/* Carte 1 */}
                 <div className="relative h-48 rounded-2xl overflow-hidden shadow-lg border-4 border-white transform hover:-translate-y-1 transition-transform duration-300 group">
                    <img 
                      src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=600" 
                      alt="Japon" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 text-white font-bold text-sm drop-shadow-md">Japon</div>
                 </div>
                 {/* Carte 2 */}
                 <div className="relative h-64 rounded-2xl overflow-hidden shadow-lg border-4 border-white transform hover:-translate-y-1 transition-transform duration-300 group">
                    <img 
                      src="https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=600" 
                      alt="USA" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 text-white font-bold text-sm drop-shadow-md">États-Unis</div>
                 </div>
              </div>
              <div className="space-y-4 pb-12">
                 {/* Carte 3 */}
                 <div className="relative h-64 rounded-2xl overflow-hidden shadow-lg border-4 border-white transform hover:-translate-y-1 transition-transform duration-300 group">
                    <img 
                      src="https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=600" 
                      alt="Monde" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 text-white font-bold text-sm drop-shadow-md">Monde</div>
                 </div>
                 {/* Carte 4 */}
                 <div className="relative h-48 rounded-2xl overflow-hidden shadow-lg border-4 border-white transform hover:-translate-y-1 transition-transform duration-300 group">
                    <img 
                      src="https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=600" 
                      alt="Europe" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 text-white font-bold text-sm drop-shadow-md">Europe</div>
                 </div>
              </div>
              {/* Badge flottant */}
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
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse bg-gray-100 rounded-xl h-40 sm:h-48"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
              {topDestinations.map((region) => {
                const pkg = packagesByRegion[region]?.[0];
                if (!pkg) return null;
                return (
                  <PackageCard
                    key={region}
                    pkg={pkg}
                    {...regionStats[region]}
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
          <h3 className="text-2xl sm:text-3xl font-bold text-purple-800 mb-2 text-center">
            Ce que nos clients disent de FenuaSIM
          </h3>
          <p className="text-gray-700 text-center mb-6 max-w-xl">
            Votre satisfaction est notre priorité. Découvrez les avis de nos clients
            ou partagez votre expérience pour aider d'autres voyageurs à rester
            connectés partout dans le monde !
          </p>
          <div
            className="trustpilot-widget w-full"
            data-locale="fr-FR"
            data-template-id="53aa8807dec7e10d38f59f32"
            data-businessunit-id="t5j5yxc20tHVgyo"
            data-style-height="500px"
            data-style-width="100%"
            data-theme="light"
          >
            <a
              href="https://fr.trustpilot.com/review/fenuasim.com"
              target="_blank"
              rel="noopener"
              className="text-purple-700 underline flex justify-center"
            >
              Voir tous les avis sur Trustpilot
            </a>
          </div>
          <div className="mt-6 text-center">
            <span className="inline-block bg-green-100 text-green-800 text-sm font-semibold px-4 py-2 rounded-full">
              Merci à tous nos clients pour leur confiance !
            </span>
          </div>
        </div>
      </div>

      {/* Avantages */}
      <div className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            {[
              {
                title: "Configuration rapide",
                desc: "Installez votre eSIM en quelques minutes et connectez-vous instantanément.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                ),
              },
              {
                title: "Service clientèle 7/7",
                desc: "Notre équipe est disponible pour vous accompagner à tout moment.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                ),
              },
              {
                title: "Pour tous les budgets",
                desc: "Des forfaits adaptés à tous les besoins et tous les budgets.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                ),
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="flex justify-center">
                  <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-purple-100 flex items-center justify-center">
                    <svg
                      className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      {item.icon}
                    </svg>
                  </div>
                </div>
                <h3 className="mt-4 sm:mt-6 text-lg sm:text-xl font-bold text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-2 sm:mt-3 text-sm sm:text-base text-gray-500 px-2">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comment ça marche */}
      <div className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-8 sm:mb-12">
            Comment ça marche ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            {[
              {
                step: 1,
                title: "Choisissez votre forfait",
                desc: "Sélectionnez le forfait qui correspond à vos besoins.",
              },
              {
                step: 2,
                title: "Recevez votre eSIM",
                desc: "Obtenez votre eSIM par email avec un QR code.",
              },
              {
                step: 3,
                title: "Connectez-vous",
                desc: "Scannez le QR code et profitez de votre connexion.",
              },
            ].map((item, i) => (
              <div key={i} className="relative text-center">
                <div className="flex justify-center">
                  <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-purple-600 to-orange-500 text-white flex items-center justify-center text-lg sm:text-2xl font-bold">
                    {item.step}
                  </div>
                </div>
                <h3 className="mt-4 sm:mt-6 text-lg sm:text-xl font-bold text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-2 sm:mt-3 text-sm sm:text-base text-gray-500 px-2">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-8 sm:mb-12">
            Questions fréquentes
          </h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                question: "Comment fonctionne l'eSIM ?",
                answer:
                  "L'eSIM est une carte SIM intégrée à votre appareil. Vous recevez un QR code par email que vous scannez pour activer votre forfait.",
              },
              {
                question: "Mon appareil est-il compatible ?",
                answer:
                  "La plupart des smartphones récents sont compatibles avec l'eSIM. Vérifiez la compatibilité de votre appareil dans notre guide.",
              },
              {
                question: "Quand dois-je activer mon eSIM ?",
                answer:
                  "Vous pouvez installer votre eSIM avant votre voyage, mais elle ne s'activera qu'à votre arrivée à destination.",
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border border-purple-100"
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  {faq.question}
                </h3>
                <p className="mt-2 text-sm sm:text-base text-gray-500">
                  {faq.answer}
                </p>
              </div>
            ))}
            <div className="text-center mt-6 sm:mt-8">
              <Link
                href="/faq"
                className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium text-sm sm:text-base"
              >
                Voir toutes les FAQ
                <svg
                  className="ml-2 h-4 w-4 sm:h-5 sm:w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ChatWidget />
    </div>
  );
}
