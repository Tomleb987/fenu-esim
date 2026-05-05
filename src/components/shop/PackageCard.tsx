"use client";

import { Database } from "@/lib/supabase/config";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Star } from "lucide-react";

type Package = Database["public"]["Tables"]["airalo_packages"]["Row"];

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
  "Oman": "Oman", "Azerbaijan": "Azerbaïdjan", "Jamaica": "Jamaïque", "Canada": "Canada",
  "Albania": "Albanie", "Algeria": "Algérie", "Angola": "Angola", "Armenia": "Arménie",
  "Bangladesh": "Bangladesh", "Belarus": "Biélorussie", "Bolivia": "Bolivie",
  "Bosnia and Herzegovina": "Bosnie-Herzégovine", "Botswana": "Botswana",
  "Bulgaria": "Bulgarie", "Cambodia": "Cambodge", "Cameroon": "Cameroun", "Chad": "Tchad",
  "Croatia": "Croatie", "Cuba": "Cuba", "Cyprus": "Chypre", "Denmark": "Danemark",
  "Dominican Republic": "République dominicaine", "Ecuador": "Équateur", "Estonia": "Estonie",
  "Ethiopia": "Éthiopie", "Finland": "Finlande", "Georgia": "Géorgie", "Ghana": "Ghana",
  "Guatemala": "Guatemala", "Honduras": "Honduras", "Hungary": "Hongrie", "Iceland": "Islande",
  "Ireland": "Irlande", "Ivory Coast": "Côte d'Ivoire", "Kazakhstan": "Kazakhstan",
  "Kenya": "Kenya", "Kyrgyzstan": "Kirghizistan", "Laos": "Laos", "Latvia": "Lettonie",
  "Lithuania": "Lituanie", "Luxembourg": "Luxembourg", "Madagascar": "Madagascar",
  "Maldives": "Maldives", "Mali": "Mali", "Malta": "Malte", "Mauritius": "Maurice",
  "Moldova": "Moldavie", "Mongolia": "Mongolie", "Montenegro": "Monténégro",
  "Myanmar": "Myanmar", "Namibia": "Namibie", "Nepal": "Népal", "Nicaragua": "Nicaragua",
  "Nigeria": "Nigeria", "North Macedonia": "Macédoine du Nord", "Norway": "Norvège",
  "Pakistan": "Pakistan", "Panama": "Panama", "Paraguay": "Paraguay", "Romania": "Roumanie",
  "Russia": "Russie", "Rwanda": "Rwanda", "Senegal": "Sénégal", "Serbia": "Serbie",
  "Slovakia": "Slovaquie", "Slovenia": "Slovénie", "Sri Lanka": "Sri Lanka", "Sweden": "Suède",
  "Tanzania": "Tanzanie", "Tunisia": "Tunisie", "Ukraine": "Ukraine", "Uruguay": "Uruguay",
  "Uzbekistan": "Ouzbékistan", "Venezuela": "Venezuela", "Zambia": "Zambie", "Zimbabwe": "Zimbabwe",
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

const COUNTRY_CODES: Record<string, string> = {
  "États-Unis": "us", "Royaume-Uni": "gb", "Corée du Sud": "kr",
  "Émirats arabes unis": "ae", "République tchèque": "cz", "Hong Kong": "hk",
  Taïwan: "tw", Japon: "jp", Australie: "au", Canada: "ca", France: "fr",
  "Nouvelle-Calédonie": "nc", "Polynésie française": "pf",
};

function getCountryCode(regionFr: string | null): string | undefined {
  if (!regionFr) return undefined;
  if (COUNTRY_CODES[regionFr]) return COUNTRY_CODES[regionFr];
  return regionFr.normalize("NFD").replace(/[^a-zA-Z]/g, "").toLowerCase().slice(0, 2);
}

function regionFrToSlug(regionFr: string | null): string {
  if (!regionFr) return "";
  return regionFr.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9 ]/g, "").trim().replace(/\s+/g, "-");
}

function formatPrice(price: number, currency: "EUR" | "XPF" | "USD"): string {
  if (currency === "XPF") return `${Math.round(price).toLocaleString("fr-FR")} ₣`;
  if (currency === "USD") return `$${price.toFixed(2)}`;
  return `${price.toFixed(2)} €`;
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
  pkg, minData, maxData, minDays, maxDays, minPrice, packageCount,
  isPopular = false, currency, isRechargeable, isTop = false,
}: PackageCardProps) {
  const router = useRouter();
  const [showAllNetworks, setShowAllNetworks] = useState(false);

  const handleClick = () => {
    const slug = regionFrToSlug(pkg.region_fr || "");
    if (slug) router.push(`/shop/${slug}`);
  };

  const margin = parseFloat(localStorage.getItem('global_margin')!);
  const priceWithMargin = minPrice * (1 + margin);

  const rawNetwork = (pkg as any).networks || pkg.operator_name || "";
  const networkParts = rawNetwork.split(" · ");
  const hasMore = networkParts.length > 2;
  const networkDisplay = showAllNetworks
    ? rawNetwork
    : hasMore
    ? `${networkParts.slice(0, 2).join(" · ")}`
    : rawNetwork;

  const cardClasses = isTop
    ? "group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-purple-200 hover:border-purple-400 transform hover:-translate-y-2 cursor-pointer overflow-hidden w-full"
    : "group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-purple-300 transform hover:-translate-y-1 cursor-pointer overflow-hidden w-full";

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

      <div className="p-4 sm:p-6">
        <div className="flex items-center mb-3 sm:mb-4">
          <div className="relative w-8 h-6 sm:w-12 sm:h-8 mr-2 sm:mr-3 rounded overflow-hidden shadow-sm flex-shrink-0">
            <img src={pkg.flag_url || ""} alt={pkg.region_fr || ""} className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={`font-bold truncate ${isTop ? "text-base sm:text-lg text-purple-800" : "text-sm sm:text-base text-gray-800"}`}>
              {getFrenchRegionName(pkg.region_fr, pkg.region)}
            </h3>
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-600">À partir de</span>
            <span className={`font-bold ${isTop ? "text-lg sm:text-2xl text-purple-600" : "text-base sm:text-xl text-purple-500"}`}>
              {formatPrice(priceWithMargin, currency)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-600">Jusqu'à</span>
            <span className="text-xs sm:text-sm font-medium text-gray-800">
              {minDays} jour{minDays > 1 ? "s" : ""}
            </span>
          </div>

          {/* Réseau avec expand */}
          <div className="flex flex-col gap-1">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">Réseau</span>
              <span className="text-xs sm:text-sm font-medium text-gray-800 text-right leading-relaxed">
                {networkDisplay}
                {hasMore && !showAllNetworks && (
                  <>
                    {" "}
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowAllNetworks(true); }}
                      style={{ color: "#A020F0", fontWeight: 700, fontSize: "11px", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      +{networkParts.length - 2} voir tout
                    </button>
                  </>
                )}
                {showAllNetworks && (
                  <>
                    {" "}
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowAllNetworks(false); }}
                      style={{ color: "#A020F0", fontWeight: 700, fontSize: "11px", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      réduire
                    </button>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        <button
          className={`w-full py-2 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 ${
            isTop
              ? "bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white shadow-lg hover:shadow-xl"
              : "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg"
          }`}
          onClick={(e) => { e.stopPropagation(); handleClick(); }}
        >
          <span className="hidden xs:inline">{isTop ? "Découvrir" : "Voir les forfaits"}</span>
          <span className="xs:hidden">Voir</span>
        </button>
      </div>

      {isTop && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/20 to-orange-50/20 pointer-events-none" />
      )}
    </div>
  );
}
