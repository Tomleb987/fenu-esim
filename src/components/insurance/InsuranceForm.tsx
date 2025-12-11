"use client";

import { useState, useEffect } from "react";
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

  const fetchQuote = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
        const response = await fetch('/api/get-quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quoteData: {
                    productType: "ava_tourist_card",
                    startDate: formData.departureDate,
                    endDate: formData.returnDate,
                    destinationRegion: 102, 
                    tripCost: formData.tripPrice, 
                    subscriber: { 
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        birthDate: formData.birthDate,
                        email: formData.email,
                        address: formData.address,
                        postalCode: formData.postalCode,
                        city: formData.city
                    },
                    companions: formData.additionalTravelers,
                    options: formData.selectedOptions 
                }
            })
        });
        const data = await response.json();
        
        if (response.ok && data.price) {
            setQuote({ premium: data.price });
            if (!isBackground) toast.success(`Tarif calculé : ${data.price} €`);
        } else {
            console.error("Info tarif:", data);
        }
    } catch (e) {
        console.error(e);
    } finally {
        if (!isBackground) setIsLoading(false);
    }
  };

  // Recalcul auto si on change les options à l'étape 4
  useEffect(() => {
      if (currentStep === 4 && quote) {
          fetchQuote(true);
      }
  }, [formData.selectedOptions]);

  const handleNext = async () => {
    // --- ÉTAPE 1 : VOYAGE ---
    if (currentStep === 1) {
        if (!formData.destination) { setErrors({ destination: "Requis" }); return; }
        if (!formData.tripPrice) { setErrors({ tripPrice: "Requis" }); return; }
        // ON RETIRE LE CALCUL ICI POUR ATTENDRE LA FIN
    }

    // --- ÉTAPE 2 : INFOS ---
    if (currentStep === 2) {
        if (!formData.firstName || !formData.lastName || !formData.birthDate) {
             toast.error("Veuillez remplir vos informations complètes");
             return;
        }
    }

    // --- ÉTAPE 3 : VOYAGEURS ---
    if (currentStep === 3) {
        const invalid = formData.additionalTravelers.some(t => !t.firstName || !t.birthDate);
        if (invalid) {
            toast.error("Veuillez compléter les infos des voyageurs");
            return;
        }
    }

    // --- ÉTAPE 4 : OPTIONS ---
    if (currentStep === 4) {
        // C'EST ICI QU'ON LANCE LE PREMIER VRAI CALCUL
        // Avec toutes les données (dates, âges, options)
        await fetchQuote(); 
    }

    // --- NAVIGATION ---
    if (currentStep < 5) {
        setCurrentStep(prev => prev + 1);
        window.scrollTo(0, 0);
    } else {
        setIsSubmitted(true);
        window.location.href = "/api/insurance-checkout"; 
    }
  };

  if (isSubmitted) return <ConfirmationStep formData={formData} onReset={() => window.location.reload()} />;

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-elevated border-none relative overflow-hidden">
      
      {quote && currentStep >= 4 && (
          <div className="absolute top-0 right-0 bg-primary text-white px-6 py-2 rounded-bl-xl shadow-md z-20 font-bold animate-in slide-in-from-right">
              {quote.premium} €
              <span className="text-xs font-normal opacity-80 block text-right">Total</span>
          </div>
      )}

      <CardContent className="p-6 md:p-8 pt-12">
        <StepIndicator currentStep={currentStep} totalSteps={5} steps={STEPS} />

        <div className="mt-8 min-h-[300px]">
            {currentStep === 1 && <TripDetailsStep formData={formData} updateFormData={updateFormData} errors={errors} />}
            {currentStep === 2 && <PersonalInfoStep formData={formData} updateFormData={updateFormData} errors={errors} />}
            {currentStep === 3 && <TravelersStep formData={formData} updateFormData={updateFormData} errors={errors} />}
            {currentStep === 4 && <OptionsStep formData={formData} updateFormData={updateFormData} errors={errors} />}
            {currentStep === 5 && <SummaryStep formData={formData} updateFormData={updateFormData} errors={errors} quote={quote} isLoadingQuote={isLoading} />}
        </div>

        <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <Button variant="ghost" onClick={() => setCurrentStep(c => c - 1)} disabled={currentStep === 1}>
                Retour
            </Button>
            
            <Button 
                onClick={handleNext} 
                disabled={isLoading}
                className="bg-gradient-hero text-white px-8 shadow-lg transition-transform hover:scale-[1.02]"
            >
                {isLoading ? "Calcul du tarif..." : (currentStep === 5 ? "Payer" : "Continuer")} 
            </Button>
        </div>
      </CardContent>
    </Card>
  );
};
