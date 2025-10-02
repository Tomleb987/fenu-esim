"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router"; // ✅ Pages Router
import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/lib/supabase/config";
import Image from "next/image";
import { Star } from "lucide-react";

type Package = Database["public"]["Tables"]["airalo_packages"]["Row"];

interface RegionStats {
  minPrice: number;
  maxPrice: number;
  maxDays: number;
  packageCount: number;
  operatorName: string;
  countryCode: string;
}

interface DestinationCardProps {
  region: string;
  stats: RegionStats;
  currency: "EUR" | "USD" | "XPF";
  isTop?: boolean;
}

const TOP_DESTINATIONS = [
  "France",
  "Canada",
  "United States",
  "Australia",
  "New Zealand",
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function DestinationCard({
  region,
  stats,
  currency,
  isTop = false,
}: DestinationCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    const slug = generateSlug(region);
    router.push(`/shop/${slug}`);
  };

  const getCurrencySymbol = () => {
    switch (currency) {
      case "USD":
        return "$";
      case "XPF":
        return "₣";
      default:
        return "€";
    }
  };

  const cardClasses = isTop
    ? "group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-purple-200 hover:border-purple-400 transform hover:-translate-y-2 cursor-pointer overflow-hidden w-full"
    : "group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-purple-300 transform hover:-translate-y-1 cursor-pointer overflow-hidden w-full";

  return (
    <div className={cardClasses} onClick={handleCardClick}>
      {isTop && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-gradient-to-r from-purple-600 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center">
            <Star className="w-3 h-3 mr-1" />
            <span className="hidden xs:inline">TOP</span>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6">
        <div className="flex items-center mb-3 sm:mb-4">
          <div className="relative w-8 h-6 sm:w-12 sm:h-8 mr-2 sm:mr-3 rounded overflow-hidden shadow-sm flex-shrink-0">
            <Image
              src={stats.countryCode.toLowerCase()}
              alt={`Drapeau ${region}`}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className={`font-bold truncate ${
                isTop
                  ? "text-base sm:text-lg text-purple-800"
                  : "text-sm sm:text-base text-gray-800"
              }`}
            >
              {region}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500">
              {stats.packageCount} forfait{stats.packageCount > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-600">
              À partir de
            </span>
            <span
              className={`font-bold ${
                isTop
                  ? "text-lg sm:text-2xl text-purple-600"
                  : "text-base sm:text-xl text-purple-500"
              }`}
            >
              {stats.minPrice.toFixed(2)}
              {getCurrencySymbol()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-600">Jusqu'à</span>
            <span className="text-xs sm:text-sm font-medium text-gray-800">
              {stats.maxDays} jours
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-600">Opérateur</span>
            <span className="text-xs sm:text-sm font-medium text-gray-800 truncate ml-2 max-w-20 sm:max-w-none">
              {stats.operatorName}
            </span>
          </div>
        </div>

        <button
          className={`w-full py-2 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 ${
            isTop
              ? "bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white shadow-lg hover:shadow-xl"
              : "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
        >
          <span className="hidden xs:inline">
            {isTop ? "Découvrir" : "Voir les forfaits"}
          </span>
          <span className="xs:hidden">Voir</span>
        </button>
      </div>

      {isTop && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/20 to-orange-50/20 pointer-events-none" />
      )}
    </div>
  );
}

export default function Shop() {
  const router = useRouter();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<"EUR" | "XPF" | "USD">("EUR");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "local" | "global">(
    "all"
  );
  const [margin, setMargin] = useState(0);

  // ✅ Pré-remplissage & stockage local
  useEffect(() => {
    if (!router.isReady) return;

    const promoCode =
      (router.query.code as string) || localStorage.getItem("promoCode");
    const partnerRef =
      (router.query.ref as string) || localStorage.getItem("partnerRef");

    if (promoCode) {
      localStorage.setItem("promoCode", promoCode);
      const inputPromo = document.querySelector<HTMLInputElement>(
        'input[placeholder="Code promo (optionnel)"]'
      );
      if (inputPromo) inputPromo.value = promoCode;
    }

    if (partnerRef) {
      localStorage.setItem("partnerRef", partnerRef);
      const inputPartner = document.querySelector<HTMLInputElement>(
        'input[placeholder="Code partenaire (optionnel)"]'
      );
      if (inputPartner) inputPartner.value = partnerRef;
    }
  }, [router.isReady, router.query]);

  // ✅ Récupération des forfaits
  useEffect(() => {
    async function fetchPackages() {
      try {
        const { data, error } = await supabase
          .from("airalo_packages")
          .select("*")
          .order("final_price_eur", { ascending: true });

        if (error) throw error;

        const validPackages = (data || []).filter((pkg) => {
          const hasValidEur =
            pkg.final_price_eur != null && pkg.final_price_eur > 0;
          const hasValidUsd =
            pkg.final_price_usd != null && pkg.final_price_usd > 0;
          const hasValidXpf =
            pkg.final_price_xpf != null && pkg.final_price_xpf > 0;
          return hasValidEur || hasValidUsd || hasValidXpf;
        });

        setPackages(validPackages);
      } catch (err) {
        setError("Erreur lors du chargement des forfaits");
        console.error("Erreur:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPackages();
  }, []);

  // ✅ Récupération devise & marge
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
  // Group packages by region and calculate stats
  const packagesByRegion = packages.reduce((acc, pkg) => {
    // Apply type filter
    if (typeFilter !== "all" && pkg.type !== typeFilter) {
      return acc;
    }
    
    // Use region_fr if available, otherwise fallback to region
    const region = pkg.region_fr || pkg.region || "Autres";
    if (!acc[region]) {
      acc[region] = [];
    }
    acc[region].push(pkg);
    return acc;
  }, {} as Record<string, Package[]>);

  // Calculate statistics for each region
  const regionStats = Object.entries(packagesByRegion).reduce(
    (acc, [region, pkgs]) => {
      const prices = pkgs.map((p) => getPrice(p, currency)).filter((p) => p > 0);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

      // Apply margin here
      acc[region] = {
        minPrice: minPrice * (1 + margin),
        maxPrice: maxPrice * (1 + margin),
        packageCount: pkgs.length,
        operatorName: pkgs[0]?.operator_name || "Inconnu",
        countryCode: pkgs[0]?.flag_url || "xx",
        maxDays: Math.max(
          ...pkgs.map((p) => parseInt(p.validity?.toString().split(' ')[0] || "0"))
        ),
      };
      return acc;
    },
    {} as Record<string, RegionStats>
  );

  // Sort regions by minimum price
  const regions = Object.keys(packagesByRegion).sort(
    (a, b) => regionStats[a].minPrice - regionStats[b].minPrice
  );

  // Filter regions based on search query
  const filteredRegions = regions.filter((region) =>
    region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Update the top destinations and other destinations filtering
  const topDestinations = filteredRegions
    .filter((region) =>
      TOP_DESTINATIONS.some(
        (topDest) => topDest.toLowerCase() === region.toLowerCase()
      )
    )
    .slice(0, 5);

  const otherDestinations = filteredRegions.filter(
    (region) =>
      !TOP_DESTINATIONS.some(
        (topDest) => topDest.toLowerCase() === region.toLowerCase()
      )
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">
            Chargement des destinations...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4 text-sm sm:text-base">
            Erreur: {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 sm:px-6 py-2 bg-red-600 text-white text-sm sm:text-base rounded-lg hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-orange-50">
      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 lg:py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 mb-4 sm:mb-6 leading-tight">
            Connectez-vous partout dans le monde
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Découvrez nos forfaits eSIM pour voyager sans contraintes.
            Activation instantanée, couverture mondiale.
          </p>

          {/* Sélecteur de devise */}
          <div className="flex justify-center">
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
        </div>
      </section>

      <section className="flex flex-col justify-center items-center gap-16 py-8 sm:py-12 lg:py-16 px-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mb-6">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une destination..."
              className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-md text-gray-800 placeholder-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "all" | "local" | "global")}
            className="px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-md text-gray-800 bg-white min-w-[120px]"
          >
            <option value="all">Tous les types</option>
            <option value="local">Regional</option>
            <option value="global">Global</option>
          </select>
        </div>
        {/* Top Destinations */}
        {topDestinations.length > 0 && (
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2 sm:mb-4">
                🥇 Destinations populaires
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 px-4">
                {searchQuery
                  ? `Résultats pour "${searchQuery}"`
                  : "Nos destinations les plus demandées avec les meilleurs tarifs"}
              </p>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
              {topDestinations.map((region) => (
                <DestinationCard
                  key={region}
                  region={region}
                  stats={regionStats[region]}
                  currency={currency}
                  isTop={true}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* All Destinations */}
      <section className="py-8 sm:py-12 lg:py-16 px-4 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-2 sm:mb-4">
              🌍 {otherDestinations.length > 0 ? "Nos autres destinations" : "Toutes nos destinations"}
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 px-4">
              {searchQuery || typeFilter !== "all" ? (
                <>
                  {searchQuery && `Résultats pour "${searchQuery}"`}
                  {searchQuery && typeFilter !== "all" && " - "}
                  {typeFilter !== "all" && `Type: ${typeFilter === "local" ? "Local" : "Global"}`}
                </>
              ) : (
                `Explorez toutes nos destinations disponibles (${regions.length} pays)`
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {(otherDestinations.length > 0 ? otherDestinations : regions).map(
              (region) => (
                <DestinationCard
                  key={region}
                  region={region}
                  stats={regionStats[region]}
                  currency={currency}
                  isTop={false}
                />
              )
            )}
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-8 sm:py-12 lg:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 text-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-lg">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-600 mb-1 sm:mb-2">
                {filteredRegions.length}
              </div>
              <div className="text-xs sm:text-sm lg:text-base text-gray-600">
                Destinations
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-lg">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-600 mb-1 sm:mb-2">
                {Object.values(packagesByRegion).reduce((acc, pkgs) => acc + pkgs.length, 0)}
              </div>
              <div className="text-xs sm:text-sm lg:text-base text-gray-600">
                Forfaits
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-lg">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600 mb-1 sm:mb-2">
                {Math.min(
                  ...Object.values(regionStats)
                    .map((s) => s.minPrice)
                    .filter((p) => p > 0)
                )}
                {currency === "USD" ? "$" : currency === "XPF" ? "₣" : "€"}
              </div>
              <div className="text-xs sm:text-sm lg:text-base text-gray-600">
                Prix minimum
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-lg">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600 mb-1 sm:mb-2">
                {Math.max(...Object.values(regionStats).map((s) => s.maxDays))}
              </div>
              <div className="text-xs sm:text-sm lg:text-base text-gray-600">
                Jours max
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-12 sm:py-16 lg:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">
            Prêt à voyager connecté ?
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-6 sm:mb-8 px-4">
            Choisissez votre destination et activez votre eSIM en quelques
            secondes
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-orange-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-sm sm:text-base"
            >
              Voir toutes les destinations
            </button>
            <button className="px-6 sm:px-8 py-3 sm:py-4 border-2 border-purple-600 text-purple-600 font-semibold rounded-xl hover:bg-purple-600 hover:text-white transition-all duration-300 text-sm sm:text-base">
              Comment ça marche ?
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

