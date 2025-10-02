"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/lib/supabase/config";
import Image from "next/image";
import { Camera, Globe, Video, MessageSquare } from "lucide-react";
import React from "react";
import { stripePromise } from "@/lib/stripe/config";

// Types
type Package = Database["public"]["Tables"]["airalo_packages"]["Row"] & {
  region_image_url?: string;
  region_description?: string;
  region_slug?: string;
  image_url?: string;
};

type DataTip = {
  photo: string;
  web: string;
  video: string;
  chat: string;
  calls: string;
};

function getDataTip(amount: number, unit: string): DataTip {
  let go = unit.toLowerCase() === "mo" ? amount / 1024 : amount;
  return {
    photo: Math.floor(go * 500).toLocaleString(),
    web: Math.floor(go / 0.06) + "h",
    video: Math.floor(go / 1) + "h",
    chat: Math.floor(go * 3333).toLocaleString(),
    calls: Math.floor(go / 0.036) + "h",
  };
}

function slugToRegionFr(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
    .toLowerCase();
}

async function validateAndApplyPromoCode(
  code: string,
  packagePrice: number,
): Promise<{ isValid: boolean; discountedPrice: number; error?: string }> {
  try {
    const { data: promoCode, error } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", code)
      .single();

    if (error || !promoCode) {
      return {
        isValid: false,
        discountedPrice: packagePrice,
        error: "Code promo invalide",
      };
    }

    if (!promoCode.is_active) {
      return {
        isValid: false,
        discountedPrice: packagePrice,
        error: "Ce code promo n'est plus actif",
      };
    }

    const now = new Date();
    if (
      new Date(promoCode.valid_from) > now ||
      new Date(promoCode.valid_until) < now
    ) {
      return {
        isValid: false,
        discountedPrice: packagePrice,
        error: "Ce code promo n'est plus valide",
      };
    }

    if (promoCode.usage_limit && promoCode.times_used >= promoCode.usage_limit) {
      return {
        isValid: false,
        discountedPrice: packagePrice,
        error: "Ce code promo a atteint sa limite d'utilisation",
      };
    }

    let discountedPrice = packagePrice;
    if (promoCode.discount_percentage) {
      discountedPrice =
        packagePrice * (1 - promoCode.discount_percentage / 100);
    } else if (promoCode.discount_amount) {
      discountedPrice = Math.max(0, packagePrice - promoCode.discount_amount);
    }

    return { isValid: true, discountedPrice };
  } catch (error) {
    console.error("Error validating promo code:", error);
    return {
      isValid: false,
      discountedPrice: packagePrice,
      error: "Erreur lors de la validation du code promo",
    };
  }
}

export default function RegionPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();
  const params = useParams();
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [destinationImage, setDestinationImage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRecapModal, setShowRecapModal] = useState(false);
  const [destinationInfo, setDestinationInfo] = useState();
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    codePromo: "",
    codePartenaire: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const [currency, setCurrency] = useState<"EUR" | "USD" | "XPF">("EUR");

  // ✅ Pré-remplissage automatique du formulaire depuis localStorage
  useEffect(() => {
    const savedPromo = localStorage.getItem("promoCode");
    const savedPartner =
      localStorage.getItem("partnerRef") || localStorage.getItem("partnerCode");

    setForm((prev) => ({
      ...prev,
      codePromo: savedPromo || "",
      codePartenaire: savedPartner || "",
    }));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cur = localStorage.getItem("currency") as
        | "EUR"
        | "USD"
        | "XPF"
        | null;
      if (cur) setCurrency(cur);
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        if (!params?.region) {
          setError("Destination non trouvée");
          setLoading(false);
          return;
        }

        const regionParam = Array.isArray(params.region)
          ? params.region[0]
          : params.region;

        const { data: pkgs, error: pkgError } = await supabase
          .from("airalo_packages")
          .select("*")
          .eq("slug", regionParam);

        const { data: dest } = await supabase
          .from("destination_info")
          .select("*")
          .eq("name", pkgs?.[0].region_fr);

        /* @ts-ignore */
        setDestinationInfo(dest);

        if (pkgError) throw pkgError;
        if (!pkgs || pkgs.length === 0) {
          setError("Aucun forfait disponible pour cette destination");
          setLoading(false);
          return;
        }
        setPackages(pkgs);
        setSelectedPackage(pkgs[0]);
      } catch (err) {
        setError("Erreur lors du chargement des données");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params?.region]);

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleRecapSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom || !form.prenom || !form.email) {
      setFormError("Merci de remplir tous les champs obligatoires.");
      return;
    }
    if (!selectedPackage) {
      setFormError("Aucun forfait sélectionné.");
      return;
    }
    setFormError(null);

    let promoCodeToSave = null;
    let finalPrice = selectedPackage.final_price_eur!;

    if (form.codePromo) {
      const promoResult = await validateAndApplyPromoCode(
        form.codePromo,
        finalPrice,
      );
      if (!promoResult.isValid) {
        setFormError(promoResult.error || "Code promo invalide");
        return;
      }
      finalPrice = promoResult.discountedPrice;
      promoCodeToSave = form.codePromo;
    }

    localStorage.setItem("packageId", selectedPackage.id);
    localStorage.setItem("customerEmail", form.email);
    localStorage.setItem("customerName", `${form.prenom} ${form.nom}`);
    if (form.codePromo) localStorage.setItem("promoCode", form.codePromo);
    if (form.codePartenaire)
      localStorage.setItem("partnerCode", form.codePartenaire);

    setShowRecapModal(false);
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.prenom,
          last_name: form.nom,
          customer_email: form.email,
          cartItems: [
            {
              id: selectedPackage.id,
              name: selectedPackage.name,
              description: selectedPackage.description ?? "",
              final_price_eur: finalPrice,
              promo_code: promoCodeToSave || undefined,
              partner_code: form.codePartenaire || undefined,
            },
          ],
        }),
      });

      const { sessionId } = await response.json();
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe non initialisé");
      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) throw error;
    } catch (err) {
      console.error("Erreur lors de la redirection Stripe:", err);
      setFormError("Erreur lors du paiement, réessayez.");
    }
  }

  if (loading) {
    return <div className="p-10 text-center">Chargement...</div>;
  }

  if (error) {
    return <div className="p-10 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">
        {packages[0]?.region_fr || "Destination"}
      </h1>

      {/* Liste des forfaits */}
      {packages.map((pkg) => (
        <div key={pkg.id} className="border p-4 rounded mb-4">
          <h2 className="font-semibold">{pkg.name}</h2>
          <p>{pkg.description}</p>
          <button
            onClick={() => {
              setSelectedPackage(pkg);
              setShowRecapModal(true);
            }}
            className="mt-2 px-4 py-2 bg-purple-600 text-white rounded"
          >
            Acheter
          </button>
        </div>
      ))}

      {/* Pop-up recap */}
      {showRecapModal && selectedPackage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Récapitulatif</h2>
            <form onSubmit={handleRecapSubmit} className="space-y-3">
              <input
                type="text"
                name="nom"
                placeholder="Nom *"
                value={form.nom}
                onChange={handleFormChange}
                className="border w-full p-2 rounded"
              />
              <input
                type="text"
                name="prenom"
                placeholder="Prénom *"
                value={form.prenom}
                onChange={handleFormChange}
                className="border w-full p-2 rounded"
              />
              <input
                type="email"
                name="email"
                placeholder="Email *"
                value={form.email}
                onChange={handleFormChange}
                className="border w-full p-2 rounded"
              />
              <input
                type="text"
                name="codePromo"
                placeholder="Code promo (optionnel)"
                value={form.codePromo}
                onChange={handleFormChange}
                className="border w-full p-2 rounded"
              />
              <input
                type="text"
                name="codePartenaire"
                placeholder="Code partenaire (optionnel)"
                value={form.codePartenaire}
                onChange={handleFormChange}
                className="border w-full p-2 rounded"
              />
              {formError && (
                <div className="text-red-500 text-sm">{formError}</div>
              )}
              <button
                type="submit"
                className="w-full bg-purple-600 text-white py-2 rounded"
              >
                Payer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
