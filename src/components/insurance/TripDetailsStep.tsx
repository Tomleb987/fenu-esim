import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Vérifiez que ce fichier existe !
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InsuranceFormData } from "@/types/insurance";
import { COUNTRIES } from "@/lib/countries"; 
// On importe les icônes de manière sécurisée
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

  // SÉCURITÉ : Si la liste des pays n'est pas chargée, on affiche un chargement
  if (!COUNTRIES || COUNTRIES.length === 0) {
    return <div className="p-4 text-red-500">Erreur : Liste des pays introuvable (Vérifiez src/lib/countries.ts)</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Détails de votre voyage</h2>
        <p className="text-muted-foreground">Commençons par les informations sur votre séjour</p>
      </div>

      <div className="space-y-4">
        {/* PAYS RÉSIDENCE */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-semibold">
            <Globe className="w-4 h-4 text-primary" />
            <span>Votre pays de résidence *</span>
          </Label>
          <Select
            value={formData.subscriberCountry}
            onValueChange={(value) => updateFormData({ subscriberCountry: value })}
          >
            <SelectTrigger className={errors.subscriberCountry ? "border-destructive" : ""}>
              <SelectValue placeholder="Sélectionnez..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* DESTINATION */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-semibold">
             <MapPin className="w-4 h-4 text-primary" />
             <span>Destination *</span>
          </Label>
          <Select
            value={formData.destination}
            onValueChange={(value) => updateFormData({ destination: value })}
          >
            <SelectTrigger className={errors.destination ? "border-destructive" : ""}>
              <SelectValue placeholder="Sélectionnez..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {COUNTRIES.map((country) => (
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
            <Label className="flex items-center gap-2 text-sm font-semibold">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Date de départ</span>
            </Label>
            <Input
              type="date"
              value={formData.departureDate}
              onChange={(e) => updateFormData({ departureDate: e.target.value })}
              min={today}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-semibold">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Date de retour</span>
            </Label>
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
          <Label className="flex items-center gap-2 text-sm font-semibold">
            <Euro className="w-4 h-4 text-primary" />
            <span>Prix total du voyage (€)</span>
          </Label>
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
