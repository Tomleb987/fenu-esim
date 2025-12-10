import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { InsuranceFormData } from "@/types/insurance";
import { COUNTRIES } from "@/lib/countries"; 
// ON RETIRE LES IMPORTS D'ICÔNES POUR L'INSTANT
// import { MapPin, Calendar, Euro, Globe, ChevronDown } from "lucide-react";

interface TripDetailsStepProps {
  formData: InsuranceFormData;
  updateFormData: (data: Partial<InsuranceFormData>) => void;
  errors: Record<string, string>;
}

export const TripDetailsStep = ({ formData, updateFormData, errors }: TripDetailsStepProps) => {
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(new Date().toISOString().split('T')[0]);
  }, []);

  // Sécurité : Liste vide par défaut pour éviter le crash .map
  const countryList = COUNTRIES || [];

  // Style commun
  const labelStyle = "block text-sm font-semibold mb-2 text-gray-700";
  const selectStyle = "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none";

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Détails de votre voyage</h2>
        <p className="text-muted-foreground">Commençons par les informations sur votre séjour</p>
      </div>

      <div className="space-y-4">
        
        {/* PAYS RÉSIDENCE */}
        <div className="space-y-2">
          <label className={labelStyle}>
            {/* Icône retirée pour éviter le crash */}
            <span>Votre pays de résidence *</span>
          </label>
          <div className="relative">
            <select
              className={selectStyle}
              value={formData.subscriberCountry}
              onChange={(e) => updateFormData({ subscriberCountry: e.target.value })}
            >
              <option value="" disabled>Sélectionnez...</option>
              {countryList.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* DESTINATION */}
        <div className="space-y-2">
          <label className={labelStyle}>
             <span>Destination *</span>
          </label>
          <div className="relative">
            <select
              className={`${selectStyle} ${errors.destination ? "border-red-500" : ""}`}
              value={formData.destination}
              onChange={(e) => updateFormData({ destination: e.target.value })}
            >
              <option value="" disabled>Sélectionnez...</option>
              {countryList.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
          {errors.destination && <p className="text-red-500 text-xs mt-1">{errors.destination}</p>}
        </div>

        {/* DATES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={labelStyle}>
              <span>Date de départ</span>
            </label>
            <Input
              type="date"
              value={formData.departureDate}
              onChange={(e) => updateFormData({ departureDate: e.target.value })}
              min={today}
            />
          </div>

          <div className="space-y-2">
            <label className={labelStyle}>
              <span>Date de retour</span>
            </label>
            <Input
              type="date"
              value={formData.returnDate}
              onChange={(e) => updateFormData({ returnDate: e.target.value })}
              min={formData.departureDate || today}
            />
          </div>
        </div>

        {/* PRIX */}
        <div className="space-y-2">
          <label className={labelStyle}>
            <span>Prix total du voyage (€)</span>
          </label>
          <Input
            type="number"
            placeholder="Ex: 2500"
            value={formData.tripPrice || ""}
            onChange={(e) => updateFormData({ tripPrice: parseFloat(e.target.value) || 0 })}
            className={errors.tripPrice ? "border-red-500" : ""}
          />
        </div>
      </div>
    </div>
  );
};
