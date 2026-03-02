import { GetServerSideProps } from "next";
import Head from "next/head";
import { useEffect } from "react";

interface PartnerPageProps {
  partnerCode: string;
  promoCode: string | null;
  advisorName: string;
  error?: string;
}

export default function PartnerLandingPage({
  partnerCode,
  promoCode,
  advisorName,
  error,
}: PartnerPageProps) {
  useEffect(() => {
    // Fallback client-side redirect (shouldn't normally trigger since SSR handles it)
    if (!error && partnerCode && promoCode) {
      const redirectUrl = `/shop?ref=${encodeURIComponent(partnerCode)}&code=${encodeURIComponent(promoCode)}`;
      window.location.href = redirectUrl;
    }
  }, [partnerCode, promoCode, error]);

  // Error page: shown only if partner code is invalid/inactive
  if (error) {
    return (
      <>
        <Head>
          <title>Lien invalide - FENUA SIM</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">😔</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Lien partenaire invalide
            </h1>
            <p className="text-gray-600 mb-6">
              Le code partenaire &quot;{partnerCode}&quot; n&apos;est pas reconnu
              ou n&apos;est plus actif.
            </p>
            <a
              href="/shop"
              className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-orange-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Voir nos forfaits eSIM
            </a>
          </div>
        </div>
      </>
    );
  }

  // Brief loading state before redirect
  return (
    <>
      <Head>
        <title>Redirection - FENUA SIM</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            Redirection vers la boutique...
          </p>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { code } = context.params as { code: string };

  if (!code) {
    return {
      props: {
        partnerCode: "",
        promoCode: null,
        advisorName: "",
        error: "Code partenaire manquant",
      },
    };
  }

  try {
    // Call the track-partner API (handles partner lookup + click recording)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.fenuasim.com";
    const trackResponse = await fetch(
      `${baseUrl}/api/track-partner?code=${encodeURIComponent(code)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Forward visitor info for click tracking
          "x-forwarded-for":
            (context.req.headers["x-forwarded-for"] as string) ||
            context.req.socket.remoteAddress ||
            "",
          "user-agent": context.req.headers["user-agent"] || "",
        },
      }
    );

    if (!trackResponse.ok) {
      const errorData = await trackResponse.json().catch(() => ({}));
      return {
        props: {
          partnerCode: code,
          promoCode: null,
          advisorName: "",
          error: errorData.error || "Partenaire introuvable",
        },
      };
    }

    const data = await trackResponse.json();

    // Server-side redirect to shop with partner + promo codes
    return {
      redirect: {
        destination: `/shop?ref=${encodeURIComponent(data.partner_code)}&code=${encodeURIComponent(data.promo_code || "")}`,
        permanent: false,
      },
    };
  } catch (err) {
    console.error("Error in partner landing page:", err);
    return {
      props: {
        partnerCode: code,
        promoCode: null,
        advisorName: "",
        error: "Une erreur est survenue",
      },
    };
  }
};