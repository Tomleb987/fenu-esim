import Link from "next/link";
import Image from "next/image";
import Head from "next/head";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/lib/supabase/config";
import ChatWidget from "@/components/ChatWidget";
import { 
  Search, Globe, CheckCircle, Wifi, Star, 
  Smartphone, Zap, ArrowRight, MapPin, Heart, ShieldCheck, Sparkles 
} from "lucide-react";

// --- CONSTANTES & CONFIGURATION ---

const TOP_DESTINATIONS = [
  "Japon",
  "États-Unis",
  "Europe",
  "Australie",
  "France",
  "Asie",
  "Monde",
  "Mexique",
];

// Mapping pour associer les données Supabase à des images stylées
const DESTINATION_META: Record<string, { image: string; badge: string | null }> = {
  "Japon": { 
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800", 
    badge: "🔥 Top Vente" 
  },
  "États-Unis": { 
    image: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=800", 
    badge: "⚡ 5G" 
  },
  "Europe": { 
    image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=800", 
    badge: "🇪🇺 Best Seller" 
  },
  "Australie": { 
    image: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?q=80&w=800", 
    badge: null 
  },
  "France": { 
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=800", 
    badge: "🇫🇷 Local" 
  },
  "Asie": { 
    image: "https://images.unsplash.com/photo-1535139262971-c51845709a48?q=80&w=800", 
    badge: "🌏 Régional" 
  },
  "Monde": { 
    image: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=800", 
    badge: "✈️ Global" 
  },
  "Mexique": { 
    image: "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?q=80&w=800", 
    badge: null 
  },
  // Fallback image
  "default": {
    image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=800",
    badge: null
  }
};

const REGION_TRANSLATIONS: Record<string, string> = {
  "Discover Global": "Monde",
  "Asia": "Asie",
  "Europe": "Europe",
  "Japan": "Japon",
  "United States": "États-Unis",
  "Australia": "Australie",
  "New Zealand": "Nouvelle-Zélande",
  "Mexico": "Mexique",
  "Fiji": "Fidji",
  "Canada": "Canada",
  "Thailand": "Thaïlande",
  // ... (Garder le reste de votre liste de traductions ici si nécessaire, j'ai abrégé pour la lisibilité)
};

// --- HELPER FUNCTIONS ---

function getFrenchRegionName(regionFr: string | null, region: string | null): string {
  if (regionFr && regionFr.trim()) {
    const trimmedFr = regionFr.trim();
    if (REGION_TRANSLATIONS[trimmedFr]) return REGION_TRANSLATIONS[trimmedFr];
    return trimmedFr;
  }
  if (region && region.trim()) {
    const trimmedRegion = region.trim();
    if (REGION_TRANSLATIONS[trimmedRegion]) return REGION_TRANSLATIONS[trimmedRegion];
    
    // Case insensitive check
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
  const [search, setSearch] = useState("");

  // Plausible analytics
  const plausible = useCallback((event: string, props?: Record<string, any>) => {
    if (typeof window !== "undefined" && (window as any).plausible) {
      (window as any).plausible(event, { props });
    }
  }, []);

  // Fetch Data
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

  // Trustpilot logic
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://invitejs.trustpilot.com/tp.min.js";
    script.async = true;
    document.body.appendChild(script);
    script.onload = () => {
      /* @ts-ignore */
      if (window.tp) window.tp("register", "t5j5yxc20tHVgyo");
    };
    return () => document.body.removeChild(script);
  }, []);

  // Grouping logic
  const packagesByRegion = packages.reduce(
    (acc, pkg) => {
      const region = getFrenchRegionName(pkg.region_fr, pkg.region);
      if (!acc[region]) acc[region] = [];
      acc[region].push(pkg);
      return acc;
    },
    {} as Record<string, Package[]>
  );

  // Computing minimum price per region for display
  const getMinPrice = (region: string) => {
    const regionPkgs = packagesByRegion[region];
    if (!regionPkgs || regionPkgs.length === 0) return "N/A";
    const min = Math.min(...regionPkgs.map((p) => p.final_price_eur ?? 0));
    return min.toFixed(2) + "€";
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      <Head>
        <title>FenuaSIM - Votre eSIM partout dans le monde</title>
        <meta name="description" content="Activez votre forfait instantanément dans plus de 180 pays." />
        {/* FAQ JSON-LD (Conservé tel quel) */}
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
                  "acceptedAnswer": { "@type": "Answer", "text": "L'eSIM est une carte SIM intégrée à votre appareil. Vous recevez un QR code par email que vous scannez pour activer votre forfait." }
                },
                {
                  "@type": "Question",
                  "name": "Mon appareil est-il compatible ?",
                  "acceptedAnswer": { "@type": "Answer", "text": "La plupart des smartphones récents sont compatibles avec l'eSIM. Vérifiez la compatibilité de votre appareil dans notre guide." }
                }
              ]
            })
          }}
        />
      </Head>

      {/* ----------------------------------------------------------------------------------
          1. HERO SECTION (IMMERSIVE)
         ---------------------------------------------------------------------------------- */}
      <section className="relative w-full min-h-[650px] flex items-center justify-center overflow-hidden bg-gray-900 text-white">
        
        {/* Fond d'écran avec Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop" 
            alt="Voyage" 
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
        </div>

        {/* Contenu Hero */}
        <div className="relative z-10 container mx-auto px-4 text-center pt-20">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-purple-200 text-sm font-semibold mb-6 animate-fade-in">
            <Globe className="w-4 h-4" />
            <span>L'eSIM par des voyageurs, pour des voyageurs</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight max-w-4xl mx-auto">
            Voyagez connecté, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-orange-400">
              simplement libre.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Fini les frais d'itinérance.
            <br className="hidden md:block" /> Installez votre eSIM en 2 minutes et profitez d'internet dans +180 pays.
          </p>

          {/* Barre de Recherche Visuelle (Redirection simple pour l'instant) */}
          <div className="max-w-xl mx-auto bg-white/10 backdrop-blur-xl p-2 rounded-2xl border border-white/20 shadow-2xl mb-12 transform hover:scale-[1.01] transition-transform">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-6 h-6 text-gray-300" />
              <input 
                type="text" 
                placeholder="Où allez-vous ? (ex: Japon, Bali...)" 
                className="w-full bg-transparent rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-400 focus:outline-none text-lg font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Link 
                href="/shop"
                className="hidden md:block bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-purple-900/50"
              >
                Rechercher
              </Link>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-12 text-gray-300 text-sm font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" /> Installation instantanée
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" /> Pas de carte physique
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" /> Support Français 7j/7
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------------------
          2. BANDEAU DE CONFIANCE
         ---------------------------------------------------------------------------------- */}
      <div className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center md:justify-between items-center gap-8 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
          <span className="text-xl font-bold text-gray-400 flex items-center gap-2"><Star className="fill-gray-400 w-5 h-5" /> Trustpilot 4.8/5</span>
          <span className="text-xl font-bold text-gray-400">10 000+ Voyageurs</span>
          <span className="text-xl font-bold text-gray-400">Couverture 180+ Pays</span>
          <span className="text-xl font-bold text-gray-400">Technologie 5G/4G</span>
        </div>
      </div>

      {/* ----------------------------------------------------------------------------------
          3. GRILLE DESTINATIONS (STYLE BENTO)
         ---------------------------------------------------------------------------------- */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Destinations populaires</h2>
              <p className="text-gray-600 text-lg">Les coups de cœur de la communauté Fenuasim.</p>
            </div>
            <Link href="/shop" className="hidden md:flex items-center gap-2 text-purple-600 font-bold hover:text-purple-700 transition group">
              Voir tous les pays <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {loading ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-80 bg-gray-200 rounded-3xl animate-pulse"></div>
                ))}
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {TOP_DESTINATIONS.map((region) => {
                // On récupère les infos visuelles et les données réelles
                const meta = DESTINATION_META[region] || DESTINATION_META["default"];
                const minPrice = getMinPrice(region);
                // Si aucune donnée pour ce pays, on ne l'affiche pas
                if (minPrice === "N/A") return null;

                // Mise en avant de l'Europe (Featured)
                const isFeatured = region === "Europe";

                return (
                  <Link 
                    href={`/shop/${encodeURIComponent(region)}`} 
                    key={region} 
                    className={`group relative h-80 rounded-3xl overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl transition-all duration-300 ${isFeatured ? 'lg:col-span-2' : ''}`}
                    onClick={() => plausible("Clic Destination Populaire", { region })}
                  >
                    {/* Image de fond */}
                    <div className="absolute inset-0">
                      <img 
                        src={meta.image} 
                        alt={region} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 group-hover:opacity-80 transition-opacity"></div>
                    </div>

                    {/* Badge */}
                    {meta.badge && (
                      <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-yellow-300 fill-yellow-300" /> {meta.badge}
                      </div>
                    )}

                    {/* Contenu bas de carte */}
                    <div className="absolute bottom-0 left-0 w-full p-6 text-white translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                      <div className="flex justify-between items-end mb-1">
                        <h3 className="text-2xl font-bold">{region}</h3>
                        <div className="text-right">
                          <p className="text-xs text-gray-300 font-light mb-0.5">dès</p>
                          <p className="text-xl font-bold text-orange-400">{minPrice}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-300 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                         <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /> Data 4G/5G</span>
                         <span>•</span> <span>eSIM immédiate</span>
                      </div>

                      <button className="w-full bg-white text-purple-900 font-bold py-3 rounded-xl opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 text-sm">
                        Voir les offres
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          
          <div className="mt-8 text-center md:hidden">
            <Link href="/shop" className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-800 px-6 py-3 rounded-full font-bold shadow-sm">
              Voir les 180+ pays <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------------------
          4. POURQUOI NOUS (VALUE PROPOSITION)
         ---------------------------------------------------------------------------------- */}
      <section className="py-20 bg-gray-900 text-white rounded-t-[3rem] md:rounded-t-[5rem] -mt-8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            
            <div className="space-y-8">
              <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                Pourquoi choisir <span className="text-purple-400">Fenuasim</span> ?
              </h2>
              <p className="text-gray-400 text-lg">
                Nous ne sommes pas un robot géant. Nous sommes une équipe passionnée qui veut rendre le voyage plus humain et accessible.
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="bg-purple-600/20 p-3 rounded-xl h-fit"><ShieldCheck className="w-6 h-6 text-purple-400" /></div>
                  <div>
                    <h4 className="text-xl font-bold mb-1">Sécurité garantie</h4>
                    <p className="text-gray-400 text-sm">Paiement sécurisé et connexion cryptée via les réseaux officiels.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-orange-500/20 p-3 rounded-xl h-fit"><Heart className="w-6 h-6 text-orange-400" /></div>
                  <div>
                    <h4 className="text-xl font-bold mb-1">Support humain & réactif</h4>
                    <p className="text-gray-400 text-sm">Une question ? Notre équipe basée à Tahiti et en France vous répond.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-blue-500/20 p-3 rounded-xl h-fit"><MapPin className="w-6 h-6 text-blue-400" /></div>
                  <div>
                    <h4 className="text-xl font-bold mb-1">Liberté totale</h4>
                    <p className="text-gray-400 text-sm">Gardez votre numéro WhatsApp habituel tout en utilisant la data de l'eSIM.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Image d'ambiance */}
            <div className="relative h-[400px] md:h-[500px] rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <img 
                src="https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=1000&auto=format&fit=crop" 
                alt="Voyageur heureux" 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-8 left-8 right-8 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                <p className="text-white font-medium italic">"Le meilleur investissement de mon voyage au Japon. J'ai économisé 400€ de hors forfait !"</p>
                <div className="flex gap-1 mt-2">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------------------
          5. COMMENT ÇA MARCHE (Step by Step)
         ---------------------------------------------------------------------------------- */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">C'est simple comme bonjour</h2>
          <p className="text-gray-600 mb-16 max-w-2xl mx-auto">Plus besoin de faire la queue au guichet de l'aéroport. Tout se passe sur votre téléphone.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Ligne connectrice (Desktop) */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-purple-100 via-purple-300 to-purple-100 -z-0"></div>

            {/* Étape 1 */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 bg-purple-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-purple-100">
                <Smartphone className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">1. Commandez</h3>
              <p className="text-gray-600 text-sm px-8">Choisissez votre destination et votre forfait. Vous recevez votre eSIM par email instantanément.</p>
            </div>

            {/* Étape 2 */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 bg-purple-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-purple-100">
                <Zap className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">2. Scannez</h3>
              <p className="text-gray-600 text-sm px-8">Scannez le QR code reçu dans vos réglages. C'est tout. Pas de carte plastique à insérer.</p>
            </div>

            {/* Étape 3 */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 bg-green-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-green-100">
                <Wifi className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">3. Profitez</h3>
              <p className="text-gray-600 text-sm px-8">Activez l'itinérance une fois arrivé. Vous êtes connecté automatiquement au meilleur réseau local.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------------------
          6. AVIS CLIENTS (TRUSTPILOT)
         ---------------------------------------------------------------------------------- */}
      <div className="max-w-3xl mx-auto my-12 px-4">
        <div className="bg-gradient-to-r from-purple-50 to-orange-50 rounded-2xl shadow-lg p-8 flex flex-col items-center border border-purple-100">
          <h3 className="text-2xl sm:text-3xl font-bold text-purple-800 mb-2 text-center">
            Ce que nos clients disent de FenuaSIM
          </h3>
          <p className="text-gray-700 text-center mb-6 max-w-xl">
            Découvrez les avis de nos clients ou partagez votre expérience.
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
        </div>
      </div>

      {/* ----------------------------------------------------------------------------------
          7. FAQ & CTA FINAL
         ---------------------------------------------------------------------------------- */}
      <div className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-8">
            Questions fréquentes
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              { q: "Comment fonctionne l'eSIM ?", a: "L'eSIM est une carte SIM virtuelle. Plus besoin d'insérer une puce, tout se fait par scan de QR Code." },
              { q: "Mon appareil est-il compatible ?", a: "La plupart des téléphones récents (iPhone XR+, Samsung S20+...) le sont. Vérifiez notre page de compatibilité." },
              { q: "Quand activer mon eSIM ?", a: "Installez-la avant de partir (avec du WiFi). Elle ne s'activera qu'une fois connecté au réseau du pays de destination." },
            ].map((item, i) => (
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
