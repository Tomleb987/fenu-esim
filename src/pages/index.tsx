"use client";

import Link from "next/link";
import Head from "next/head";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import PackageCard from "@/components/shop/PackageCard";
import type { Database } from "@/lib/supabase/config";
import ChatWidget from "@/components/ChatWidget";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// REVIEWS DATA
// ─────────────────────────────────────────────────────────────────────────────
const REVIEWS = [
  { id: 11, author: "Low de Bora", country: "🇵🇫 Polynésie", rating: 5, date: "Mars 2026", title: "Je recommande à 1000% Fenua SIM", text: "Support technique au TOP et surtout aucun bug durant tout mon séjour aux USA. SATISFAITE à 2000%. Mauruuru Fenua SIM.", destination: "États-Unis" },
  { id: 9, author: "Pacific Kite", country: "🇵🇫 Polynésie", rating: 5, date: "Mars 2026", title: "J'ai utilisé ma eSIM au Japon", text: "Tout a bien fonctionné. Le service client a été extraordinaire pour nous dépanner. Un grand merci. Je recommande fortement Fenuasim.", destination: "Japon" },
  { id: 6, author: "Hélène M.", country: "🇵🇫 Polynésie", rating: 5, date: "Octobre 2025", title: "Foncez !", text: "J'ai utilisé une carte Fenuasim aux USA puis j'ai rechargé en 2 minutes top chrono ! Fenuasim est beaucoup mieux. En plus, l'équipe est toujours là en cas de soucis. Je conseille à 1000%", destination: "États-Unis" },
  { id: 3, author: "Nelly M.", country: "🇵🇫 Polynésie", rating: 5, date: "Janvier 2026", title: "eSIM utilisée aux États-Unis", text: "Tout était parfait, de la mise en place rapide à son utilisation sans aucun souci durant la totalité de mon séjour. Très bon rapport qualité prix.", destination: "États-Unis" },
  { id: 7, author: "Mirella A.", country: "🇮🇹 Italie", rating: 5, date: "Septembre 2025", title: "Super, sérieux", text: "Super service. Grâce au professionnalisme de Thomas tout a été réglé très rapidement. MERCI encore à Thomas pour le suivi et ton professionnalisme. MAURUURU", destination: "Italie" },
  { id: 1, author: "Phil", country: "🇵🇫 Polynésie", rating: 5, date: "Février 2026", title: "Très satisfait", text: "Très satisfait! Aucun problème de connexion au Japon, grande ville et village dans les montagnes! Au top :)", destination: "Japon" },
  { id: 10, author: "Nero Almeida", country: "🇳🇨 Nouvelle-Calédonie", rating: 5, date: "Mars 2026", title: "10/10", text: "Rapide, efficace et fiable !", destination: "Monde" },
  { id: 8, author: "Thomas", country: "🇳🇨 Nouvelle-Calédonie", rating: 5, date: "Juillet 2025", title: "eSIM Nouvelle-Zélande", text: "C'était rapide et efficace. La eSIM s'est activée dès mon arrivée à l'aéroport, aucun problème de connexion pendant mon séjour.", destination: "Nouvelle-Zélande" },
];

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const TOP_DESTINATIONS = [
  "Europe", "Japon", "Australie", "États-Unis", "Fidji",
  "Nouvelle-Zélande", "Mexique", "France", "Asie", "Monde",
];

const REGION_TRANSLATIONS: Record<string, string> = {
  "Discover Global": "Monde", "Asia": "Asie", "Europe": "Europe", "Japan": "Japon",
  "United States": "États-Unis", "Australia": "Australie", "New Zealand": "Nouvelle-Zélande",
  "Mexico": "Mexique", "Fiji": "Fidji", "Thailand": "Thaïlande", "Singapore": "Singapour",
  "Malaysia": "Malaisie", "Indonesia": "Indonésie", "Philippines": "Philippines",
  "Vietnam": "Viêt Nam", "India": "Inde", "China": "Chine", "Taiwan": "Taïwan",
  "United Kingdom": "Royaume-Uni", "Germany": "Allemagne", "Spain": "Espagne",
  "Italy": "Italie", "Greece": "Grèce", "Portugal": "Portugal", "Netherlands": "Pays-Bas",
  "Belgium": "Belgique", "Switzerland": "Suisse", "Turkey": "Turquie",
  "Egypt": "Égypte", "Morocco": "Maroc", "South Africa": "Afrique du Sud",
  "Brazil": "Brésil", "Canada": "Canada", "South Korea": "Corée du Sud",
  "Hong Kong": "Hong Kong", "Canary Islands": "Îles Canaries",
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
// STAR RATING
// ─────────────────────────────────────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill={s <= rating ? "#00b67a" : "#e0e0e0"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REVIEWS CAROUSEL
// ─────────────────────────────────────────────────────────────────────────────
function ReviewsSection() {
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

  useEffect(() => { startAuto(); return () => stopAuto(); }, [startAuto, stopAuto]);

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
    <section style={{ background: 'linear-gradient(135deg, #F3E8FF 0%, #fff 60%)', padding: '56px 0' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
            style={{ background: '#F3E8FF', border: '1px solid #DDD6FE' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#A020F0">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#7B15B8', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Avis vérifiés
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
            Ils voyagent avec <span style={{ background: 'linear-gradient(90deg,#A020F0,#FF7F11)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FenuaSIM</span>
          </h2>
          <p className="text-gray-500 max-w-md mx-auto text-sm">Des milliers de voyageurs nous font confiance pour rester connectés partout dans le monde.</p>

          {/* Score Trustpilot */}
          <div className="inline-flex items-center gap-6 mt-6 px-8 py-4 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <div style={{ width: '28px', height: '28px', background: '#00b67a', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 4l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 19l-6.2 3.9 2.4-7.4L2 11.4h7.6z"/></svg>
              </div>
              <span className="font-bold text-gray-900">Trustpilot</span>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <div className="text-2xl font-extrabold text-gray-900">4,8</div>
              <div className="flex gap-0.5 justify-center mt-0.5">
                {[1,2,3,4,5].map(s => (
                  <svg key={s} width="12" height="12" viewBox="0 0 24 24" fill="#00b67a"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
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
          style={{ opacity: isAnimating ? 0 : 1, transition: 'opacity 0.25s ease' }}
          onMouseEnter={stopAuto}
          onMouseLeave={startAuto}
        >
          {visible.map((review) => (
            <div key={review.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
              <span className="absolute top-2 right-4 text-6xl text-purple-50 font-serif leading-none pointer-events-none select-none">"</span>
              <div className="flex items-center gap-3 mb-3">
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #A020F0, #FF7F11)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: '16px', flexShrink: 0,
                }}>
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
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#A020F0', background: '#F3E8FF', padding: '2px 10px', borderRadius: '50px' }}>
                  ✈ {review.destination}
                </span>
                <span className="text-xs text-gray-300">{review.date}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button onClick={() => go(-1)} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #DDD6FE', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#A020F0' }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-1.5">
            {REVIEWS.map((_, i) => (
              <button key={i} onClick={() => { stopAuto(); setActiveIndex(i); startAuto(); }}
                style={{ height: '6px', borderRadius: '50px', transition: 'all .3s', width: i === activeIndex ? '24px' : '6px', background: i === activeIndex ? '#A020F0' : '#E5E7EB', border: 'none', cursor: 'pointer' }} />
            ))}
          </div>
          <button onClick={() => go(1)} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #DDD6FE', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#A020F0' }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center mt-6">
          <a href="https://fr.trustpilot.com/review/fenuasim.com" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold"
            style={{ color: '#A020F0', borderBottom: '1px solid #DDD6FE', paddingBottom: '2px' }}>
            Voir tous les avis sur Trustpilot <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<"EUR" | "XPF" | "USD">("EUR");
  const [margin, setMargin] = useState(0);

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
    acc[region] = {
      minData: Math.min(...pkgs.map((p) => p.data_amount ?? 0)),
      maxData: Math.max(...pkgs.map((p) => p.data_amount ?? 0)),
      minDays: Math.min(...pkgs.map((p) => parseInt(p.validity?.toString().split(" ")[0] || "0"))),
      maxDays: Math.max(...pkgs.map((p) => parseInt(p.validity?.toString().split(" ")[0] || "0"))),
      minPrice: minPriceRaw * (1 + margin),
      maxPrice: (prices.length > 0 ? Math.max(...prices) : 0) * (1 + margin),
      packageCount: pkgs.filter((p) => getPrice(p, currency) > 0).length,
      originalRegion: pkgs[0]?.region || pkgs[0]?.region_fr || region,
    };
    return acc;
  }, {} as Record<string, any>);

  const topDestinations = TOP_DESTINATIONS.filter((r) => packagesByRegion[r]);

  const currencySymbol = currency === "XPF" ? "₣" : currency === "USD" ? "$" : "€";

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>FENUA SIM — eSIM pour les voyageurs depuis l'outre-mer et d'ailleurs</title>
        <meta name="description" content="Achetez votre eSIM de voyage en quelques minutes. Connexion 4G/5G dans 180+ pays, activation immédiate. Le spécialiste eSIM pour les francophones de l'Outre-mer." />
        <meta name="keywords" content="eSIM voyage, eSIM Outre-mer, eSIM Polynésie française, eSIM Nouvelle-Calédonie, eSIM Martinique, carte SIM voyage" />
        <link rel="canonical" href="https://www.fenuasim.com/" />
        <meta property="og:title" content="FENUA SIM — eSIM pour les voyageurs depuis l'outre-mer" />
        <meta property="og:description" content="Achetez votre eSIM de voyage en quelques minutes. Connexion 4G/5G dans 180+ pays, activation immédiate." />
        <meta property="og:url" content="https://www.fenuasim.com/" />
      </Head>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative w-full overflow-hidden" style={{ minHeight: '520px' }}>
        {/* Background image */}
        <img
          src="https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=1600&fit=crop"
          alt="Voyageur connecté"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
        />
        {/* Overlays */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,0,20,.1) 0%,rgba(5,0,20,.45) 40%,rgba(5,0,20,.92) 100%)', zIndex: 1 }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,rgba(160,32,240,.3) 0%,transparent 55%,rgba(255,127,17,.2) 100%)', zIndex: 2 }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24" style={{ zIndex: 3 }}>
          <div className="max-w-2xl">
            {/* Social proof */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex">
                {["L", "P", "H", "N"].map((l, i) => (
                  <div key={i} style={{
                    width: '30px', height: '30px', borderRadius: '50%',
                    border: '2px solid #fff',
                    background: 'linear-gradient(135deg,#A020F0,#FF7F11)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: '11px',
                    marginLeft: i === 0 ? 0 : '-8px',
                  }}>{l}</div>
                ))}
              </div>
              <div>
                <div style={{ color: '#FFB800', fontSize: '12px' }}>★★★★★</div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,.85)', fontWeight: 600 }}>
                  +1 400 voyageurs connectés ce mois
                </span>
              </div>
            </div>

            {/* H1 */}
            <h1 className="font-extrabold leading-tight mb-4" style={{ fontSize: 'clamp(32px,5vw,52px)', color: '#fff', letterSpacing: '-.03em' }}>
              Restez connecté<br />
              partout dans{" "}
              <span style={{ background: 'linear-gradient(90deg,#D8B4FE,#FDBA74)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                le monde.
              </span>
            </h1>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,.72)', lineHeight: 1.6, marginBottom: '28px', maxWidth: '480px' }}>
              eSIM instantanée dans 180+ pays. Pensé pour les voyageurs depuis l'Outre-mer et d'ailleurs. Activation en 2 minutes.
            </p>

            {/* CTA principal */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Link
                href="/shop"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'linear-gradient(90deg,#A020F0,#FF7F11)',
                  color: '#fff', padding: '14px 28px',
                  borderRadius: '12px', fontWeight: 800, fontSize: '15px',
                  boxShadow: '0 4px 20px rgba(160,32,240,.4)',
                  transition: 'transform .15s, box-shadow .15s',
                  textDecoration: 'none',
                }}
              >
                Trouver mon eSIM <ArrowRight size={18} />
              </Link>
              <Link
                href="/compatibilite"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(255,255,255,.12)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,.25)',
                  color: '#fff', padding: '14px 22px',
                  borderRadius: '12px', fontWeight: 600, fontSize: '14px',
                  textDecoration: 'none',
                }}
              >
                📱 Vérifier compatibilité
              </Link>
            </div>

            {/* Micro-trust */}
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {["⚡ 2 min activation", "📩 Email immédiat", "🔒 Stripe sécurisé", "💬 WhatsApp 24/7"].map((t) => (
                <span key={t} style={{ fontSize: '12px', color: 'rgba(255,255,255,.65)', fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid #F3F4F6' }}>
        {[
          { n: "180+", l: "destinations" },
          { n: "2 min", l: "activation" },
          { n: "4,8★", l: "Trustpilot" },
          { n: "24/7", l: "support" },
        ].map(({ n, l }) => (
          <div key={l} style={{ padding: '16px 8px', textAlign: 'center', borderRight: '1px solid #F3F4F6' }}>
            <div style={{ fontWeight: 800, fontSize: '20px', background: 'linear-gradient(90deg,#A020F0,#FF7F11)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{n}</div>
            <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px', fontWeight: 500 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* ── TRUST PILLS ──────────────────────────────────────────────────────── */}
      <div style={{ background: '#F3E8FF', borderBottom: '1px solid #DDD6FE', padding: '12px 20px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
        {["✓ QR code par email", "✓ Paiement EUR & XPF", "✓ Rechargeable", "✓ Sans engagement"].map((t) => (
          <span key={t} style={{ fontSize: '12px', fontWeight: 700, color: '#7B15B8' }}>{t}</span>
        ))}
      </div>

      {/* ── DESTINATIONS ─────────────────────────────────────────────────────── */}
      <div className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Destinations populaires
            </h2>
            <Link href="/shop" style={{ fontSize: '13px', color: '#A020F0', fontWeight: 700, textDecoration: 'none' }}>
              Voir tout →
            </Link>
          </div>
          <p className="text-gray-400 text-sm mb-8">Sélectionnées pour les voyageurs d'outre-mer</p>

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

      {/* ── ASSURANCE BANNER ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="relative rounded-2xl overflow-hidden cursor-pointer" style={{ boxShadow: '0 4px 20px rgba(255,127,17,.15)' }}>
          <img
            src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1200&fit=crop"
            alt="Assurance voyage"
            className="w-full object-cover"
            style={{ height: '130px' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(160,32,240,.88),rgba(255,127,17,.75))' }} />
          <div className="absolute inset-0 flex items-center justify-between px-6 sm:px-10">
            <div>
              <h3 className="font-extrabold text-white text-lg sm:text-xl mb-1">🛡️ Assurance voyage FENUASIM</h3>
              <p className="text-white text-sm" style={{ opacity: .85 }}>Médical · Annulation · Bagages — dès 8,90€ / personne</p>
            </div>
            <Link
              href="/assurance"
              style={{
                background: '#fff', color: '#7B15B8',
                padding: '10px 18px', borderRadius: '10px',
                fontWeight: 800, fontSize: '13px',
                whiteSpace: 'nowrap', textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,.15)',
              }}
            >
              Découvrir →
            </Link>
          </div>
        </div>
      </div>

      {/* ── REVIEWS ──────────────────────────────────────────────────────────── */}
      <ReviewsSection />

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <div style={{ background: '#F9FAFB', padding: '56px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-12">
            Comment ça marche ?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { step: "1", icon: "🛒", title: "Choisissez votre forfait", desc: "Sélectionnez la destination et le volume de data adapté à votre séjour." },
              { step: "2", icon: "📩", title: "Recevez votre eSIM", desc: "Un QR code vous est envoyé immédiatement par email après paiement." },
              { step: "3", icon: "⚡", title: "Connectez-vous", desc: "Scannez le QR code et profitez d'une connexion locale dès l'atterrissage." },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="text-center">
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 16px',
                  background: 'linear-gradient(135deg,#A020F0,#FF7F11)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '28px', boxShadow: '0 4px 14px rgba(160,32,240,.25)',
                }}>
                  {icon}
                </div>
                <div style={{ fontWeight: 800, fontSize: '13px', color: '#A020F0', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Étape {step}
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <div className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-8">
            Questions fréquentes
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              { q: "Comment fonctionne l'eSIM ?", a: "Vous recevez un QR code par email immédiatement après achat. Scannez-le dans les réglages de votre téléphone — vous serez connecté dès l'atterrissage dans votre pays de destination." },
              { q: "Mon appareil est-il compatible ?", a: "iPhone XS et ultérieurs, Samsung Galaxy S20+, Google Pixel 3+. Consultez notre page compatibilité pour la liste complète." },
              { q: "Quand activer mon eSIM ?", a: "Installez-la avant le départ (vous avez besoin d'internet), mais elle s'activera automatiquement à votre arrivée à destination." },
              { q: "Peut-on recharger une eSIM FENUA SIM ?", a: "Oui ! Directement depuis votre espace client en quelques clics, sans racheter de nouvelle eSIM ni rescanner de QR code." },
            ].map((item, i) => (
              <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-purple-200 transition-colors">
                <h3 className="font-bold text-gray-900 mb-2 text-sm">{item.q}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
            <div className="text-center mt-8">
              <Link href="/faq" style={{ color: '#A020F0', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>
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
