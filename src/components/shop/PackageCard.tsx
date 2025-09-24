"use client";

import { Database } from "@/lib/supabase/config";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { Star } from "lucide-react";

type Package = Database["public"]["Tables"]["airalo_packages"]["Row"];

// Mapping manuel pour les cas particuliers ou noms non standards
const COUNTRY_CODES: Record<string, string> = {
  "États-Unis": "us",
  "Royaume-Uni": "gb",
  "Corée du Sud": "kr",
  "Émirats arabes unis": "ae",
  "République tchèque": "cz",
  "Hong Kong": "hk",
  Taïwan: "tw",
  Japon: "jp",
  Australie: "au",
  Canada: "ca",
  France: "fr",
  "Nouvelle-Calédonie": "nc",
  "Polynésie française": "pf",
  // Ajoute ici d'autres cas si besoin
};

// Fonction pour obtenir le code ISO à partir du nom du pays
function getCountryCode(regionFr: string | null): string | undefined {
  if (!regionFr) return undefined;
  if (COUNTRY_CODES[regionFr]) return COUNTRY_CODES[regionFr];
  // Fallback : prend les 2 premières lettres (ex: "France" => "fr")
  return regionFr
    .normalize("NFD")
    .replace(/[^a-zA-Z]/g, "")
    .toLowerCase()
    .slice(0, 2);
}

function regionFrToSlug(regionFr: string | null): string {
  if (!regionFr) return "";
  return regionFr
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les accents
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "") // retire caractères spéciaux
    .trim()
    .replace(/\s+/g, "-"); // espaces en tirets
}

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
  isRechargeable: boolean;
  isTop?: boolean;
}

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
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    const slug = regionFrToSlug(pkg.region_fr || "");
    if (slug) {
      router.push(`/shop/${slug}`);
    }
  };

  // console.log('pkggg',pkg)

  // Prix dynamique selon la devise
  let margin = parseFloat(localStorage.getItem('global_margin')!);
  let price = minPrice;
  let symbol = "€";
  if (currency === "XPF") {
    price = minPrice;
    symbol = "₣";
  } else if (currency === "USD") {
    price = minPrice;
    symbol = "$";
  }
  const priceWithMargin = price! * (1 + margin);

  const countryCode = getCountryCode(pkg.country || null);

  const cardClasses = isTop
    ? "group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-purple-200 hover:border-purple-400 transform hover:-translate-y-2 cursor-pointer overflow-hidden w-full"
    : "group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-purple-300 transform hover:-translate-y-1 cursor-pointer overflow-hidden w-full";

  return (
    <div className={cardClasses} onClick={handleClick}>
      {/* Premium Badge pour les top destinations */}
      {isTop && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-gradient-to-r from-purple-600 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center">
            <Star className="w-3 h-3 mr-1" />
            <span className="hidden xs:inline">TOP</span>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6">
        {/* Header avec drapeau et nom */}
        <div className="flex items-center mb-3 sm:mb-4">
          <div className="relative w-8 h-6 sm:w-12 sm:h-8 mr-2 sm:mr-3 rounded overflow-hidden shadow-sm flex-shrink-0">
              <img
                src={pkg.flag_url || ""}
                alt={pkg.region_fr || ""}
                className="object-cover"
              />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className={`font-bold truncate ${isTop ? "text-base sm:text-lg text-purple-800" : "text-sm sm:text-base text-gray-800"}`}
            >
              {pkg.region_fr}
            </h3>
          </div>
        </div>
        {/* Informations principales */}
        <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
          {/* Prix minimum */}
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-600">
              À partir de
            </span>
            <span className={`font-bold ${isTop ? "text-lg sm:text-2xl text-purple-600" : "text-base sm:text-xl text-purple-500"}`}>
              {priceWithMargin.toFixed(2)}{symbol}
            </span>
          </div>

          {/* Durée maximum */}
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-600">Jusqu'à</span>
            <span className="text-xs sm:text-sm font-medium text-gray-800">
              {minDays} days
            </span>
          </div>

          {/* Opérateur */}
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-600">Opérateur</span>
            <span className="text-xs sm:text-sm font-medium text-gray-800 truncate ml-2 max-w-20 sm:max-w-none">
              {pkg.operator_name}
            </span>
          </div>
        </div>

        {/* Bouton d'action */}
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
      {/* Effet de gradient en overlay pour les top destinations */}
      {isTop && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/20 to-orange-50/20 pointer-events-none" />
      )}
    </div>
  );
}
