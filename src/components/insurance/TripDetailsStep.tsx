import { useEffect, useState } from "react";
import { InsuranceFormData } from "@/types/insurance";
import { COUNTRIES } from "@/lib/countries"; // On garde ça UNIQUEMENT pour le pays de résidence

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

  // Sécurité pour la liste de résidence
  const countryList = Array.isArray(COUNTRIES) ? COUNTRIES : [];

  // Styles CSS (Tailwind)
  const labelClass = "block text-sm font-semibold mb-2 text-gray-700";
  const selectClass = "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none";
  const inputClass = "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Détails de votre voyage</h2>
        <p className="text-gray-500">Commençons par les informations sur votre séjour</p>
      </div>

      <div className="space-y-4">
        
        {/* PAYS RÉSIDENCE (Reste la liste complète des pays) */}
        <div>
          <label className={labelClass}>Votre pays de résidence *</label>
          <div className="relative">
            <select
              className={selectClass}
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

        {/* DESTINATION (MODIFIÉ : LES 3 ZONES AVA UNIQUEMENT) */}
        <div>
          <label className={labelClass}>Zone de destination *</label>
          <div className="relative">
            <select
              className={`${selectClass} ${errors.destination ? "border-red-500 ring-red-200" : ""}`}
              value={formData.destination}
              onChange={(e) => updateFormData({ destination: e.target.value })}
            >
              <option value="" disabled>Sélectionnez votre zone...</option>
              
              {/* --- C'EST ICI QUE CA CHANGE --- */}
              <option value="102">Monde Entier (Hors USA/Canada) 🌍</option>
              <option value="58">USA & Canada 🇺🇸 🇨🇦</option>
              <option value="53">Europe (Union Européenne / Schengen) 🇪🇺</option>
              {/* ------------------------------- */}

            </select>
          </div>
          {errors.destination && <p className="text-red-500 text-xs mt-1">{errors.destination}</p>}
        </div>

        {/* DATES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Date de départ</label>
            <input
              type="date"
              className={inputClass}
              value={formData.departureDate}
              onChange={(e) => updateFormData({ departureDate: e.target.value })}
              min={today}
            />
          </div>

          <div>
            <label className={labelClass}>Date de retour</label>
            <input
              type="date"
              className={inputClass}
              value={formData.returnDate}
              onChange={(e) => updateFormData({ returnDate: e.target.value })}
              min={formData.departureDate || today}
            />
          </div>
        </div>

        {/* PRIX */}
        <div>
          <label className={labelClass}>Prix total du voyage (€)</label>
          <input
            type="number"
            placeholder="Ex: 2500"
            className={`${inputClass} ${errors.tripPrice ? "border-red-500" : ""}`}
            value={formData.tripPrice || ""}
            onChange={(e) => updateFormData({ tripPrice: parseFloat(e.target.value) || 0 })}
          />
        </div>

      </div>
    </div>
  );
};
