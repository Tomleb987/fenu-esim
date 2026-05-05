"use client";

import type { Database } from "@/lib/supabase/config";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Star } from "lucide-react";

type Package = Database["public"]["Tables"]["airalo_packages"]["Row"];

interface PackageCardProps {
  pkg: Package;
  minData?: number;
  maxData?: number;
  minDays: number;
  maxDays?: number;
  minPrice: number;
  packageCount?: number;
  isPopular?: boolean;
  currency: "EUR" | "XPF" | "USD";
  isRechargeable?: boolean;
  isTop?: boolean;
}

const REGION_TRANSLATIONS: Record<string, string> = {
  "Discover Global": "Monde",
  Asia: "Asie",
  Europe: "Europe",
  Japan: "Japon",
  "United States": "États-Unis",
  Australia: "Australie",
  "New Zealand": "Nouvelle-Zélande",
  Mexico: "Mexique",
  Fiji: "Fidji",
  France: "France",
};

function getFrenchRegionName(
  regionFr: string | null,
  region: string | null
): string {
  if (regionFr?.trim()) {
    const value = regionFr.trim();
    return REGION_TRANSLATIONS[value] ?? value;
  }

  if (region?.trim()) {
    const value = region.trim();
    return REGION_TRANSLATIONS[value] ?? value;
  }

  return "Autres";
}

function regionFrToSlug(regionFr: string | null, region: string | null): string {
  const value = regionFr?.trim() || region?.trim() || "";

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function formatPrice(price: number, currency: "EUR" | "XPF" | "USD"): string {
  if (currency === "XPF") return `${Math.round(price).toLocaleString("fr-FR")} ₣`;
  if (currency === "USD") return `$${price.toFixed(2)}`;
  return `${price.toFixed(2)} €`;
}

export default function PackageCard({
  pkg,
  minDays,
  minPrice,
  currency,
  isTop = false,
}: PackageCardProps) {
  const router = useRouter();
  const [showAllNetworks, setShowAllNetworks] = useState(false);

  const regionName = getFrenchRegionName(pkg.region_fr, pkg.region);
  const slug = regionFrToSlug(pkg.region_fr, pkg.region);

  const handleClick = () => {
    if (slug) router.push(`/shop/${slug}`);
  };

  const rawNetwork = ((pkg as any).networks || pkg.operator_name || "").toString();
  const networkParts = rawNetwork.split(" · ").filter(Boolean);
  const hasMore = networkParts.length > 2;

  const networkDisplay = showAllNetworks
    ? rawNetwork
    : hasMore
      ? networkParts.slice(0, 2).join(" · ")
      : rawNetwork || "Selon destination";

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
        <div className="flex items-center mb-3 sm:mb-4">
          <div className="relative w-8 h-6 sm:w-12 sm:h-8 mr-2 sm:mr-3 rounded overflow-hidden shadow-sm flex-shrink-0 bg-gray-100">
            <img
              src={pkg.flag_url || ""}
              alt={regionName}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-bold truncate text-sm sm:text-base text-gray-800">
              {regionName}
            </h3>
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 min-h-[96px]">
          <div className="flex justify-between gap-3">
            <span className="text-xs sm:text-sm text-gray-600">À partir de</span>
            <span className="font-bold text-purple-500 text-base sm:text-xl whitespace-nowrap">
              {formatPrice(minPrice, currency)}
            </span>
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-xs sm:text-sm text-gray-600">Jusqu'à</span>
            <span className="text-xs sm:text-sm font-medium text-gray-800 whitespace-nowrap">
              {minDays} jour{minDays > 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-start justify-between gap-2">
            <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">
              Réseau
            </span>

            <span className="text-xs sm:text-sm font-medium text-gray-800 text-right leading-relaxed">
              {networkDisplay}

              {hasMore && !showAllNetworks && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAllNetworks(true);
                    }}
                    className="text-purple-600 font-bold text-[11px]"
                  >
                    +{networkParts.length - 2} voir tout
                  </button>
                </>
              )}

              {showAllNetworks && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAllNetworks(false);
                    }}
                    className="text-purple-600 font-bold text-[11px]"
                  >
                    réduire
                  </button>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="mt-auto">
          <button
            type="button"
            className="w-full py-2 sm:py-3 px-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
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
