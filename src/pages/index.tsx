import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PackageCard from "@/components/shop/PackageCard";
import type { Database } from "@/lib/supabase/config";
import ChatWidget from "@/components/ChatWidget";

const TOP_DESTINATIONS = [
  "Europe",
  "Japan",
  "Australia",
  "United States",
  "Fiji",
  "New Zealand",
  "Mexico",
  "France",
  "Asia",
  "Discover Global",
];

type Package = Database["public"]["Tables"]["airalo_packages"]["Row"];

export default function Home() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

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
    // Only run on client
    const script = document.createElement("script");
    script.src = "https://invitejs.trustpilot.com/tp.min.js";
    script.async = true;
    document.body.appendChild(script);
    script.onload = () => {
      /* @ts-ignore */
      if (window.tp) {
        /* @ts-ignore */
        window.tp("register", "t5j5yxc20tHVgyo");
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Grouper les forfaits par région
  const packagesByRegion = packages.reduce(
    (acc, pkg) => {
      const region = pkg.region_fr || "";
      if (!acc[region]) acc[region] = [];
      acc[region].push(pkg);
      return acc;
    },
    {} as Record<string, Package[]>
  );

  // Calculer les stats pour chaque région
  const regionStats = Object.entries(packagesByRegion).reduce(
    (acc, [region, pkgs]) => {
      acc[region] = {
        minData: Math.min(...pkgs.map((p) => p.data_amount ?? 0)),
        maxData: Math.max(...pkgs.map((p) => p.data_amount ?? 0)),
        minDays: Math.min(...pkgs.map((p) => p.validity ?? 0)),
        maxDays: Math.max(
          ...pkgs.map((p) => parseInt(p.validity?.toString().split(" ")[0] || "0") ?? 0)
        ),
        minPrice: Math.min(...pkgs.map((p) => p.final_price_eur ?? 0)),
        packageCount: pkgs.length,
      };
      return acc;
    },
    {} as Record<string, any>
  );

  // Destinations populaires
  const topDestinations = TOP_DESTINATIONS.filter(
    (region) => packagesByRegion[region]
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-purple-600 via-purple-500 to-orange-500">
        {/* Wave Background */}
        <div className="absolute inset-0 overflow-hidden">
          <svg
            className="absolute bottom-0 left-0 w-full h-16 sm:h-20 lg:h-24 text-white/10"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
              fill="currentColor"
            />
          </svg>
          <svg
            className="absolute bottom-0 left-0 w-full h-20 sm:h-24 lg:h-32 text-white/5"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0V6c0,21.6,291,111.46,741,110.26,445.39,3.6,459-88.3,459-110.26V0Z"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* Inner container (optimisé) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 relative">
          <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-10">
            {/* Texte */}
            <div className="md:w-1/2 text-center md:text-left">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight font-extrabold text-white leading-tight">
                Votre eSIM{" "}
                <span className="text-orange-200">partout dans le Monde</span>
              </h1>
              <p className="mt-4 sm:mt-6 max-w-2xl mx-auto md:mx-0 text-lg sm:text-xl text-white/95">
                Activez votre forfait instantanément dans plus de 180 pays. Plus
                besoin de carte physique, activez votre forfait en quelques clics.
              </p>
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center md:justify-start gap-3 sm:gap-4">
                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center px-6 sm:px-8 py-3 rounded-full font-semibold text-purple-700 bg-white shadow hover:bg-orange-50 transition"
                >
                  Voir les forfaits
                </Link>
                <Link
                  href="/compatibilite"
                  className="inline-flex items-center justify-center px-6 sm:px-8 py-3 rounded-full font-semibold border border-white text-white hover:bg-white/10 transition"
                >
                  Vérifier la compatibilité
                </Link>
              </div>
            </div>

            {/* Visuel 3D optimisé (Next/Image) */}
            <div className="md:w-1/2 flex justify-center">
              <Image
                src="/images/hero-esim.png" // mets ici ton PNG/SVG final
                alt="Voyageurs FenuaSIM sélectionnant une destination eSIM"
                width={520}
                height={520}
                priority
                className="w-full h-auto max-w-xs sm:max-w-md"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Destinations populaires dynamiques */}
      <div className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-8 sm:mb-12">
            Destinations populaires
          </h2>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {topDestinations.map((region) => {
                const pkg = packagesByRegion[region][0];
                return (
                  <PackageCard
                    key={region}
                    pkg={pkg}
                    {...regionStats[region]}
                    isPopular={true}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Avis Clients */}
      <div className="max-w-3xl mx-auto my-12">
        <div className="bg-gradient-to-r from-purple-50 to-orange-50 rounded-2xl shadow-lg p-8 flex flex-col items-center border border-purple-100">
          <h3 className="text-2xl sm:text-3xl font-bold text-purple-800 mb-2 text-center">
            Ce que nos clients disent de FenuaSIM
          </h3>
          <p className="text-gray-700 text-center mb-6 max-w-xl">
            Votre satisfaction est notre priorité. Découvrez les avis de nos clients
            ou partagez votre expérience pour aider d'autres voyageurs à rester
            connectés partout dans le monde !
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
          <div className="mt-6 text-center">
            <span className="inline-block bg-green-100 text-green-800 text-sm font-semibold px-4 py-2 rounded-full">
              Merci à tous nos clients pour leur confiance !
            </span>
          </div>
        </div>
      </div>

      {/* Avantages Section */}
      <div className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            <div className="text-center">
              <div className="flex justify-center">
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-purple-100 flex items-center justify-center">
                  <svg
                    className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="mt-4 sm:mt-6 text-lg sm:text-xl font-bold text-gray-900">
                Configuration rapide
              </h3>
              <p className="mt-2 sm:mt-3 text-sm sm:text-base text-gray-500 px-2">
                Installez votre eSIM en quelques minutes et connectez-vous
                instantanément.
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center">
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-orange-100 flex items-center justify-center">
                  <svg
                    className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="mt-4 sm:mt-6 text-lg sm:text-xl font-bold text-gray-900">
                Service clientèle 7/7
              </h3>
              <p className="mt-2 sm:mt-3 text-sm sm:text-base text-gray-500 px-2">
                Notre équipe est disponible pour vous accompagner à tout moment.
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center">
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-purple-100 flex items-center justify-center">
                  <svg
                    className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="mt-4 sm:mt-6 text-lg sm:text-xl font-bold text-gray-900">
                Pour tous les budgets
              </h3>
              <p className="mt-2 sm:mt-3 text-sm sm:text-base text-gray-500 px-2">
                Des forfaits adaptés à tous les besoins et tous les budgets.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Comment ça marche */}
      <div className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-8 sm:mb-12">
            Comment ça marche ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            <div className="relative">
              <div className="flex justify-center">
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-purple-600 to-orange-500 text-white flex items-center justify-center text-lg sm:text-2xl font-bold">
                  1
                </div>
              </div>
              <h3 className="mt-4 sm:mt-6 text-lg sm:text-xl font-bold text-gray-900 text-center">
                Choisissez votre forfait
              </h3>
              <p className="mt-2 sm:mt-3 text-sm sm:text-base text-gray-500 text-center px-2">
                Sélectionnez le forfait qui correspond à vos besoins.
              </p>
              <div className="hidden md:block absolute top-8 sm:top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2">
                <svg
                  className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </div>
            </div>

            <div className="relative">
              <div className="flex justify-center">
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-purple-600 to-orange-500 text-white flex items-center justify-center text-lg sm:text-2xl font-bold">
                  2
                </div>
              </div>
              <h3 className="mt-4 sm:mt-6 text-lg sm:text-xl font-bold text-gray-900 text-center">
                Recevez votre eSIM
              </h3>
              <p className="mt-2 sm:mt-3 text-sm sm:text-base text-gray-500 text-center px-2">
                Obtenez votre eSIM par email avec un QR code.
              </p>
              <div className="hidden md:block absolute top-8 sm:top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2">
                <svg
                  className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </div>
            </div>

            <div>
              <div className="flex justify-center">
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-purple-600 to-orange-500 text-white flex items-center justify-center text-lg sm:text-2xl font-bold">
                  3
                </div>
              </div>
              <h3 className="mt-4 sm:mt-6 text-lg sm:text-xl font-bold text-gray-900 text-center">
                Connectez-vous
              </h3>
              <p className="mt-2 sm:mt-3 text-sm sm:text-base text-gray-500 text-center px-2">
                Scannez le QR code et profitez de votre connexion.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-8 sm:mb-12">
            Questions fréquentes
          </h2>
          <div className="max-w-3xl mx-auto">
            <div className="space-y-4 sm:space-y-6">
              {[
                {
                  question: "Comment fonctionne l'eSIM ?",
                  answer:
                    "L'eSIM est une carte SIM intégrée à votre appareil. Vous recevez un QR code par email que vous scannez pour activer votre forfait.",
                },
                {
                  question: "Mon appareil est-il compatible ?",
                  answer:
                    "La plupart des smartphones récents sont compatibles avec l'eSIM. Vérifiez la compatibilité de votre appareil dans notre guide.",
                },
                {
                  question: "Quand dois-je activer mon eSIM ?",
                  answer:
                    "Vous pouvez installer votre eSIM avant votre voyage, mais elle ne s'activera qu'à votre arrivée à destination.",
                },
              ].map((faq, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow duration-200 border border-purple-100"
                >
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    {faq.question}
                  </h3>
                  <p className="mt-2 text-sm sm:text-base text-gray-500">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
            <div className="text-center mt-6 sm:mt-8">
              <Link
                href="/faq"
                className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium text-sm sm:text-base"
              >
                Voir toutes les FAQ
                <svg
                  className="ml-2 h-4 w-4 sm:h-5 sm:w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ChatWidget />
    </div>
  );
}

