import { useEffect, useState } from "react";
import { InsuranceFormData } from "@/types/insurance";
import { COUNTRIES } from "@/lib/countries";

interface TripDetailsStepProps {
  formData: InsuranceFormData;
  updateFormData: (data: Partial<InsuranceFormData>) => void;
  errors: Record<string, string>;
}

export const TripDetailsStep = ({
  formData,
  updateFormData,
  errors,
}: TripDetailsStepProps) => {
  const [today, setToday] = useState("");

  useEffect(() => {
    // Calcul côté client pour éviter les soucis d'hydratation
    setToday(new Date().toISOString().split("T")[0]);
  }, []);

  // Sécurité si COUNTRIES est mal importé
  const countryList = Array.isArray(COUNTRIES) ? COUNTRIES : [];

  const labelClass = "block text-sm font-semibold mb-2 text-gray-700";
  const inputClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm " +
    "ring-offset-background placeholder:text-muted-foreground " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
    "disabled:cursor-not-allowed disabled:opacity-50";
  const selectClass =
    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm " +
    "ring-offset-background placeholder:text-muted-foreground " +
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 " +
    "disabled:cursor-not-allowed disabled:opacity-50 appearance-none";

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Détails de votre voyage
        </h2>
        <p className="text-muted-foreground">
          Commençons par les informations sur votre séjour
        </p>
      </div>

      <div className="space-y-4">
        {/* PAYS RÉSIDENCE */}
        <div className="space-y-2">
          <label className={labelClass}>Votre pays de résidence *</label>
          <div className="relative">
            <select
              className={selectClass}
              value={formData.subscriberCountry}
              onChange={(e) =>
                updateFormData({ subscriberCountry: e.target.value })
              }
            >
              <option value="" disabled>
                Sélectionnez...
              </option>
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
          <label className={labelClass}>Destination *</label>
          <div className="relative">
            <select
              className={`${selectClass} ${
                errors.destination ? "border-red-500 ring-red-200" : ""
              }`}
              value={formData.destination}
              onChange={(e) =>
                updateFormData({ destination: e.target.value })
              }
            >
              <option value="" disabled>
                Sélectionnez...
              </option>
              {countryList.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
          {errors.destination && (
            <p className="text-red-500 text-xs mt-1">
              {errors.destination}
            </p>
          )}
        </div>

        {/* DATES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={labelClass}>Date de départ</label>
            <input
              type="date"
              className={inputClass}
              value={formData.departureDate}
              onChange={(e) =>
                updateFormData({ departureDate: e.target.value })
              }
              min={today}
            />
          </div>

          <div className="space-y-2">
            <label className={labelClass}>Date de retour</label>
            <input
              type="date"
              className={inputClass}
              value={formData.returnDate}
              onChange={(e) =>
                updateFormData({ returnDate: e.target.value })
              }
              min={formData.departureDate || today}
            />
          </div>
        </div>

        {/* PRIX */}
        <div className="space-y-2">
          <label className={labelClass}>Prix total du voyage (€)</label>
          <input
            type="number"
            placeholder="Ex: 2500"
            className={`${inputClass} ${
              errors.tripPrice ? "border-red-500" : ""
            }`}
            value={formData.tripPrice || ""}
            onChange={(e) =>
              updateFormData({
                tripPrice: parseFloat(e.target.value) || 0,
              })
            }
          />
          {errors.tripPrice && (
            <p className="text-red-500 text-xs mt-1">
              {errors.tripPrice}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
