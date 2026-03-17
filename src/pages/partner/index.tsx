// src/pages/partner/index.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "@/lib/supabaseClient";

interface AiraloPackage {
  id: string;
  name: string;
  data_amount?: string;
  data_unit?: string;
  validity_days?: number;
  price_xpf?: number;
  final_price_xpf?: number;
  price_eur?: number;
  final_price_eur?: number;
  currency?: string;
  status?: string;
  country?: string;
  region?: string;
  region_fr?: string;
  operator_name?: string;
  flag_url?: string;
  type?: string;
  validity?: string;
  includes_voice?: boolean;
  includes_sms?: boolean;
}

interface PartnerOrder {
  id: string;
  client_name: string;
  client_email: string;
  package_name: string;
  amount: number;
  currency: string;
  status: string;
  payment_url: string;
  esim_iccid?: string;
  created_at: string;
}

type Step = "destination" | "forfait" | "client" | "recap" | "lien";

const REGION_TRANSLATIONS: Record<string, string> = {
  "Discover Global": "Monde",
  Asia: "Asie",
  Europe: "Europe",
  Japan: "Japon",
  "Canary Islands": "Iles Canaries",
  "South Korea": "Coree du Sud",
  "Hong Kong": "Hong Kong",
  "United States": "Etats-Unis",
  Australia: "Australie",
  "New Zealand": "Nouvelle-Zelande",
  Mexico: "Mexique",
  Fiji: "Fidji",
  Thailand: "Thailande",
  Singapore: "Singapour",
  Malaysia: "Malaisie",
  Indonesia: "Indonesie",
  Philippines: "Philippines",
  Vietnam: "Viet Nam",
  India: "Inde",
  China: "Chine",
  Taiwan: "Taiwan",
  "United Kingdom": "Royaume-Uni",
  Germany: "Allemagne",
  Spain: "Espagne",
  Italy: "Italie",
  Greece: "Grece",
  Portugal: "Portugal",
  Netherlands: "Pays-Bas",
  Belgium: "Belgique",
  Switzerland: "Suisse",
  Austria: "Autriche",
  Poland: "Pologne",
  "Czech Republic": "Republique tcheque",
  Turkey: "Turquie",
  Egypt: "Egypte",
  Morocco: "Maroc",
  "South Africa": "Afrique du Sud",
  Brazil: "Bresil",
  Argentina: "Argentine",
  Chile: "Chili",
  Colombia: "Colombie",
  Peru: "Perou",
  UAE: "Emirats arabes unis",
  "United Arab Emirates": "Emirats arabes unis",
  "Saudi Arabia": "Arabie saoudite",
  Israel: "Israel",
  Jordan: "Jordanie",
  Qatar: "Qatar",
  Kuwait: "Koweit",
  Bahrain: "Bahrein",
  Oman: "Oman",
  Canada: "Canada",
  France: "France",
  Lebanon: "Liban",
  Albania: "Albanie",
  Algeria: "Algerie",
  Armenia: "Armenie",
  Bangladesh: "Bangladesh",
  Bulgaria: "Bulgarie",
  Cambodia: "Cambodge",
  Croatia: "Croatie",
  Cyprus: "Chypre",
  Denmark: "Danemark",
  Ecuador: "Equateur",
  Estonia: "Estonie",
  Ethiopia: "Ethiopie",
  Finland: "Finlande",
  Georgia: "Georgie",
  Ghana: "Ghana",
  Hungary: "Hongrie",
  Iceland: "Islande",
  Ireland: "Irlande",
  Kazakhstan: "Kazakhstan",
  Kenya: "Kenya",
  Laos: "Laos",
  Latvia: "Lettonie",
  Lithuania: "Lituanie",
  Luxembourg: "Luxembourg",
  Madagascar: "Madagascar",
  Maldives: "Maldives",
  Malta: "Malte",
  Mauritius: "Maurice",
  Mongolia: "Mongolie",
  Montenegro: "Montenegro",
  Myanmar: "Myanmar",
  Namibia: "Namibie",
  Nepal: "Nepal",
  Nigeria: "Nigeria",
  Norway: "Norvege",
  Pakistan: "Pakistan",
  Panama: "Panama",
  Romania: "Roumanie",
  Russia: "Russie",
  Rwanda: "Rwanda",
  Senegal: "Senegal",
  Serbia: "Serbie",
  Slovakia: "Slovaquie",
  Slovenia: "Slovenie",
  "Sri Lanka": "Sri Lanka",
  Sweden: "Suede",
  Tanzania: "Tanzanie",
  Tunisia: "Tunisie",
  Ukraine: "Ukraine",
  Uruguay: "Uruguay",
  Venezuela: "Venezuela",
  Oceania: "Oceanie",
  "North America": "Amerique du Nord",
  "Middle East and North Africa": "Moyen-Orient et Afrique du Nord",
  "French Polynesia": "Polynesie francaise",
};

const TOP_DESTINATIONS = [
  "France",
  "Canada",
  "Etats-Unis",
  "Australie",
  "Nouvelle-Zelande",
  "Japon",
  "Europe",
];

function getFrenchName(pkg: AiraloPackage): string {
  const raw = pkg.region || pkg.country || "";
  if (pkg.region_fr && pkg.region_fr !== raw) return pkg.region_fr;
  return REGION_TRANSLATIONS[raw] || raw || "-";
}

export default function PartnerDashboard() {
  const router = useRouter();
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("destination");
  const [packages, setPackages] = useState<AiraloPackage[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<AiraloPackage | null>(null);
  const [clientForm, setClientForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [generatedLink, setGeneratedLink] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState("");
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [activeTab, setActiveTab] = useState<"new" | "orders">("new");
  const [searchQuery, setSearchQuery] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resentId, setResentId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/partner/login");
        return;
      }

      const { data: profile } = await supabase
        .from("partner_profiles")
        .select("*")
        .eq("email", session.user.email)
        .single();

      if (!profile || !profile.is_active) {
        await supabase.auth.signOut();
        router.push("/partner/login?error=unauthorized");
        return;
      }

      setPartnerProfile(profile);
      setLoading(false);
      loadPackages();
      loadOrders(profile.partner_code);
    };

    checkAuth();
  }, [router]);

  const loadPackages = async () => {
    let allData: AiraloPackage[] = [];
    let from = 0;
    const pageSize = 1000;

    // CORRECTION 1 : Ajout d'un try/catch pour éviter le plantage silencieux
    try {
      while (true) {
        const { data, error } = await supabase
          .from("airalo_packages")
          .select(
            "id, name, data_amount, data_unit, validity_days, validity, price_xpf, final_price_xpf, price_eur, final_price_eur, currency, status, country, region, region_fr, operator_name, flag_url, type, includes_voice, includes_sms"
          )
          .eq("status", "active")
          .range(from, from + pageSize - 1);

        if (error || !data || data.length === 0) break;

        allData = [...allData, ...data];

        if (data.length < pageSize) break;
        from += pageSize;
      }
      setPackages(allData);
    } catch (err) {
      console.error("Erreur critique lors du chargement des forfaits:", err);
    }
  };

  const loadOrders = async (partnerCode: string) => {
    const { data } = await supabase
      .from("partner_orders_view")
      .select("*")
      .eq("partner_code", partnerCode)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setOrders(data as PartnerOrder
