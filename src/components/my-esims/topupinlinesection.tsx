"use client"; // If using Next.js App Router and client-side hooks

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation"; // Or 'next/router' for Pages Router
import { supabase } from "@/lib/supabase";
import { getAiraloToken } from "@/lib/airalo";
import { AiraloOrder } from "@/types/airaloOrder"; // Adjust path if necessary
import { loadStripe } from "@stripe/stripe-js";
import { ChevronLeft, ChevronRight, ShoppingCart, User } from "lucide-react";


const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface TopUpInlineSectionProps {
  order: AiraloOrder;
}

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

async function validateAndApplyPromoCode(code: string, packagePrice: number): Promise<{
  isValid: boolean;
  discountedPrice: number;
  error?: string;
}> {
  try {
    const { data: promoCode, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code)
      .single();

    if (error || !promoCode) {
      return {
        isValid: false,
        discountedPrice: packagePrice,
        error: 'Code promo invalide'
      };
    }

    // Check if promo code is active
    if (!promoCode.is_active) {
      return {
        isValid: false,
        discountedPrice: packagePrice,
        error: 'Ce code promo n\'est plus actif'
      };
    }

    // Check validity dates
    const now = new Date();
    if (new Date(promoCode.valid_from) > now || new Date(promoCode.valid_until) < now) {
      return {
        isValid: false,
        discountedPrice: packagePrice,
        error: 'Ce code promo n\'est plus valide'
      };
    }

    // Check usage limit
    if (promoCode.usage_limit && promoCode.times_used >= promoCode.usage_limit) {
      return {
        isValid: false,
        discountedPrice: packagePrice,
        error: 'Ce code promo a atteint sa limite d\'utilisation'
      };
    }

    // Calculate discounted price
    let discountedPrice = packagePrice;
    if (promoCode.discount_percentage) {
      discountedPrice = packagePrice * (1 - promoCode.discount_percentage / 100);
    } else if (promoCode.discount_amount) {
      discountedPrice = Math.max(0, packagePrice - promoCode.discount_amount);
    }

    return {
      isValid: true,
      discountedPrice
    };
  } catch (error) {
    console.error('Error validating promo code:', error);
    return {
      isValid: false,
      discountedPrice: packagePrice,
      error: 'Une erreur est survenue lors de la validation du code promo'
    };
  }
}

// Add this type for package-specific promo code state
type PackagePromoState = {
  code: string;
  error: string | null;
  discountedPrice: number | null;
};

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

const TopUpInlineSection: React.FC<TopUpInlineSectionProps> = ({ order }) => {
  const router = useRouter();
  const [originalPackageDetails, setOriginalPackageDetails] = useState<AiraloPackage | null>(null);
  const [topUpPackages, setTopUpPackages] = useState<AiraloPackage[]>([]);
  const [selectedTopUpPackage, setSelectedTopUpPackage] = useState<AiraloPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<"EUR" | "USD" | "XPF">("EUR");
  const [currentIndex, setCurrentIndex] = useState(0); // For carousel

  const [showRecapModal, setShowRecapModal] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    codePromo: "",
    codePartenaire: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoCodeError, setPromoCodeError] = useState<string | null>(null);
  const [discountedPrice, setDiscountedPrice] = useState<number | null>(null);
  const [appliedPromoCode, setAppliedPromoCode] = useState<PromoCode | null>(null);

  // Replace the single promo code states with a map
  const [packagePromoCodes, setPackagePromoCodes] = useState<Record<string, PackagePromoState>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cur = localStorage.getItem("currency") as "EUR" | "USD" | "XPF" | null;
      if (cur) setCurrency(cur);

      // Pre-fill form if user info is available (e.g., from Supabase auth or localStorage)
      // This is an example, adjust based on how you store user info
      const storedEmail = localStorage.getItem("customerEmail");
      const storedName = localStorage.getItem("customerName");
      if (storedEmail) setForm(prev => ({ ...prev, email: storedEmail }));
      if (storedName) {
        const nameParts = storedName.split(" ");
        setForm(prev => ({ ...prev, prenom: nameParts[0] || "", nom: nameParts.slice(1).join(" ") || "" }));
      }
    }
  }, []);

  useEffect(() => {
    const fetchAiraloTopupData = async (iccid: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/topups/${iccid}`, {
          method: "GET",
          headers: {
            "Accept": "application/json",
          },
        });
    
        if (!response.ok) {
          throw new Error("Erreur lors de la récupération des données de recharge.");
        }
    
        const result = await response.json();
        const data = result.data;
    
        setTopUpPackages(data || []);
        if (data && data.length > 0) {
          setSelectedTopUpPackage(data[0]);
        }
      } catch (err: any) {
        console.error("Error fetching top-up data:", err);
        setError(err.message || "Erreur lors du chargement des forfaits de recharge.");
      } finally {
        setLoading(false);
      }
    };    

    if (order.sim_iccid) {
      fetchAiraloTopupData(order.sim_iccid);
    }
  }, [order.sim_iccid]);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };
  const handleNext = () => {
    const maxIndex = Math.max(0, topUpPackages.length - (topUpPackages.length === 1 ? 1 : 2));
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAcheter = (pkg: AiraloPackage) => {
    setSelectedTopUpPackage(pkg);
    setShowRecapModal(true);
  };

  // Update the handlePromoCodeSubmit function
  const handlePromoCodeSubmit = async (e: React.FormEvent, packageId: string) => {
    e.preventDefault();
    const pkg = topUpPackages.find(p => p.id === packageId);
    if (!pkg) return;
    const pkgPrice = pkg.price * (1 + margin); 

    const result = await validateAndApplyPromoCode(
      packagePromoCodes[packageId]?.code || '',
      pkgPrice.toFixed(2) as unknown as number
    );

    setPackagePromoCodes(prev => ({
      ...prev,
      [packageId]: {
        code: packagePromoCodes[packageId]?.code || '',
        error: result.isValid ? null : (result.error || 'Code promo invalide'),
        discountedPrice: result.isValid ? result.discountedPrice : null
      }
    }));

    if (result.isValid) {
      localStorage.setItem('promoCode', packagePromoCodes[packageId]?.code || '');
    } else {
      localStorage.removeItem('promoCode');
    }
  };

  async function handleRecapSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom || !form.prenom || !form.email) {
      setFormError("Merci de remplir tous les champs obligatoires.");
      return;
    }
    if (!selectedTopUpPackage) {
      setFormError("Aucun forfait de recharge sélectionné.");
      return;
    }
    setFormError(null);
    
    // Validate promo code if provided
    let finalPrice = selectedTopUpPackage.price * (1 + margin);
    let promoCodeToSave = null;
    if (form.codePromo) {
      const promoResult = await validateAndApplyPromoCode(
        form.codePromo,
        finalPrice
      );
      if (!promoResult.isValid) {
        setFormError(promoResult.error || "Code promo invalide");
        return;
      }
      const usdToEur = 0.86;
      const usdToXpf = 102.75;
      if (currency === "EUR") {
        finalPrice = promoResult.discountedPrice * usdToEur;
      } else if (currency === "XPF") {
        const desired = promoResult.discountedPrice * usdToXpf;
        finalPrice = Math.round(desired);
      } else{
        finalPrice = promoResult.discountedPrice;
      }
      promoCodeToSave = form.codePromo;
    }
    else {
      const usdToEur = 0.86;
      const usdToXpf = 102.75;
      console.log("currency",currency)
      if (currency === "EUR") {
        finalPrice = finalPrice * usdToEur;
      } else if (currency === "XPF") {
        const desired = finalPrice * usdToXpf;
        finalPrice = Math.round(desired);
      } else{
        finalPrice = finalPrice;
      }
    }
    
    // Store customer info in localStorage
    localStorage.setItem("packageId", selectedTopUpPackage.id);
    localStorage.setItem("customerId", form.email);
    localStorage.setItem("customerEmail", form.email);
    localStorage.setItem("customerName", `${form.prenom} ${form.nom}`);
    if (form.codePromo) {
      localStorage.setItem("promoCode", form.codePromo);
    }
    if (form.codePartenaire) {
      localStorage.setItem("partnerCode", form.codePartenaire);
    }
    
    setShowRecapModal(false);
    try {
      const response = await fetch("/api/create-topup-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: [
            {
              id: selectedTopUpPackage.id,
              name: selectedTopUpPackage.name || selectedTopUpPackage.title,
              description: selectedTopUpPackage.description ?? "",
              price: finalPrice,
              currency: currency,
            },
          ],
          customer_email: form.email,
          is_top_up: true,
          sim_iccid: order.sim_iccid,
          promo_code: promoCodeToSave || undefined,
          partner_code: form.codePartenaire || undefined,
          first_name: form.prenom, // Map prenom to first_name
          last_name: form.nom, // Map nom to last_name
        }),
      });

      const { sessionId } = await response.json();
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe non initialisé");
      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) throw error;
    } catch (err) {
      console.error("Erreur lors de la redirection Stripe:", err);
      setFormError(
        "Une erreur est survenue lors de la redirection vers le paiement. Veuillez réessayer."
      );
    }
  }

  const margin = parseFloat(localStorage.getItem('global_margin')!);
  const displayPackages = topUpPackages.slice(currentIndex, currentIndex + (topUpPackages.length === 1 ? 1 : 2));
useEffect(() => {
    if (selectedTopUpPackage) {
      console.log("First package details:", selectedTopUpPackage);
    }
  }, [selectedTopUpPackage]);

  if (loading) {
    return (
      <div className="mt-4 p-4 border-t border-gray-200 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-4 border-t border-gray-200 text-center text-red-600">
        {error}
      </div>
    );
  }

  if (topUpPackages.length === 0 && !loading) {
    return (
         <div className="mt-4 p-4 border-t border-gray-200 text-center text-gray-600">
            Aucun forfait de recharge disponible pour cette région actuellement.
        </div>
    )
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <h4 className="text-md font-semibold text-gray-800 mb-3">
        Recharger votre eSIM (ICCID: {order.sim_iccid})
      </h4>
      <div className="mb-2">
        <span className="text-sm text-gray-600">Solde actuel: </span>
        <span className="text-sm font-medium text-gray-800">{order.data_balance}</span>
      </div>
      
      {originalPackageDetails && (
        <div className="mb-4 text-sm text-gray-500">
            Forfaits de recharge pour: {originalPackageDetails.region_fr}
        </div>
      )}

      {/* Package Carousel */}
      <div className="relative flex items-center justify-center mb-6">
        {topUpPackages.length > 2 && (
            <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="absolute left-0 z-10 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full p-2 shadow hover:bg-purple-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ top: "50%", transform: "translateY(-50%) translateX(-50%)" }}
            aria-label="Précédent"
            >
            <ChevronLeft className="w-5 h-5 text-purple-600" />
            </button>
        )}

        <div className={`w-full grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto`}>
          {displayPackages.map((pkg) => {
            const usdToEur = 0.86;
            const usdToXpf = 102.75;
            let price = pkg.price;
            let symbol = "$";
            if (currency === "EUR") {
              price = pkg.price * usdToEur;
              symbol = "€";
            } else if (currency === "XPF") {
              const desired = pkg.price * usdToXpf;
              price = Math.round(desired);
              symbol = "₣";
            }
            let priceWithMargin = price! * (1 + margin);

            return (
              <div
                key={pkg.id}
                className={`bg-white rounded-xl border-2 p-4 sm:p-6 flex flex-col items-center shadow-md w-full max-w-xs sm:max-w-sm mx-auto transition-all duration-200 cursor-pointer ${
                  selectedTopUpPackage?.id === pkg.id
                    ? "border-purple-500 ring-2 ring-purple-500"
                    : "border-gray-200 hover:border-purple-300 hover:shadow-lg"
                }`}
                onClick={() => setSelectedTopUpPackage(pkg)}
              >
                <div className="flex items-center gap-2 mb-2 self-start">
                  <h3 className="ml-1 text-sm font-bold text-purple-800">
                    <span className="font-bold underline">Topup:</span> {pkg.title || pkg.name}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-1 mb-3 justify-start self-start">
                  <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                    {pkg.data || pkg.amount ? `${pkg.data || `${pkg.amount} MB`}` : ""}
                  </span>
                  <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                    {pkg.day} Days
                  </span>
                  {/* Show if unlimited */}
                  {pkg.is_unlimited && (
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      Illimité
                    </span>
                  )}
                </div>
                {/* Show Voice and SMS if available */}
                <div className="flex flex-wrap gap-1 mb-2 self-start">
                  {pkg.voice && (
                    <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                      {pkg.voice} min voix
                    </span>
                  )}
                  {pkg.text && (
                    <span className="text-xs bg-pink-50 text-pink-700 px-2 py-0.5 rounded-full font-medium">
                      {pkg.text} SMS
                    </span>
                  )}
                </div>
                <div className="text-lg font-bold text-gray-800 mb-3 self-start">
                  {symbol}
                  {priceWithMargin.toFixed(2)}
                </div>
                <div className="flex flex-col items-center w-full">
                  <div className="w-full mb-4">
                    <form 
                      onSubmit={(e) => handlePromoCodeSubmit(e, pkg.id)} 
                      className="flex flex-col lg:flex-row gap-2 w-full"
                    >
                      <input
                        type="text"
                        value={packagePromoCodes[pkg.id]?.code || ''}
                        onChange={(e) => setPackagePromoCodes(prev => ({
                          ...prev,
                          [pkg.id]: {
                            ...prev[pkg.id],
                            code: e.target.value,
                            error: null,
                            discountedPrice: null
                          }
                        }))}
                        placeholder="Code promo"
                        className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-gray-800"
                      />
                      <button
                        type="submit"
                        className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Appliquer
                      </button>
                    </form>
                    {packagePromoCodes[pkg.id]?.error && (
                      <p className="text-red-500 text-sm mt-1">{packagePromoCodes[pkg.id].error}</p>
                    )}
                      <p className="text-green-600 text-sm mt-1">
                        Prix réduit: {packagePromoCodes[pkg.id]?.discountedPrice}
                      </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAcheter(pkg); }}
                    className="w-full mt-auto py-3 sm:py-2 bg-gradient-to-r from-purple-600 to-orange-500 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-orange-600 transition-all duration-300 text-base sm:text-sm flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Recharger
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {topUpPackages.length > 2 && (
            <button
            onClick={handleNext}
            disabled={currentIndex >= topUpPackages.length - (topUpPackages.length === 1 ? 1 : 2) || displayPackages.length < (topUpPackages.length === 1 ? 1 : 2) }
            className="absolute right-0 z-10 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full p-2 shadow hover:bg-purple-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ top: "50%", transform: "translateY(-50%) translateX(50%)" }}
            aria-label="Suivant"
            >
            <ChevronRight className="w-5 h-5 text-purple-600" />
            </button>
        )}
      </div>

      {/* Recap Modal (rendered as part of this inline section) */}
      {showRecapModal && selectedTopUpPackage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8 max-w-lg w-full relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl"
              onClick={() => setShowRecapModal(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <div className="flex items-center gap-3 mb-6">
                <User className="w-8 h-8 text-purple-600" />
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Vos informations</h2>
            </div>
            {formError && (
              <p className="text-red-500 text-sm mb-3">{formError}</p>
            )}
            <form onSubmit={handleRecapSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <label htmlFor="prenom" className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input type="text" name="prenom" id="prenom" value={form.prenom} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-gray-800"/>
                </div>
                <div>
                  <label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input type="text" name="nom" id="nom" value={form.nom} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-gray-800"/>
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" name="email" id="email" value={form.email} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-gray-800"/>
              </div>
              <div>
                <label htmlFor="codePromo" className="block text-sm font-medium text-gray-700 mb-1">Code promo</label>
                <input
                  type="text"
                  name="codePromo"
                  placeholder="Code promo (optionnel)"
                  value={form.codePromo}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500 text-base"
                  style={
                    {
                      WebkitTextFillColor: "#111827",
                      color: "#111827",
                    } as React.CSSProperties
                  }
                />
              </div>
              <div>
                <label htmlFor="codePartenaire" className="block text-sm font-medium text-gray-700 mb-1">Code partenaire</label>
                <input
                  type="text"
                  name="codePartenaire"
                  placeholder="Code partenaire (optionnel)"
                  value={form.codePartenaire}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500 text-base"
                  style={
                    {
                      WebkitTextFillColor: "#111827",
                      color: "#111827",
                    } as React.CSSProperties
                  }
                />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-orange-500 text-white font-semibold py-3 px-4 rounded-xl hover:from-purple-700 hover:to-orange-600 transition-all duration-300">
                  Procéder au paiement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopUpInlineSection;