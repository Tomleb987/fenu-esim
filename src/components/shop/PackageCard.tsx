"use client";

import { Database } from "@/lib/supabase/config";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";

type Package = Database["public"]["Tables"]["airalo_packages"]["Row"];

// garde ici tes REGION_TRANSLATIONS, getFrenchRegionName,
// regionFrToSlug et formatPrice identiques

export default function PackageCard({
  pkg,
  minData,
  maxData,
  minDays,
  maxDays,
  minPrice,
  packageCount,
  isPopular = false,
  currency,
  isRechargeable,
  isTop = false,
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
            <span className="hidden xs:inline">TOP</span>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6 flex flex-col flex-1">
        <div className="flex items-center mb-3 sm:mb-4">
          <div className="relative w-8 h-6 sm:w-12 sm:h-8 mr-2 sm:mr-3 rounded overflow-hidden shadow-sm flex-shrink-0">
            <img
              src={pkg.flag_url || ""}
              alt={pkg.region_fr || ""}
              className="w-full h-full object-cover"
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
              {getFrenchRegionName(pkg.region_fr, pkg.region)}
            </h3>
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-600">À partir de</span>
            <span
              className={`font-bold ${
                isTop
                  ? "text-lg sm:text-2xl text-purple-600"
                  : "text-base sm:text-xl text-purple-500"
              }`}
            >
              {formatPrice(priceWithMargin, currency)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-600">Jusqu'à</span>
            <span className="text-xs sm:text-sm font-medium text-gray-800">
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
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAllNetworks(true);
                    }}
                    style={{
                      color: "#A020F0",
                      fontWeight: 700,
                      fontSize: "11px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    +{networkParts.length - 2} voir tout
                  </button>
                </>
              )}

              {showAllNetworks && (
                <>
                  {" "}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAllNetworks(false);
                    }}
                    style={{
                      color: "#A020F0",
                      fontWeight: 700,
                      fontSize: "11px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
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
            className={`w-full py-2 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 ${
              isTop
                ? "bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white shadow-lg hover:shadow-xl"
                : "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            <span className="hidden xs:inline">
              {isTop ? "Découvrir" : "Voir les forfaits"}
            </span>
            <span className="xs:hidden">Voir</span>
          </button>
        </div>
      </div>

      {isTop && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/20 to-orange-50/20 pointer-events-none" />
      )}
    </div>
  );
}
