"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AiraloOrder } from "@/types/airaloOrder";
import { loadStripe } from "@stripe/stripe-js";
import { ChevronLeft, ChevronRight, ShoppingCart, Zap } from "lucide-react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface TopUpInlineSectionProps {
  order: AiraloOrder;
}

export type AiraloPackage = {
  id: string;
  name: string;
  title?: string | null;
  description?: string | null;
  data?: string | null;
  amount?: number | null;
  data_unit?: string | null;
  day: number;
  price: number;
  net_price?: number | null;
  is_unlimited?: boolean;
  type?: string | null;
  voice?: string | number | null;
  text?: string | number | null;
  short_info?: string | null;
  region_fr?: string | null;
};

type PromoCode = {
  id: number;
  code: string;
  discount_percentage: number | null;
  discount_amount: number | null;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  usage_limit: number;
  times_used: number;
};

async function validateAndApplyPromoCode(
  code: string,
  packagePrice: number
): Promise<{ isValid: boolean; discountedPrice: number; error?: string }> {
  try {
    const { data: promoCode, error } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", code)
      .single();

    if (error || !promoCode) return { isValid: false, discountedPrice: packagePrice, error: "Code promo invalide" };
    if (!promoCode.is_active) return { isValid: false, discountedPrice: packagePrice, error: "Ce code promo n'est plus actif" };

    const now = new Date();
    if (new Date(promoCode.valid_from) > now || new Date(promoCode.valid_until) < now) {
      return { isValid: false, discountedPrice: packagePrice, error: "Ce code promo n'est plus valide" };
    }
    if (promoCode.usage_limit && promoCode.times_used >= promoCode.usage_limit) {
      return { isValid: false, discountedPrice: packagePrice, error: "Ce code promo a atteint sa limite d'utilisation" };
    }

    let discountedPrice = packagePrice;
    if (promoCode.discount_percentage) {
      discountedPrice = packagePrice * (1 - promoCode.discount_percentage / 100);
    } else if (promoCode.discount_amount) {
      discountedPrice = Math.max(0, packagePrice - promoCode.discount_amount);
    }

    return { isValid: true, discountedPrice };
  } catch {
    return { isValid: false, discountedPrice: packagePrice, error: "Erreur lors de la validation du code promo" };
  }
}

const TopUpInlineSection: React.FC<TopUpInlineSectionProps> = ({ order }) => {
  const router = useRouter();
  const [topUpPackages, setTopUpPackages] = useState<AiraloPackage[]>([]);
  const [selectedTopUpPackage, setSelectedTopUpPackage] = useState<AiraloPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<"EUR" | "USD" | "XPF">("EUR");
  const [currentIndex, setCurrentIndex] = useState(0);

  // FIX 3A : pré-remplissage depuis la session Supabase — pas de modale
  const [userEmail, setUserEmail] = useState("");
  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");

  // Code promo — uniquement au moment de payer, pas par carte
  const [promoCode, setPromoCode] = useState("");
  const [partnerCode, setPartnerCode] = useState("");

  // FIX 3B : margin avec fallback à 0 — dans un useMemo pour éviter le crash SSR
  const margin = useMemo(() => {
    if (typeof window === "undefined") return 0;
    return parseFloat(localStorage.getItem("global_margin") ?? "0") || 0;
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cur = localStorage.getItem("currency") as "EUR" | "USD" | "XPF" | null;
      if (cur) setCurrency(cur);
    }
  }, []);

  // Charger les infos utilisateur depuis Supabase
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        const meta = user.user_metadata;
        if (meta?.full_name) {
          const parts = meta.full_name.split(" ");
          setUserFirstName(parts[0] || "");
          setUserLastName(parts.slice(1).join(" ") || "");
        } else {
          setUserFirstName(meta?.first_name || "");
          setUserLastName(meta?.last_name || "");
        }
      }
    };
    loadUser();
  }, []);

  // Charger les packages topup
  useEffect(() => {
    const fetchTopupData = async (iccid: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/topups/${iccid}`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Erreur lors de la récupération des forfaits de recharge.");
        const result = await response.json();
        const data = result.data || [];
        setTopUpPackages(data);
        if (data.length > 0) setSelectedTopUpPackage(data[0]);
      } catch (err: any) {
        setError(err.message || "Erreur lors du chargement des forfaits de recharge.");
      } finally {
        setLoading(false);
      }
    };

    if (order.sim_iccid) fetchTopupData(order.sim_iccid);
  }, [order.sim_iccid]);

  const handlePrev = () => setCurrentIndex((prev) => Math.max(0, prev - 1));
  const handleNext = () => {
    const maxIndex = Math.max(0, topUpPackages.length - 2);
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  // Conversion devise
  const convertPrice = (usdPrice: number): { price: number; symbol: string } => {
    if (currency === "EUR") return { price: usdPrice * 0.86, symbol: "€" };
    if (currency === "XPF") return { price: Math.round(usdPrice * 102.75), symbol: "₣" };
    return { price: usdPrice, symbol: "$" };
  };

  // FIX 3C : handleAcheter — plus de modale, on soumet directement
  const handleAcheter = async (pkg: AiraloPackage) => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const basePrice = pkg.price * (1 + margin);
      const { price: convertedPrice } = convertPrice(basePrice);

      let finalPrice = convertedPrice;
      let promoCodeToSave: string | null = null;

      if (promoCode) {
        const promoResult = await validateAndApplyPromoCode(promoCode, convertedPrice);
        if (!promoResult.isValid) {
          setSubmitError(promoResult.error || "Code promo invalide");
          setSubmitting(false);
          return;
        }
        finalPrice = promoResult.discountedPrice;
        promoCodeToSave = promoCode;
      }

      if (!pkg.id) {
        setSubmitError("Données du forfait incomplètes. Veuillez rafraîchir la page.");
        setSubmitting(false);
        return;
      }

      // Stocker les infos pour la page success
      localStorage.setItem("packageId", pkg.id);
      localStorage.setItem("customerEmail", userEmail);
      localStorage.setItem("customerName", `${userFirstName} ${userLastName}`.trim());
      if (promoCodeToSave) localStorage.setItem("promoCode", promoCodeToSave);
      if (partnerCode) localStorage.setItem("partnerCode", partnerCode);

      const response = await fetch("/api/create-topup-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: [{
            id: pkg.id,
            name: pkg.name || pkg.title,
            description: pkg.description ?? "",
            price: finalPrice,
            currency: currency,
          }],
          customer_email: userEmail,
          is_top_up: true,
          sim_iccid: order.sim_iccid,
          promo_code: promoCodeToSave || undefined,
          partner_code: partnerCode || undefined,
          first_name: userFirstName,
          last_name: userLastName,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.error?.message || responseData.message;
        setSubmitError(errorMessage || "Une erreur est survenue. Veuillez réessayer.");
        return;
      }

      const { sessionId } = responseData;
      if (!sessionId) throw new Error("Session ID non retourné");

      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe non initialisé");

      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
      if (stripeError) throw stripeError;

    } catch (err: any) {
      console.error("Erreur checkout topup:", err);
      setSubmitError("Une erreur est survenue lors de la redirection vers le paiement.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-4 p-4 border-t border-gray-200 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-4 border-t border-gray-200 text-center text-red-600 text-sm">
        {error}
      </div>
    );
  }

  if (topUpPackages.length === 0) {
    return (
      <div className="mt-4 p-4 border-t border-gray-200 text-center text-gray-500 text-sm">
        Aucun forfait de recharge disponible pour cette région actuellement.
      </div>
    );
  }

  const displayPackages = topUpPackages.slice(
    currentIndex,
    currentIndex + (topUpPackages.length === 1 ? 1 : 2)
  );

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 px-1">
      <h4 className="text-sm font-semibold text-gray-800 mb-1">
        Recharger — <span className="font-mono text-xs text-gray-500">…{order.sim_iccid.slice(-6)}</span>
      </h4>
      <p className="text-xs text-gray-500 mb-4">
        Solde actuel : <span className="font-medium text-gray-700">{order.data_balance}</span>
      </p>

      {/* Carousel packages */}
      <div className="relative flex items-center mb-5">
        {topUpPackages.length > 2 && (
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="absolute -left-3 z-10 bg-white border border-gray-200 rounded-full p-1.5 shadow hover:bg-purple-50 disabled:opacity-40"
            aria-label="Précédent"
          >
            <ChevronLeft className="w-4 h-4 text-purple-600" />
          </button>
        )}

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayPackages.map((pkg) => {
            const basePrice = pkg.price * (1 + margin);
            const { price, symbol } = convertPrice(basePrice);
            const isSelected = selectedTopUpPackage?.id === pkg.id;

            return (
              <button
                key={pkg.id}
                onClick={() => setSelectedTopUpPackage(pkg)}
                className={`text-left rounded-xl border-2 p-4 transition-all ${
                  isSelected
                    ? "border-[#D251D8] bg-purple-50"
                    : "border-gray-200 bg-white hover:border-purple-300"
                }`}
              >
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  {pkg.is_unlimited ? "Illimité" : (pkg.data || `${pkg.amount} Mo`)}
                </p>
                <div className="flex flex-wrap gap-1 mb-2">
                  <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                    {pkg.day} jours
                  </span>
                  {pkg.voice ? (
                    <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">
                      {pkg.voice} min
                    </span>
                  ) : null}
                  {pkg.text ? (
                    <span className="text-xs bg-pink-50 text-pink-700 px-2 py-0.5 rounded-full">
                      {pkg.text} SMS
                    </span>
                  ) : null}
                </div>
                <p className="text-lg font-bold text-[#D251D8]">
                  {symbol}{typeof price === "number" ? price.toFixed(2) : price}
                </p>
              </button>
            );
          })}
        </div>

        {topUpPackages.length > 2 && (
          <button
            onClick={handleNext}
            disabled={currentIndex >= topUpPackages.length - 2}
            className="absolute -right-3 z-10 bg-white border border-gray-200 rounded-full p-1.5 shadow hover:bg-purple-50 disabled:opacity-40"
            aria-label="Suivant"
          >
            <ChevronRight className="w-4 h-4 text-purple-600" />
          </button>
        )}
      </div>

      {/* Code promo + partenaire (optionnels, discrets) */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <input
          type="text"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          placeholder="Code promo (optionnel)"
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-400 focus:border-purple-400 text-gray-800 placeholder-gray-400"
        />
        <input
          type="text"
          value={partnerCode}
          onChange={(e) => setPartnerCode(e.target.value)}
          placeholder="Code partenaire (optionnel)"
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-400 focus:border-purple-400 text-gray-800 placeholder-gray-400"
        />
      </div>

      {submitError && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">
          {submitError}
        </p>
      )}

      {/* CTA principal */}
      <button
        onClick={() => selectedTopUpPackage && handleAcheter(selectedTopUpPackage)}
        disabled={!selectedTopUpPackage || submitting}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[#D251D8] text-white font-semibold rounded-xl hover:bg-[#b83fbe] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            Redirection en cours…
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            {selectedTopUpPackage
              ? `Recharger — ${convertPrice(selectedTopUpPackage.price * (1 + margin)).symbol}${convertPrice(selectedTopUpPackage.price * (1 + margin)).price.toFixed(2)}`
              : "Sélectionnez un forfait"}
          </>
        )}
      </button>

      {/* Info client pré-rempli (transparent pour l'utilisateur) */}
      {userEmail && (
        <p className="text-xs text-gray-400 text-center mt-2">
          Commande pour <span className="text-gray-500">{userEmail}</span>
        </p>
      )}
    </div>
  );
};

export default TopUpInlineSection;
