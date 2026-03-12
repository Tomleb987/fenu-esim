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

const FRAIS_DISTRIBUTION = 10;
const EUR_TO_XPF = 119.33;

const PRODUCTS = [
  {
    id: "ava_tourist_card",
    label: "Tourist Card",
    description: "Assurance voyage tout risques",
    icon: "✈️",
  },
  {
    id: "ava_carte_sante",
    label: "Carte Santé",
    description: "Assurance santé à l'étranger",
    icon: "🏥",
  },
];

const PRODUCT_DETAILS: Record<string, {
  title: string;
  subtitle: string;
  price: string;
  ageLimit: string;
  duration: string;
  sections: { label: string; items: { text: string; ok: boolean }[] }[];
  ideal: string;
}> = {
  ava_tourist_card: {
    title: "AVA Tourist Card",
    subtitle: "Multirisque complète — court séjour",
    price: "À partir de 80 € (6,5% du prix du voyage)",
    ageLimit: "Aucune limite d'âge",
    duration: "Jusqu'à 60 jours",
    sections: [
      {
        label: "Couvertures incluses",
        items: [
          { text: "Annulation « Tout Sauf » — max 6.000 €/assuré", ok: true },
          { text: "Frais médicaux à l'étranger — max 500.000 €", ok: true },
          { text: "Bagages perte/vol — max 1.500 €/assuré", ok: true },
          { text: "Rapatriement médical — frais réels", ok: true },
          { text: "Responsabilité civile — max 4.500.000 €", ok: true },
          { text: "Capital décès accidentel — 8.000 € (80.000 € avion)", ok: true },
          { text: "Retard avion +6h, retard bagages +24h — 150 €", ok: true },
          { text: "Interruption de séjour — max 6.000 €/assuré", ok: true },
        ],
      },
      {
        label: "Options disponibles",
        items: [
          { text: "Individuelle Accident — capital jusqu'à 150.000 €", ok: true },
          { text: "AVA SPORT+ — sports extrêmes & recherche 25.000 €", ok: true },
          { text: "CDW véhicule de location — 4 €/jour", ok: true },
          { text: "AVA TECH+ — appareils nomades jusqu'à 3.000 €", ok: true },
        ],
      },
    ],
    ideal: "Idéal pour un voyage tout compris : annulation, santé, bagages et responsabilité civile en une seule formule.",
  },
  ava_carte_sante: {
    title: "AVA Carte Santé",
    subtitle: "Essentielle santé — court séjour",
    price: "À partir de 5 €/jour (forfait dès 15 jours)",
    ageLimit: "Jusqu'à 65 ans",
    duration: "Jusqu'à 60 jours",
    sections: [
      {
        label: "Couvertures incluses",
        items: [
          { text: "Frais médicaux à l'étranger — max 500.000 €, sans franchise", ok: true },
          { text: "Soins dentaires d'urgence — max 250 €", ok: true },
          { text: "Rapatriement médical — frais réels", ok: true },
          { text: "Responsabilité civile — max 4.500.000 €", ok: true },
          { text: "Assistance juridique — max 3.000 €", ok: true },
          { text: "Attestation visa délivrée en 24h", ok: true },
          { text: "Annulation de voyage", ok: false },
          { text: "Couverture bagages", ok: false },
        ],
      },
      {
        label: "Options disponibles",
        items: [
          { text: "Individuelle Accident — capital jusqu'à 150.000 €", ok: true },
          { text: "AVA SNO+ — sports d'hiver, ski hors piste", ok: true },
          { text: "AVA SPORT+ — sports extrêmes 20 €/mois", ok: true },
          { text: "Bagages — perte/vol jusqu'à 2.500 €", ok: true },
        ],
      },
    ],
    ideal: "Idéal si vous avez déjà une assurance annulation. Couverture santé maximale à prix réduit.",
  },
};

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
  const [selectedProduct, setSelectedProduct] = useState("ava_tourist_card");
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<InsuranceFormData>(initialFormData);
  const [quote, setQuote] = useState<{ premium: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);

  // Reset formulaire quand on change de produit
  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId);
    setCurrentStep(1);
    setFormData(initialFormData);
    setQuote(null);
    setErrors({});
  };

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
            productType: selectedProduct,
            startDate: formData.departureDate,
            endDate: formData.returnDate,
            destinationRegion: formData.destination || 102,
            tripCost: formData.tripPrice,
            subscriberCountry: "PF",
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
        if (!isBackground) toast.success(`Tarif mis à jour : ${data.price} €`);
      } else {
        console.error("Info tarif:", data);
        if (!isBackground) toast.error("Impossible de calculer le tarif pour ces dates.");
      }
    } catch (e) {
      console.error(e);
      if (!isBackground) toast.error("Erreur de connexion au serveur.");
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentStep >= 4) {
      const timer = setTimeout(() => { fetchQuote(true); }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.selectedOptions, currentStep]);

  const handleNext = async () => {
    if (currentStep === 1) {
      if (formData.subscriberCountry !== "PF") {
        toast.error("Cette assurance est réservée aux résidents de Polynésie française 🇵🇫");
        return;
      }
      if (!formData.destination) { setErrors({ destination: "Requis" }); return; }
      if (!formData.tripPrice) { setErrors({ tripPrice: "Requis" }); return; }
    }

    if (currentStep === 2) {
      const missingFields: Record<string, string> = {};
      if (!formData.firstName)   missingFields.firstName  = "Prénom requis";
      if (!formData.lastName)    missingFields.lastName   = "Nom requis";
      if (!formData.birthDate)   missingFields.birthDate  = "Date de naissance requise";
      if (!formData.email)       missingFields.email      = "Email requis";
      if (!formData.address)     missingFields.address    = "Adresse requise";
      if (!formData.postalCode)  missingFields.postalCode = "Code postal requis";
      if (!formData.city)        missingFields.city       = "Ville requise";
      if (Object.keys(missingFields).length > 0) {
        setErrors(missingFields);
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
      }
    }

    if (currentStep === 3) {
      const invalid = formData.additionalTravelers.some(t => !t.firstName || !t.birthDate);
      if (invalid) {
        toast.error("Veuillez compléter les informations de tous les voyageurs");
        return;
      }
    }

    if (currentStep === 4) {
      await fetchQuote();
    }

    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    } else {
      setIsLoading(true);
      try {
        const res = await fetch('/api/insurance-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoteData: {
              productType: selectedProduct,
              startDate: formData.departureDate,
              endDate: formData.returnDate,
              tripCost: formData.tripPrice,
              destinationRegion: formData.destination,
              subscriberCountry: formData.subscriberCountry,
              subscriber: {
                firstName: formData.firstName,
                lastName: formData.lastName,
                birthDate: formData.birthDate,
                email: formData.email,
                address: formData.address,
                postalCode: formData.postalCode,
                city: formData.city,
              },
              companions: formData.additionalTravelers,
              options: formData.selectedOptions,
            },
            userEmail: formData.email,
            amount: quote?.premium,
          }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          toast.error(data.error || "Erreur lors de la création du paiement");
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Erreur checkout:', err);
        toast.error("Erreur réseau, veuillez réessayer");
        setIsLoading(false);
      }
    }
  };

  if (isSubmitted) return <ConfirmationStep formData={formData} onReset={() => window.location.reload()} />;

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-elevated border-none relative overflow-hidden">

      {/* Badge prix total */}
      {quote && currentStep >= 4 && (
        <div className="absolute top-0 right-0 bg-primary text-white px-6 py-2 rounded-bl-xl shadow-md z-20 font-bold animate-in slide-in-from-right">
          {(quote.premium + FRAIS_DISTRIBUTION).toFixed(2)} €
          <span className="text-xs font-normal opacity-60 block text-right">
            ≈ {Math.round((quote.premium + FRAIS_DISTRIBUTION) * EUR_TO_XPF).toLocaleString('fr-FR')} XPF
          </span>
          <span className="text-xs font-normal opacity-80 block text-right">Total TTC</span>
        </div>
      )}

      <CardContent className="p-6 md:p-8 pt-12">

        {/* ONGLETS PRODUIT — visibles uniquement à l'étape 1 */}
        {currentStep === 1 && (
          <div className="mb-8">
            <div className="flex gap-3">
              {PRODUCTS.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductChange(product.id)}
                  className={`flex-1 flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all ${
                    selectedProduct === product.id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl">{product.icon}</span>
                  <span className="font-bold text-sm">{product.label}</span>
                  <span className="text-xs opacity-70">{product.description}</span>
                </button>
              ))}
            </div>
            {/* Lien aide */}
            <div className="text-center mt-2">
              <button
                onClick={() => setTooltip("compare")}
                className="text-xs text-primary underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                🤔 Quelle différence entre les deux ?
              </button>
            </div>
          </div>
        )}

        {/* MODAL COMPARATIF */}
        {tooltip === "compare" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setTooltip(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setTooltip(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold z-10"
              >✕</button>
              <h3 className="text-lg font-bold text-gray-900 mb-1 text-center">Quelle assurance choisir ?</h3>
              <p className="text-xs text-gray-400 text-center mb-5">Comparez les garanties pour faire le bon choix</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[75vh] overflow-y-auto pr-1">
                {PRODUCTS.map((product) => {
                  const details = PRODUCT_DETAILS[product.id];
                  const isSelected = selectedProduct === product.id;
                  return (
                    <div
                      key={product.id}
                      className={`rounded-xl border-2 p-4 flex flex-col transition-all ${
                        isSelected ? "border-primary bg-primary/5" : "border-gray-200"
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{product.icon}</span>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">{details.title}</div>
                            <div className="text-xs text-gray-400">{details.subtitle}</div>
                          </div>
                        </div>
                        {isSelected && <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full whitespace-nowrap">✓ Sélectionné</span>}
                      </div>

                      {/* Badges critères */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">⏱ {details.duration}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">👤 {details.ageLimit}</span>
                        <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">💶 {details.price}</span>
                      </div>

                      {/* Garanties détaillées */}
                      {details.sections.map((section, si) => (
                        <div key={si} className="mb-3">
                          <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 border-b pb-1">{section.label}</div>
                          <ul className="space-y-1">
                            {section.items.map((item, ii) => (
                              <li key={ii} className={`text-xs flex gap-1.5 items-start leading-snug ${item.ok ? "text-gray-700" : "text-gray-400"}`}>
                                <span className="mt-0.5 flex-shrink-0">{item.ok ? "✅" : "❌"}</span>
                                <span className={item.ok ? "" : "line-through"}>{item.text}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}

                      {/* Idéal pour */}
                      <div className="mt-auto pt-2 border-t border-gray-100 mb-3">
                        <p className="text-xs text-primary font-medium leading-snug">{details.ideal}</p>
                      </div>

                      {/* Bouton sélection */}
                      <button
                        onClick={() => { handleProductChange(product.id); setTooltip(null); }}
                        className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-primary/10 text-primary border border-primary cursor-default"
                            : "bg-primary text-white hover:bg-primary/90 cursor-pointer"
                        }`}
                      >
                        {isSelected ? "✓ Sélectionné" : `Choisir ${details.title}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Label produit sélectionné sur les autres étapes */}
        {currentStep > 1 && (
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
            <span>{PRODUCTS.find(p => p.id === selectedProduct)?.icon}</span>
            <span className="font-medium text-primary">
              AVA {PRODUCTS.find(p => p.id === selectedProduct)?.label}
            </span>
          </div>
        )}

        <StepIndicator currentStep={currentStep} totalSteps={5} steps={STEPS} />

        <div className="mt-8 min-h-[300px]">
          {currentStep === 1 && <TripDetailsStep formData={formData} updateFormData={updateFormData} errors={errors} />}
          {currentStep === 2 && <PersonalInfoStep formData={formData} updateFormData={updateFormData} errors={errors} />}
          {currentStep === 3 && <TravelersStep formData={formData} updateFormData={updateFormData} errors={errors} />}
          {currentStep === 4 && (
            <OptionsStep
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
              productType={selectedProduct}
            />
          )}
          {currentStep === 5 && (
            <SummaryStep
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
              quote={quote}
              isLoadingQuote={isLoading}
              productType={selectedProduct}
            />
          )}
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
