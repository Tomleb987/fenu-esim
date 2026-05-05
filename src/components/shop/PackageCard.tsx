"use client";

import { Database } from "@/lib/supabase/config";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";

type Package = Database["public"]["Tables"]["airalo_packages"]["Row"];

interface PackageCardProps {
  pkg: Package;
  minData: number;
  maxData: number;
  minDays: number;
  maxDays: number;
  minPrice: number;
  packageCount: number;
  isPopular?: boolean;
  currency: "EUR" | "XPF" | "USD";
  isRechargeable?: boolean;
  isTop?: boolean;
}

// ─────────────────────────────────────────
// HELPERS (IMPORTANT POUR ÉVITER CRASH)
// ─────────────────────────────────────────

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
  "France": "France",
};

function getFrenchRegionName(
  regionFr: string | null,
  region: string | null
): string {
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

function regionFrToSlug(regionFr: string | null): string {
  if (!regionFr) return "";
  return regionFr
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function formatPrice(
  price: number,
  currency: "EUR" | "XPF" | "USD"
): string {
  if (currency === "XPF")
    return `${Math.round(price).toLocaleString("fr-FR")} ₣`;
  if (currency === "USD") return `$${price.toFixed(2)}`;
  return `${price.toFixed(2)} €`;
}

// ─────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────

export default function PackageCard({
  pkg,
  minData,
  minDays,
  minPrice,
  isTop = false,
  currency,
}: PackageCardProps) {
  const router = useRouter();
  const [showAllNetworks, setShowAllNetworks] = useState(false);
  const [margin, setMargin] = useState(0);

  useEffect(() => {
    const storedMargin = localStorage.getItem("global_margin");
    setMargin(storedMargin ? parseFloat(storedMargin) : 0);
  }, []);

  const handleClick = () => {
    const slug = regionFrToSlug(pkg.region_fr || "");
    if (slug) router.push(`/shop/${slug}`);
  };

  const priceWithMargin = minPrice * (1 + margin);

  const rawNetwork = (pkg as any).networks || pkg.operator_name || "";
  const networkParts = rawNetwork.split(" · ");
  const hasMore = networkParts.length > 2;

  const networkDisplay = showAllNetworks
    ? rawNetwork
    : hasMore
    ? networkParts.slice(0, 2).join(" · ")
    : rawNetwork;

  const cardClasses = isTop
    ? "group relative h-full flex flex-col bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-purple-200 hover:border-purple-400 transform hover:-translate-y-2 cursor-pointer overflow-hidden w-full"
    : "group relative h-full flex flex-col bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-purple-300 transform hover:-translate-y-1 cursor-pointer overflow-hidden w-full";

  return (
    <div className={cardClasses} onClick={handleClick}>
      {isTop && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-gradient-to-r from-purple-600 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center">
            <Star className="w-3 h-3 mr-1" />
            TOP
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6 flex flex-col flex-1">
        {/* HEADER */}
        <div className="flex items-center mb-3 sm:mb-4">
          <div className="relative w-8 h-6 sm:w-12 sm:h-8 mr-2 sm:mr-3 rounded overflow-hidden shadow-sm flex-shrink-0">
            <img
              src={pkg.flag_url || ""}
              alt={pkg.region_fr || ""}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-bold truncate text-sm sm:text-base text-gray-800">
              {getFrenchRegionName(pkg.region_fr, pkg.region)}
            </h3>
          </div>
        </div>

        {/* CONTENT */}
        <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
          <div className="flex justify-between">
            <span className="text-xs text-gray-600">À partir de</span>
            <span className="font-bold text-purple-500">
              {formatPrice(priceWithMargin, currency)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-xs text-gray-600">Jusqu'à</span>
            <span className="text-xs text-gray-800">
              {minDays} jour{minDays > 1 ? "s" : ""}
            </span>
          </div>

          {/* RÉSEAU */}
          <div className="flex justify-between gap-2">
            <span className="text-xs text-gray-600">Réseau</span>
            <span className="text-xs text-gray-800 text-right">
              {networkDisplay}

              {hasMore && !showAllNetworks && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllNetworks(true);
                  }}
                  className="text-purple-600 font-semibold ml-1"
                >
                  +{networkParts.length - 2}
                </button>
              )}

              {showAllNetworks && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllNetworks(false);
                  }}
                  className="text-purple-600 font-semibold ml-1"
                >
                  réduire
                </button>
              )}
            </span>
          </div>
        </div>

        {/* CTA FIX ALIGNEMENT */}
        <div className="mt-auto">
          <button
            className="w-full py-2 sm:py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-500 to-purple-600 text-white"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            Voir
          </button>
        </div>
      </div>
    </div>
  );
}
