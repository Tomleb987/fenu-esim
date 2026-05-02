"use client";

import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/lib/supabase/config";
import { Search, X } from "lucide-react";
import Link from "next/link";

type Package = Database["public"]["Tables"]["airalo_packages"]["Row"];

interface RegionStats {
  minPrice: number;
  maxPrice: number;
  maxDays: number;
  packageCount: number;
  operatorName: string;
  countryCode: string;
  originalRegion: string;
}

const TOP_DESTINATIONS = ["France", "Canada", "États-Unis", "Australie", "Nouvelle-Zélande"];

const REGION_TRANSLATIONS: Record<string, string> = {
  "Discover Global": "Monde",
  "Asia": "Asie",
  "Europe": "Europe",
  "Japan": "Japon",
  "Japon": "Japon",
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
  "France": "France",
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
  "Faroe Islands": "Îles Féroé",
  "Oceania": "Océanie",
  "North America": "Amérique du Nord",
  "Middle East and North Africa": "Moyen-Orient et Afrique du Nord",
};

function getFrenchRegionName(regionFr: string | null, region: string | null): string {
  if (regionFr?.trim()) {
    const t = regionFr.trim();
    return REGION_TRANSLATIONS[t] || t;
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
  originalRegion,
  stats,
  currency,
  isTop = false,
}: {
  region: string;
  originalRegion: string;
  stats: RegionStats;
  currency: "EUR" | "USD" | "XPF";
  isTop?: boolean;
}) {
  const router = useRouter();
  const symbol = currency === "USD" ? "$" : currency === "XPF" ? "₣" : "€";

  const handleClick = () => {
    router.push(`/shop/${generateSlug(originalRegion)}`);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        background: "#fff",
        borderRadius: "14px",
        border: isTop ? "1.5px solid #E9D5FF" : "0.5px solid #E5E7EB",
        padding: "16px",
        cursor: "pointer",
        transition: "all .2s",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#A020F0";
        e.currentTarget.style.boxShadow = "0 4px 18px rgba(17,24,39,.08)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isTop ? "#E9D5FF" : "#E5E7EB";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {isTop && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "#F3E8FF",
            color: "#7B15B8",
            borderRadius: "50px",
            padding: "2px 8px",
            fontSize: "9px",
            fontWeight: 800,
          }}
        >
          ⭐ TOP
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <img
          src={stats.countryCode}
          alt={region}
          style={{
            width: "36px",
            height: "24px",
            objectFit: "cover",
            borderRadius: "4px",
            flexShrink: 0,
          }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <div>
          <div style={{ fontWeight: 700, fontSize: "14px", color: "#111827" }}>{region}</div>
          <div style={{ fontSize: "11px", color: "#9CA3AF" }}>
            {stats.packageCount} forfait{stats.packageCount > 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "12px", color: "#6B7280" }}>À partir de</span>
          <span style={{ fontWeight: 800, fontSize: "18px", color: "#111827" }}>
            {stats.minPrice.toFixed(2)}
            {symbol}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "12px", color: "#6B7280" }}>Jusqu'à</span>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>
            {stats.maxDays} jours
          </span>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
        style={{
          width: "100%",
          padding: "10px",
          background: "linear-gradient(90deg,#A020F0,#FF7F11)",
          color: "#fff",
          border: "none",
          borderRadius: "10px",
          fontWeight: 700,
          fontSize: "13px",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(160,32,240,.2)",
          transition: "transform .15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.02)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        Voir les forfaits →
      </button>
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
  const [typeFilter, setTypeFilter] = useState<"all" | "local" | "global">("all");
  const [margin, setMargin] = useState(0);

  useEffect(() => {
    if (!router.isReady) return;

    const promoCode = (router.query.code as string) || localStorage.getItem("promoCode");
    const partnerRef = (router.query.ref as string) || localStorage.getItem("partnerRef");

    if (promoCode) {
      localStorage.setItem("promoCode", promoCode);
      localStorage.setItem("fenuasim_promo_code", promoCode);
    }

    if (partnerRef) {
      localStorage.setItem("partnerRef", partnerRef);
      localStorage.setItem("fenuasim_partner_code", partnerRef);
    }
  }, [router.isReady, router.query]);

  useEffect(() => {
    async function fetchPackages() {
      try {
        const { data, error } = await supabase
          .from("airalo_packages")
          .select("*")
          .order("final_price_eur", { ascending: true });

        if (error) throw error;

        const validPackages = (data || []).filter((pkg) => {
          return (
            (pkg.final_price_eur != null && pkg.final_price_eur > 0) ||
            (pkg.final_price_usd != null && pkg.final_price_usd > 0) ||
            (pkg.final_price_xpf != null && pkg.final_price_xpf > 0)
          );
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const cur = localStorage.getItem("currency") as "EUR" | "USD" | "XPF" | null;
    if (cur) setCurrency(cur);

    setMargin(parseFloat(localStorage.getItem("global_margin") || "0"));
  }, []);

  const getPrice = (pkg: Package, cur: string): number => {
    if (cur === "USD") return pkg.final_price_usd || 0;
    if (cur === "XPF") return pkg.final_price_xpf || 0;
    return pkg.final_price_eur || 0;
  };

  const packagesByRegion = packages.reduce((acc, pkg) => {
    if (typeFilter !== "all" && pkg.type !== typeFilter) return acc;

    const region = getFrenchRegionName(pkg.region_fr, pkg.region);

    if (!acc[region]) acc[region] = [];
    acc[region].push(pkg);

    return acc;
  }, {} as Record<string, Package[]>);

  const regionStats = Object.entries(packagesByRegion).reduce((acc, [region, pkgs]) => {
    const prices = pkgs.map((p) => getPrice(p, currency)).filter((p) => p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const originalRegion = pkgs[0]?.region || pkgs[0]?.region_fr || region;

    acc[region] = {
      minPrice: minPrice * (1 + margin),
      maxPrice: maxPrice * (1 + margin),
      packageCount: pkgs.length,
      operatorName: pkgs[0]?.operator_name || "Inconnu",
      countryCode: pkgs[0]?.flag_url || "xx",
      maxDays: Math.max(
        ...pkgs.map((p) => parseInt(p.validity?.toString().split(" ")[0] || "0"))
      ),
      originalRegion,
    };

    return acc;
  }, {} as Record<string, RegionStats>);

  const regions = Object.keys(packagesByRegion).sort(
    (a, b) => regionStats[a].minPrice - regionStats[b].minPrice
  );

  const filteredRegions = regions.filter((r) =>
    r.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topDestinations = filteredRegions
    .filter((r) => TOP_DESTINATIONS.some((t) => t.toLowerCase() === r.toLowerCase()))
    .slice(0, 5);

  const otherDestinations = filteredRegions.filter(
    (r) => !TOP_DESTINATIONS.some((t) => t.toLowerCase() === r.toLowerCase())
  );

  const symbol = currency === "USD" ? "$" : currency === "XPF" ? "₣" : "€";

  const minDisplayedPrice = Object.values(regionStats)
    .map((s) => s.minPrice)
    .filter((p) => p > 0);

  const statsCards = [
    { n: filteredRegions.length, l: "Destinations", color: "#111827" },
    {
      n: Object.values(packagesByRegion).reduce((acc, pkgs) => acc + pkgs.length, 0),
      l: "Forfaits",
      color: "#111827",
    },
    {
      n: minDisplayedPrice.length > 0 ? `${Math.min(...minDisplayedPrice).toFixed(0)}${symbol}` : "-",
      l: "Prix min",
      color: "#111827",
    },
    {
      n:
        Object.values(regionStats).length > 0
          ? Math.max(...Object.values(regionStats).map((s) => s.maxDays))
          : "-",
      l: "Jours max",
      color: "#111827",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: "4px solid #F3E8FF",
              borderTopColor: "#A020F0",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ color: "#6B7280", fontSize: "14px" }}>
            Chargement des destinations...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p style={{ color: "#EF4444", marginBottom: "16px" }}>Erreur: {error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "8px 20px",
              background: "#EF4444",
              color: "#fff",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      <Head>
        <title>Acheter une eSIM de voyage — Boutique FENUA SIM | Polynésie française</title>
        <meta
          name="description"
          content="Choisissez votre eSIM parmi 180+ destinations. Forfaits data pour USA, Europe, Japon, Australie et plus. Livraison instantanée par email."
        />
        <link rel="canonical" href="https://www.fenuasim.com/shop" />
      </Head>

      <div style={{ position: "relative", overflow: "hidden", minHeight: "220px" }}>
        <img
          src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1400&fit=crop"
          alt="Shop eSIM"
          style={{ width: "100%", height: "220px", objectFit: "cover", display: "block" }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg,rgba(17,24,39,.88),rgba(17,24,39,.45),rgba(17,24,39,.15))",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "28px 24px",
          }}
        >
          <h1
            style={{
              fontWeight: 800,
              fontSize: "clamp(22px,4vw,36px)",
              color: "#fff",
              letterSpacing: "-.05em",
              marginBottom: "6px",
            }}
          >
            Toutes les destinations
          </h1>

          <p style={{ fontSize: "14px", color: "rgba(255,255,255,.72)", marginBottom: "16px" }}>
            180+ pays · Activation instantanée · Livraison par email
          </p>

          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "5px 5px 5px 14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              maxWidth: "500px",
              boxShadow: "0 4px 20px rgba(0,0,0,.2)",
            }}
          >
            <Search size={16} color="#9CA3AF" />

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une destination…"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: "14px",
                color: "#111827",
                background: "transparent",
                fontFamily: "inherit",
              }}
            />

            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9CA3AF",
                  display: "flex",
                }}
              >
                <X size={14} />
              </button>
            )}

            <button
              style={{
                background: "#111827",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "9px 16px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Rechercher
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          borderBottom: "0.5px solid #E5E7EB",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { val: "all", label: "Tous" },
            { val: "local", label: "Régional" },
            { val: "global", label: "Global" },
          ].map(({ val, label }) => (
            <button
              key={val}
              onClick={() => setTypeFilter(val as "all" | "local" | "global")}
              style={{
                padding: "5px 14px",
                borderRadius: "50px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all .15s",
                background: typeFilter === val ? "#111827" : "#fff",
                color: typeFilter === val ? "#fff" : "#6B7280",
                border: typeFilter === val ? "1.5px solid #111827" : "1.5px solid #E5E7EB",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          value={currency}
          onChange={(e) => {
            const nextCurrency = e.target.value as "EUR" | "USD" | "XPF";
            setCurrency(nextCurrency);
            localStorage.setItem("currency", nextCurrency);
          }}
          style={{
            border: "1.5px solid #E5E7EB",
            borderRadius: "8px",
            padding: "6px 12px",
            fontSize: "13px",
            fontWeight: 700,
            color: "#374151",
            background: "#fff",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="EUR">€ EUR</option>
          <option value="XPF">₣ XPF</option>
          <option value="USD">$ USD</option>
        </select>
      </div>

      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 24px" }}>
        {topDestinations.length > 0 && (
          <div style={{ marginBottom: "40px" }}>
            <h2 style={{ fontWeight: 800, fontSize: "20px", letterSpacing: "-.04em", marginBottom: "6px" }}>
              ⭐ Destinations populaires
            </h2>

            <p style={{ fontSize: "13px", color: "#9CA3AF", marginBottom: "18px" }}>
              {searchQuery
                ? `Résultats pour "${searchQuery}"`
                : "Les plus demandées par les voyageurs d'outre-mer"}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: "14px",
              }}
            >
              {topDestinations.map((region) => (
                <DestinationCard
                  key={region}
                  region={region}
                  originalRegion={regionStats[region].originalRegion}
                  stats={regionStats[region]}
                  currency={currency}
                  isTop
                />
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            marginBottom: "40px",
            borderRadius: "16px",
            overflow: "hidden",
            position: "relative",
            boxShadow: "0 4px 18px rgba(17,24,39,.08)",
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1200&fit=crop"
            alt="Assurance"
            style={{ width: "100%", height: "100px", objectFit: "cover", display: "block" }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg,rgba(17,24,39,.82),rgba(17,24,39,.45))",
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 24px",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: "16px", color: "#fff", marginBottom: "3px" }}>
                🛡️ Assurance voyage FENUASIM
              </div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,.85)" }}>
                Médical · Annulation · Bagages — dès 8,90€ / personne
              </div>
            </div>

            <Link
              href="/assurance"
              style={{
                background: "#fff",
                color: "#111827",
                padding: "9px 16px",
                borderRadius: "10px",
                fontWeight: 800,
                fontSize: "12px",
                whiteSpace: "nowrap",
                textDecoration: "none",
                boxShadow: "0 2px 8px rgba(0,0,0,.12)",
              }}
            >
              Découvrir →
            </Link>
          </div>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: "6px",
            }}
          >
            <h2 style={{ fontWeight: 800, fontSize: "20px", letterSpacing: "-.04em" }}>
              🌍 {otherDestinations.length > 0 ? "Toutes les destinations" : "Nos destinations"}
            </h2>

            <span style={{ fontSize: "13px", color: "#9CA3AF", fontWeight: 600 }}>
              {filteredRegions.length} pays
            </span>
          </div>

          <p style={{ fontSize: "13px", color: "#9CA3AF", marginBottom: "18px" }}>
            {searchQuery
              ? `Résultats pour "${searchQuery}"`
              : `Explorez nos ${regions.length} destinations disponibles`}
          </p>

          {filteredRegions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#9CA3AF" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔍</div>
              <div style={{ fontWeight: 600, marginBottom: "6px" }}>Aucune destination trouvée</div>

              <button
                onClick={() => setSearchQuery("")}
                style={{
                  color: "#A020F0",
                  background: "none",
                  border: "none",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                Effacer la recherche
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: "14px",
              }}
            >
              {(otherDestinations.length > 0 ? otherDestinations : regions).map((region) => (
                <DestinationCard
                  key={region}
                  region={region}
                  originalRegion={regionStats[region].originalRegion}
                  stats={regionStats[region]}
                  currency={currency}
                />
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: "12px",
            marginTop: "40px",
          }}
        >
          {statsCards.map(({ n, l, color }) => (
            <div
              key={l}
              style={{
                background: "#fff",
                border: "0.5px solid #E5E7EB",
                borderRadius: "12px",
                padding: "16px",
                textAlign: "center",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: "22px", color, marginBottom: "4px" }}>
                {n}
              </div>
              <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
