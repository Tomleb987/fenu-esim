import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
// On retire l'import de Label qui pose problème
// import { Label } from "@/components/ui/label"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InsuranceFormData } from "@/types/insurance";
import { COUNTRIES } from "@/lib/countries"; 
import { MapPin, Calendar, Euro, Globe } from "lucide-react";

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

  // Sécurité anti-crash si la liste des pays est vide
  const countryList = COUNTRIES && Array.isArray(COUNTRIES) ? COUNTRIES : [];

  // Style partagé pour les labels
  const labelStyle = "flex items-center gap-2 text-sm font-semibold mb-2 block";

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Détails de votre voyage</h2>
        <p className="text-muted-foreground">Commençons par les informations sur votre séjour</p>
      </div>

      <div className="space-y-4">
        {/* PAYS RÉSIDENCE */}
        <div className="space-y-2">
          {/* On utilise une balise label standard HTML au lieu du composant custom */}
          <label className={labelStyle}>
            <Globe className="w-4 h-4 text-primary" />
            <span>Votre pays de résidence *</span>
          </label>
          <Select
            value={formData.subscriberCountry}
            onValueChange={(value) => updateFormData({ subscriberCountry: value })}
          >
            <SelectTrigger className={errors.subscriberCountry ? "border-destructive" : ""}>
              <SelectValue placeholder="Sélectionnez..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {countryList.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* DESTINATION */}
        <div className="space-y-2">
          <label className={labelStyle}>
             <MapPin className="w-4 h-4 text-primary" />
             <span>Destination *</span>
          </label>
          <Select
            value={formData.destination}
            onValueChange={(value) => updateFormData({ destination: value })}
          >
            <SelectTrigger className={errors.destination ? "border-destructive" : ""}>
              <SelectValue placeholder="Sélectionnez..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {countryList.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* DATES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={labelStyle}>
              <Calendar className="w-4 h-4 text-primary" />
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
              <Calendar className="w-4 h-4 text-primary" />
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
            <Euro className="w-4 h-4 text-primary" />
            <span>Prix total du voyage (€)</span>
          </label>
          <Input
            type="number"
            placeholder="Ex: 2500"
            value={formData.tripPrice || ""}
            onChange={(e) => updateFormData({ tripPrice: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>
    </div>
  );
};
