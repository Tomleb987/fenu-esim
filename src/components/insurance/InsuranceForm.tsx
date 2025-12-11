"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StepIndicator } from "./StepIndicator";
import { TripDetailsStep } from "./TripDetailsStep";
import { PersonalInfoStep } from "./PersonalInfoStep";
import { TravelersStep } from "./TravelersStep";
import { OptionsStep } from "./OptionsStep";
import { SummaryStep } from "./SummaryStep";
import { ConfirmationStep } from "./ConfirmationStep";
import { InsuranceFormData } from "@/types/insurance";
import { toast } from "sonner";

const STEPS = ["Voyage", "Infos", "Voyageurs", "Options", "Récap"];

const initialFormData: InsuranceFormData = {
  destination: "",
  departureDate: "",
  returnDate: "",
  tripPrice: 0,
  subscriberCountry: "PF",
  firstName: "",
  lastName: "",
  birthDate: "",
  email: "",
  phone: "",
  address: "",
  postalCode: "",
  city: "",
  additionalTravelers: [],
  selectedOptions: [],
  acceptTerms: false,
  acceptPrivacy: false,
  acceptMarketing: false,
};

export default function InsuranceForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<InsuranceFormData>(initialFormData);
  const [quote, setQuote] = useState<{ premium: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const updateFormData = (data: Partial<InsuranceFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setErrors({});
  };

  const fetchQuote = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/get-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteData: {
            productType: "ava_tourist_card",
            startDate: formData.departureDate,
            endDate: formData.returnDate,
            destinationRegion: 102,
            tripCost: formData.tripPrice,
            subscriber: { birthDate: formData.birthDate || "1990-01-01" },
            companions: formData.additionalTravelers,
            options: {},
          },
        }),
      });

      const data = await response.json();
      console.log("Réponse /api/get-quote :", data);

      // accepte 0 si AVA renvoie 0
      if (response.ok && typeof data.price === "number") {
        setQuote({ premium: data.price });
      } else {
        toast.error(data.error || "Erreur tarif. Vérifiez les dates.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Problème de connexion.");
    } finally {
      setIsLoading(false);
    }
  };

  const startCheckout = async () => {
    if (!quote) {
      toast.error("Tarif manquant, impossible de lancer le paiement.");
      return;
    }
    if (!formData.email) {
      toast.error("Email requis pour le paiement.");
      return;
    }

    try {
      const response = await fetch("/api/insurance-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteData: {
            productType: "ava_tourist_card",
            startDate: formData.departureDate,
            endDate: formData.returnDate,
            tripCost: formData.tripPrice,
            subscriber: {
              firstName: formData.firstName,
              lastName: formData.lastName,
              birthDate: formData.birthDate,
            },
            additionalTravelers: formData.additionalTravelers,
          },
          userEmail: formData.email,
          amount: quote.premium, // montant AVA déjà calculé
        }),
      });

      const data = await response.json();
      console.log("Réponse /api/insurance-checkout :", data);

      if (response.ok && data.url) {
        window.location.href = data.url; // redirection vers Stripe
      } else {
        console.error("checkout error:", data);
        toast.error(data.error || "Erreur création du paiement.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Problème de connexion lors du paiement.");
    }
  };

  const handleNext = async () => {
    // validations simples
    if (currentStep === 1) {
      if (!formData.destination) {
        setErrors({ destination: "Requis" });
        return;
      }
      if (!formData.tripPrice) {
        setErrors({ tripPrice: "Requis" });
        return;
      }
    }

    // tu pourras ajouter d'autres validations pour les étapes 2 / 3 ici

    if (currentStep === 4) {
      await fetchQuote();
    }

    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo(0, 0);
    } else {
      // dernière étape : paiement Stripe
      await startCheckout();
    }
  };

  if (isSubmitted) {
    return (
      <ConfirmationStep
        formData={formData}
        onReset={() => window.location.reload()}
      />
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-elevated border-none">
      <CardContent className="p-6 md:p-8">
        <StepIndicator currentStep={currentStep} totalSteps={5} steps={STEPS} />

        <div className="mt-8 min-h-[300px]">
          {currentStep === 1 && (
            <TripDetailsStep
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
            />
          )}
          {currentStep === 2 && (
            <PersonalInfoStep
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
            />
          )}
          {currentStep === 3 && (
            <TravelersStep
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
            />
          )}
          {currentStep === 4 && (
            <OptionsStep
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
            />
          )}
          {currentStep === 5 && (
            <SummaryStep
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
              quote={quote}
              isLoadingQuote={isLoading}
            />
          )}
        </div>

        <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep((c) => (c > 1 ? c - 1 : 1))}
            disabled={currentStep === 1}
          >
            Retour
          </Button>

          <Button
            onClick={handleNext}
            disabled={isLoading}
            className="bg-gradient-hero text-white hover:opacity-90 shadow-lg transition-all px-8"
          >
            {isLoading
              ? "Chargement..."
              : currentStep === 5
              ? "Payer"
              : "Continuer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
