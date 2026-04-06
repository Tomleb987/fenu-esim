"use client";

import Link from "next/link";
import Head from "next/head";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import PackageCard from "@/components/shop/PackageCard";
import type { Database } from "@/lib/supabase/config";
import ChatWidget from "@/components/ChatWidget";
import {
  ArrowRight,
  Wifi,
  CheckCircle,
  Globe,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Smartphone,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TRUSTPILOT REVIEWS — Composant autonome (aucun script externe requis)
// ─────────────────────────────────────────────────────────────────────────────

const REVIEWS = [
  { id: 12, author: "Papeete", country: "🇫🇷 France", rating: 5, date: "Août 2025", title: "Le top !!", text: "Le top!!! trop facile et fiable. Je recommande fortement. Merci", destination: "Monde" },
  { id: 13, author: "Jean-François YUE", country: "🇵🇫 Polynésie", rating: 5, date: "Juillet 2025", title: "Rapide et efficace", text: "Rapide et efficace trop bien merci FENUA SIM", destination: "Monde" },
  { id: 14, author: "Ym H", country: "🇳🇿 Nouvelle-Zélande", rating: 5, date: "Juillet 2025", title: "Super service", text: "Super service !", destination: "Monde" },
  { id: 9, author: "Pacific Kite", country: "🇵🇫 Polynésie", rating: 5, date: "Mars 2026", title: "J'ai utilisé ma eSIM au Japon", text: "Tout a bien fonctionné. Mon ami n'est pas arrivé à se connecter avec la sienne, surtout par manque d'habitude. Le service client a été extraordinaire pour nous dépanner. Un grand merci. Je recommande fortement Fenuasim.", destination: "Japon" },
  { id: 10, author: "Nero Almeida", country: "🇳🇨 Nouvelle-Calédonie", rating: 5, date: "Mars 2026", title: "10/10", text: "Rapide, efficace et fiable !", destination: "Monde" },
  { id: 11, author: "Low de Bora", country: "🇵🇫 Polynésie", rating: 5, date: "Mars 2026", title: "Je recommande à 1000% Fenua SIM", text: "Support technique au TOP et surtout aucun bug durant tout mon séjour aux USA. SATISFAITE à 2000%. Mauruuru Fenua SIM.", destination: "États-Unis" },
  { id: 1, author: "Phil", country: "🇵🇫 Polynésie", rating: 5, date: "Février 2026", title: "Très satisfait", text: "Très satisfait! Aucun problème de connexion au Japon, grande ville et village dans les montagnes! Au top :)", destination: "Japon" },
  { id: 2, author: "Bajon Gregory", country: "🇸🇬 Singapour", rating: 5, date: "Février 2026", title: "Expérience extrêmement satisfaisante", text: "Expérience extrêmement satisfaisante. Je conseille fortement.", destination: "Monde" },
  { id: 3, author: "Nelly M.", country: "🇵🇫 Polynésie", rating: 5, date: "Janvier 2026", title: "eSIM utilisée aux États-Unis", text: "Tout était parfait, de la mise en place rapide à son utilisation sans aucun souci durant la totalité de mon séjour. Très bon rapport qualité prix. Pour mon prochain séjour, pas besoin de réfléchir, c'est Fenua SIM qui m'accompagnera.", destination: "États-Unis" },
  { id: 4, author: "Dereeper", country: "🇲🇬 Madagascar", rating: 5, date: "Janvier 2026", title: "1ère expérience avec Fenuasim", text: "Dès les premiers contacts j'ai tout de suite constaté une forte réactivité. Réactivité plus que confirmée lors des petits soucis rencontrés en début de voyage. Vous êtes super et je vous recommande à 100%.", destination: "Monde" },
  { id: 5, author: "Ateo M.", country: "🇵🇫 Polynésie", rating: 5, date: "Novembre 2025", title: "Fonctionne en Égypte", text: "Fonctionne en Égypte, en Turquie et France et surtout la eSIM dure longtemps. Au top 🙏👌", destination: "Égypte" },
  { id: 6, author: "Hélène M.", country: "🇵🇫 Polynésie", rating: 5, date: "Octobre 2025", title: "Foncez !", text: "J'ai utilisé une carte Fenuasim aux USA puis j'ai rechargé en 2 minutes top chrono ! Comparé à d'autres eSIM testées en même temps, Fenuasim est beaucoup mieux. En plus, l'équipe est toujours là en cas de soucis. Je conseille à 1000%", destination: "États-Unis" },
  { id: 7, author: "Mirella A.", country: "🇮🇹 Italie", rating: 5, date: "Septembre 2025", title: "Super, sérieux", text: "Super service. Grâce au professionnalisme de Thomas tout a été réglé très rapidement. Il n'a pas lésé sur les moyens de communication jusqu'à ce que je sois connectée. MERCI encore à Thomas pour le suivi et surtout pour ton professionnalisme. MAURUURU", destination: "Italie" },
  { id: 8, author: "Thomas", country: "🇳🇨 Nouvelle-Calédonie", rating: 5, date: "Juillet 2025", title: "eSIM Nouvelle-Zélande", text: "C'était rapide et efficace. La eSIM s'est activée dès mon arrivée à l'aéroport, aucun problème de connexion pendant mon séjour. J'ai pris 10 Go pendant 5 jours ce qui était amplement suffisant.", destination: "Nouvelle-Zélande" },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill={s <= rating ? "#00b67a" : "#e0e0e0"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function TrustpilotSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const VISIBLE = 3;

  const startAuto = useCallback(() => {
    intervalRef.current = setInterval(() => {
      setActiveIndex((p) => (p + 1) % REVIEWS.length);
    }, 4500);
  }, []);

  const stopAuto = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    startAuto();
    return () => stopAuto();
  }, [startAuto, stopAuto]);

  const go = (dir: 1 | -1) => {
    if (isAnimating) return;
    stopAuto();
    setIsAnimating(true);
    setTimeout(() => {
      setActiveIndex((p) => (p + dir + REVIEWS.length) % REVIEWS.length);
      setIsAnimating(false);
      startAuto();
    }, 250);
  };

  const visible = Array.from({ length: VISIBLE }, (_, i) => REVIEWS[(activeIndex + i) % REVIEWS.length]);

  return (
    <section className="py-16 bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-widest mb-4">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            Avis vérifiés
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
            Ils voyagent avec <span className="text-emerald-600">FenuaSIM</span>
          </h2>
          <p className="text-gray-500 max-w-md mx-auto">Des milliers de voyageurs nous font confiance pour rester connectés partout dans le monde.</p>

          {/* Score bar */}
          <div className="inline-flex items-center gap-6 mt-6 px-8 py-4 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect width="24" height="24" rx="4" fill="#00b67a"/>
                <path d="M12 4l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 19l-6.2 3.9 2.4-7.4L2 11.4h7.6z" fill="white"/>
              </svg>
              <span className="font-bold text-gray-900 text-lg">Trustpilot</span>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <div className="text-2xl font-extrabold text-gray-900">4,5</div>
              <div className="flex gap-0.5 justify-center mt-0.5">
                {[1,2,3,4,5].map(s => (
                  <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill={s <= 4.5 ? "#00b67a" : "#e0e0e0"}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                ))}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Excellent</div>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <div className="text-2xl font-extrabold text-gray-900">14</div>
              <div className="text-xs text-gray-400">Avis clients</div>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-5"
          style={{ opacity: isAnimating ? 0 : 1, transition: "opacity 0.25s ease" }}
          onMouseEnter={stopAuto}
          onMouseLeave={startAuto}
        >
          {visible.map((review) => (
            <div key={review.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
              <span className="absolute top-2 right-4 text-7xl text-emerald-50 font-serif leading-none pointer-events-none select-none">"</span>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {review.author[0]}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{review.author}</div>
                  <div className="text-xs text-gray-400">{review.country} · {review.date}</div>
                </div>
              </div>
              <StarRating rating={review.rating} />
              <div className="mt-3 font-semibold text-gray-800 text-sm">{review.title}</div>
              <p className="mt-1.5 text-gray-500 text-sm leading-relaxed">{review.text}</p>
              <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">✈ {review.destination}</span>
                <span className="text-xs text-gray-300">{review.date}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button onClick={() => go(-1)} className="w-10 h-10 rounded-full border border-emerald-200 bg-white flex items-center justify-center text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-1.5">
            {REVIEWS.map((_, i) => (
              <button
                key={i}
                onClick={() => { stopAuto(); setActiveIndex(i); startAuto(); }}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? "w-6 bg-emerald-500" : "w-1.5 bg-gray-200"}`}
              />
            ))}
          </div>
          <button onClick={() => go(1)} className="w-10 h-10 rounded-full border border-emerald-200 bg-white flex items-center justify-center text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* CTA Trustpilot */}
        <div className="text-center mt-6">
          <a href="https://fr.trustpilot.com/review/fenuasim.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 border-b border-emerald-200 hover:border-emerald-500 pb-0.5 transition-all">
            Voir tous les avis sur Trustpilot
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const TOP_DESTINATIONS = [
  "Europe", "Japon", "Australie", "États-Unis", "Fidji",
  "Nouvelle-Zélande", "Mexique", "France", "Asie", "Monde",
];

const REGION_TRANSLATIONS: Record<string, string> = {
  "Discover Global": "Monde", "Asia": "Asie", "Europe": "Europe", "Japan": "Japon",
  "Canary Islands": "Îles Canaries", "South Korea": "Corée du Sud", "Hong Kong": "Hong Kong",
  "United States": "États-Unis", "Australia": "Australie", "New Zealand": "Nouvelle-Zélande",
  "Mexico": "Mexique", "Fiji": "Fidji", "Thailand": "Thaïlande", "Singapore": "Singapour",
  "Malaysia": "Malaisie", "Indonesia": "Indonésie", "Philippines": "Philippines",
  "Vietnam": "Viêt Nam", "India": "Inde", "China": "Chine", "Taiwan": "Taïwan",
  "United Kingdom": "Royaume-Uni", "Germany": "Allemagne", "Spain": "Espagne",
  "Italy": "Italie", "Greece": "Grèce", "Portugal": "Portugal", "Netherlands": "Pays-Bas",
  "Belgium": "Belgique", "Switzerland": "Suisse", "Austria": "Autriche", "Poland": "Pologne",
  "Czech Republic": "République tchèque", "Turkey": "Turquie", "Egypt": "Égypte",
  "Morocco": "Maroc", "South Africa": "Afrique du Sud", "Brazil": "Brésil",
  "Argentina": "Argentine", "Chile": "Chili", "Colombia": "Colombie", "Peru": "Pérou",
  "UAE": "Émirats arabes unis", "United Arab Emirates": "Émirats arabes unis",
  "Saudi Arabia": "Arabie saoudite", "Israel": "Israël", "Jordan": "Jordanie",
  "Lebanon": "Liban", "Qatar": "Qatar", "Kuwait": "Koweït", "Bahrain": "Bahreïn",
  "Oman": "Oman", "Azerbaijan": "Azerbaïdjan", "Jamaica": "Jamaïque", "Albania": "Albanie",
  "Algeria": "Algérie", "Angola": "Angola", "Armenia": "Arménie", "Bangladesh": "Bangladesh",
  "Belarus": "Biélorussie", "Bolivia": "Bolivie", "Bosnia and Herzegovina": "Bosnie-Herzégovine",
  "Botswana": "Botswana", "Bulgaria": "Bulgarie", "Cambodia": "Cambodge",
  "Cameroon": "Cameroun", "Chad": "Tchad", "Croatia": "Croatie", "Cuba": "Cuba",
  "Cyprus": "Chypre", "Denmark": "Danemark", "Dominican Republic": "République dominicaine",
  "Ecuador": "Équateur", "Estonia": "Estonie", "Ethiopia": "Éthiopie", "Finland": "Finlande",
  "Georgia": "Géorgie", "Ghana": "Ghana", "Guatemala": "Guatemala", "Honduras": "Honduras",
  "Hungary": "Hongrie", "Iceland": "Islande", "Ireland": "Irlande",
  "Ivory Coast": "Côte d'Ivoire", "Kazakhstan": "Kazakhstan", "Kenya": "Kenya",
  "Kyrgyzstan": "Kirghizistan", "Laos": "Laos", "Latvia": "Lettonie",
  "Lithuania": "Lituanie", "Luxembourg": "Luxembourg", "Madagascar": "Madagascar",
  "Malawi": "Malawi", "Maldives": "Maldives", "Mali": "Mali", "Malta": "Malte",
  "Mauritius": "Maurice", "Moldova": "Moldavie", "Mongolia": "Mongolie",
  "Montenegro": "Monténégro", "Myanmar": "Myanmar", "Namibia": "Namibie",
  "Nepal": "Népal", "Nicaragua": "Nicaragua", "Nigeria": "Nigeria",
  "North Macedonia": "Macédoine du Nord", "Norway": "Norvège", "Pakistan": "Pakistan",
  "Panama": "Panama", "Paraguay": "Paraguay", "Romania": "Roumanie", "Russia": "Russie",
  "Rwanda": "Rwanda", "Senegal": "Sénégal", "Serbia": "Serbie", "Slovakia": "Slovaquie",
  "Slovenia": "Slovénie", "Sri Lanka": "Sri Lanka", "Sweden": "Suède",
  "Tanzania": "Tanzanie", "Tunisia": "Tunisie", "Ukraine": "Ukraine", "Uruguay": "Uruguay",
  "Uzbekistan": "Ouzbékistan", "Venezuela": "Venezuela", "Zambia": "Zambie",
  "Zimbabwe": "Zimbabwe", "Canada": "Canada",
};

function getFrenchRegionName(regionFr: string | null, region: string | null): string {
  if (regionFr?.trim()) {
    const t = regionFr.trim();
    return REGION_TRANSLATIONS[t] ?? t;
  }
  if (region?.trim()) {
    const t = region.trim();
    if (REGION_TRANSLATIONS[t]) return REGION_TRANSLATIONS[t];
    const lower = t.toLowerCase();
    for (const [k, v] of Object.entries(REGION_TRANSLATIONS)) {
      if (k.toLowerCase() === lower) return v;
    }
    return t;
  }
  return "Autres";
}

type Package = Database["public"]["Tables"]["airalo_packages"]["Row"];

// ─────────────────────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<"EUR" | "XPF" | "USD">("EUR");
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [margin, setMargin] = useState(0);

  const plausible = useCallback((event: string, props?: Record<string, any>) => {
    if (typeof window !== "undefined" && (window as any).plausible) {
      (window as any).plausible(event, { props });
    }
  }, []);

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cur = localStorage.getItem("currency") as "EUR" | "USD" | "XPF" | null;
      if (cur) setCurrency(cur);
      setMargin(parseFloat(localStorage.getItem("global_margin") || "0"));
    }
  }, []);

  const getPrice = (pkg: Package, cur: string): number => {
    if (cur === "USD") return pkg.final_price_usd || 0;
    if (cur === "XPF") return pkg.final_price_xpf || 0;
    return pkg.final_price_eur || 0;
  };

  const packagesByRegion = packages.reduce((acc, pkg) => {
    const region = getFrenchRegionName(pkg.region_fr, pkg.region);
    if (!acc[region]) acc[region] = [];
    acc[region].push(pkg);
    return acc;
  }, {} as Record<string, Package[]>);

  const regionStats = Object.entries(packagesByRegion).reduce((acc, [region, pkgs]) => {
    const prices = pkgs.map((p) => getPrice(p, currency)).filter((p) => p > 0);
    const minPriceRaw = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPriceRaw = prices.length > 0 ? Math.max(...prices) : 0;
    acc[region] = {
      minData: Math.min(...pkgs.map((p) => p.data_amount ?? 0)),
      maxData: Math.max(...pkgs.map((p) => p.data_amount ?? 0)),
      minDays: Math.min(...pkgs.map((p) => parseInt(p.validity?.toString().split(" ")[0] || "0"))),
      maxDays: Math.max(...pkgs.map((p) => parseInt(p.validity?.toString().split(" ")[0] || "0"))),
      minPrice: minPriceRaw * (1 + margin),
      maxPrice: maxPriceRaw * (1 + margin),
      packageCount: pkgs.length,
      originalRegion: pkgs[0]?.region || pkgs[0]?.region_fr || region,
    };
    return acc;
  }, {} as Record<string, any>);

  const topDestinations = TOP_DESTINATIONS.filter((r) => packagesByRegion[r]);

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>FENUA SIM — eSIM pour les voyageurs depuis l'outre-mer et d'ailleurs</title>
        <meta name="description" content="Achetez votre eSIM de voyage en quelques minutes. Connexion 4G/5G dans 180+ pays, activation immédiate. Le spécialiste eSIM pour les francophones de l'Outre-mer et du monde entier." />
        <meta name="keywords" content="eSIM voyage, eSIM Outre-mer, eSIM Polynésie française, eSIM Nouvelle-Calédonie, eSIM Martinique, eSIM Guadeloupe, carte SIM voyage, connexion étranger" />
        <link rel="canonical" href="https://www.fenuasim.com/" />
        <meta property="og:title" content="FENUA SIM — eSIM pour les voyageurs depuis l'outre-mer et d'ailleurs" />
        <meta property="og:description" content="Achetez votre eSIM de voyage en quelques minutes. Connexion 4G/5G dans 180+ pays, activation immédiate, depuis l'Outre-mer et partout dans le monde." />
        <meta property="og:url" content="https://www.fenuasim.com/" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "FENUA SIM",
              url: "https://www.fenuasim.com",
              description: "Achetez votre eSIM de voyage en quelques minutes. Connexion 4G/5G dans 180+ pays, activation immédiate, depuis l'Outre-mer et partout dans le monde.",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://www.fenuasim.com/shop?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                { "@type": "Question", name: "Comment fonctionne l'eSIM ?", acceptedAnswer: { "@type": "Answer", text: "L'eSIM est une carte SIM numérique intégrée à votre téléphone. Vous recevez un QR code par email après achat, vous le scannez dans les réglages de votre téléphone, et vous êtes connecté à votre arrivée dans le pays de destination." } },
                { "@type": "Question", name: "Mon téléphone est-il compatible avec l'eSIM ?", acceptedAnswer: { "@type": "Answer", text: "La plupart des smartphones récents sont compatibles : iPhone XS et versions ultérieures, Samsung Galaxy S20+, Google Pixel 3+. Consultez notre page compatibilité pour la liste complète." } },
                { "@type": "Question", name: "Quand activer son eSIM FENUA SIM ?", acceptedAnswer: { "@type": "Answer", text: "Installez votre eSIM avant le départ (vous avez besoin d'une connexion internet), mais activez-la à votre arrivée dans le pays de destination pour éviter de consommer votre forfait pendant le vol." } },
                { "@type": "Question", name: "Peut-on recharger une eSIM FENUA SIM ?", acceptedAnswer: { "@type": "Answer", text: "Oui, la recharge est possible directement depuis votre espace client sur fenuasim.com en quelques clics, sans avoir à racheter une nouvelle eSIM." } },
              ],
            }),
          }}
        />
      </Head>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative w-full min-h-[600px] flex items-center bg-gradient-to-br from-purple-100 via-purple-50/30 to-orange-100 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-300/30 rounded-full blur-3xl opacity-70 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-300/30 rounded-full blur-3xl opacity-70 pointer-events-none" />

        {/* Sélecteur devise */}
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
                {(["EUR", "USD", "XPF"] as const).map((c) => (
                  <button key={c} onClick={() => { setCurrency(c); localStorage.setItem("currency", c); setShowCurrencyMenu(false); }} className="px-4 py-2 text-left hover:bg-purple-50 text-sm font-medium text-gray-700">
                    {c === "EUR" ? "EUR (€)" : c === "USD" ? "USD ($)" : "XPF (₣)"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 w-full py-12 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Colonne gauche */}
            <div className="text-left space-y-8 pt-8 lg:pt-0">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-purple-100 shadow-sm text-purple-700 text-sm font-bold">
                <Wifi className="w-4 h-4" />
                <span>La connexion de voyage simplifiée</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">
                Explorez le monde, <br />
                restez{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-orange-500">connecté.</span>
              </h1>
              <p className="text-lg text-gray-600 max-w-lg leading-relaxed">
                Fini le hors forfait. Activez votre eSIM en 2 minutes et profitez de la data locale dans +180 pays dès l'atterrissage.
              </p>
              <div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/shop" className="inline-flex justify-center items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-purple-200 transform hover:scale-[1.02]">
                    Nos destinations <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link href="/compatibilite" className="inline-flex justify-center items-center gap-3 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 px-8 py-4 rounded-xl font-bold transition-all shadow-md transform hover:scale-[1.02]">
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

            {/* Images hero — mobile */}
            <div className="block lg:hidden mt-4">
              <div className="grid grid-cols-2 gap-4 h-40">
                <Link href="/shop?region=Japon" className="relative rounded-2xl overflow-hidden shadow-lg border-2 border-white transform translate-y-3 block">
                  <img src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=600" alt="Japon" className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 left-2 text-white font-bold text-xs drop-shadow-md">Japon</div>
                </Link>
                <Link href="/shop?region=États-Unis" className="relative rounded-2xl overflow-hidden shadow-lg border-2 border-white transform -translate-y-3 block">
                  <img src="https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=600" alt="USA" className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 left-2 text-white font-bold text-xs drop-shadow-md">États-Unis</div>
                </Link>
              </div>
            </div>

            {/* Images hero — desktop */}
            <div className="relative hidden lg:grid grid-cols-2 gap-4 h-[500px] items-center">
              <div className="space-y-4 pt-12">
                <Link href="/shop?region=Japon" className="relative h-48 rounded-2xl overflow-hidden shadow-lg border-4 border-white hover:-translate-y-1 transition-transform duration-300 group block">
                  <img src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=600" alt="Japon" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute bottom-3 left-3 text-white font-bold text-sm drop-shadow-md">Japon</div>
                </Link>
                <Link href="/shop?region=États-Unis" className="relative h-64 rounded-2xl overflow-hidden shadow-lg border-4 border-white hover:-translate-y-1 transition-transform duration-300 group block">
                  <img src="https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=600" alt="USA" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute bottom-3 left-3 text-white font-bold text-sm drop-shadow-md">États-Unis</div>
                </Link>
              </div>
              <div className="space-y-4 pb-12">
                <Link href="/shop?region=Monde" className="relative h-64 rounded-2xl overflow-hidden shadow-lg border-4 border-white hover:-translate-y-1 transition-transform duration-300 group block">
                  <img src="https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=600" alt="Monde" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute bottom-3 left-3 text-white font-bold text-sm drop-shadow-md">Monde</div>
                </Link>
                <Link href="/shop?region=Europe" className="relative h-48 rounded-2xl overflow-hidden shadow-lg border-4 border-white hover:-translate-y-1 transition-transform duration-300 group block">
                  <img src="https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=600" alt="Europe" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute bottom-3 left-3 text-white font-bold text-sm drop-shadow-md">Europe</div>
                </Link>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-xl border border-white z-20 flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-600" />
                <span className="font-bold text-gray-800 text-sm whitespace-nowrap">180+ Destinations</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── DESTINATIONS ─────────────────────────────────────────────────────── */}
      <div className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-8 sm:mb-12">
            Destinations populaires
          </h2>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-40 sm:h-48" />
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
                    currency={currency}
                    isPopular={true}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── AVIS CLIENTS — composant autonome, aucun script externe ─────────── */}
      <TrustpilotSection />

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <div className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-8">
            Questions fréquentes
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              { q: "Comment fonctionne l'eSIM ?", a: "Vous recevez un QR code par email, vous scannez, c'est connecté." },
              { q: "Mon appareil est-il compatible ?", a: "La majorité des téléphones récents le sont. Vérifiez notre page compatibilité." },
              { q: "Quand activer mon eSIM ?", a: "Installez-la avant de partir, elle s'activera sur place." },
            ].map((item, i) => (
              <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-2">{item.q}</h3>
                <p className="text-gray-600">{item.a}</p>
              </div>
            ))}
            <div className="text-center mt-8">
              <Link href="/faq" className="text-purple-600 font-bold hover:underline">
                Voir toutes les questions →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ChatWidget />
    </div>
  );
}
