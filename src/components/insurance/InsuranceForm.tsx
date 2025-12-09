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
import { ArrowLeft, ArrowRight, Shield, Loader2 } from "lucide-react";
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

export const InsuranceForm = () => {
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
        const response = await fetch('/api/get-quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quoteData: {
                    productType: "ava_tourist_card",
                    startDate: formData.departureDate,
                    endDate: formData.returnDate,
                    destinationRegion: 102, 
                    tripCost: formData.tripPrice * (1 + (formData.additionalTravelers?.length || 0)),
                    subscriber: { birthDate: formData.birthDate },
                    companions: formData.additionalTravelers,
                    options: {} 
                }
            })
        });
        const data = await response.json();
        if (response.ok && data.price) {
            setQuote({ premium: data.price });
        } else {
            console.error(data);
        }
    } catch (e) {
        console.error(e);
        toast.error("Impossible de calculer le tarif.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleNext = async () => {
    // Validation simple pour l'exemple
    if (currentStep === 1 && !formData.destination) {
        setErrors({ destination: "Requis" });
        return;
    }
    
    if (currentStep === 4) {
        await fetchQuote();
    }
    
    if (currentStep < 5) {
        setCurrentStep(prev => prev + 1);
        window.scrollTo(0, 0);
    } else {
        setIsSubmitted(true);
        // Ici rediriger vers /api/insurance-checkout
        window.location.href = "/api/insurance-checkout"; 
    }
  };

  if (isSubmitted) return <ConfirmationStep formData={formData} onReset={() => window.location.reload()} />;

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-elevated border-none">
      <CardContent className="p-6 md:p-8">
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
                <ArrowLeft className="w-4 h-4 mr-2"/> Retour
            </Button>
            
            {/* MODIFICATION ICI : 
               J'ai remplacé variant="gradient" par une className explicite 
               qui utilise votre nouveau dégradé Lovable (bg-gradient-hero).
            */}
            <Button 
                onClick={handleNext} 
                disabled={isLoading}
                className="bg-gradient-hero text-white hover:opacity-90 shadow-lg transition-all px-8"
            >
                {isLoading ? <Loader2 className="animate-spin"/> : (currentStep === 5 ? "Payer" : "Continuer")} 
                {!isLoading && <ArrowRight className="w-4 h-4 ml-2"/>}
            </Button>
        </div>
      </CardContent>
    </Card>
  );
};
