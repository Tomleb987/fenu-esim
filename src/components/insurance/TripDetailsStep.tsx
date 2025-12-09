import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InsuranceFormData } from "@/types/insurance";
import { COUNTRIES } from "@/lib/countries"; // ✅ C'est cet import qui charge la liste
import { MapPin, Calendar, Euro, Globe } from "lucide-react";

interface TripDetailsStepProps {
  formData: InsuranceFormData;
  updateFormData: (data: Partial<InsuranceFormData>) => void;
  errors: Record<string, string>;
}

export const TripDetailsStep = ({ formData, updateFormData, errors }: TripDetailsStepProps) => {
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Détails de votre voyage</h2>
        <p className="text-muted-foreground">Où souhaitez-vous aller ?</p>
      </div>

      <div className="space-y-4">
        {/* PAYS DE RÉSIDENCE */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" /> Pays de résidence
          </Label>
          <Select
            value={formData.subscriberCountry}
            onValueChange={(value) => updateFormData({ subscriberCountry: value })}
          >
            <SelectTrigger className={errors.subscriberCountry ? "border-destructive" : ""}>
              <SelectValue placeholder="Sélectionnez..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {/* On filtre pour mettre la Polynésie et la France en premier si besoin, sinon on affiche tout */}
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
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Destination
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
          {errors.destination && <p className="text-destructive text-xs">{errors.destination}</p>}
        </div>

        {/* DATES ET PRIX */}
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Départ</Label>
                <Input type="date" value={formData.departureDate} onChange={(e) => updateFormData({ departureDate: e.target.value })} />
            </div>
            <div className="space-y-2">
                <Label>Retour</Label>
                <Input type="date" value={formData.returnDate} onChange={(e) => updateFormData({ returnDate: e.target.value })} />
            </div>
        </div>
        
        <div className="space-y-2">
            <Label>Prix du voyage (€)</Label>
            <Input 
                type="number" 
                placeholder="Ex: 1000" 
                value={formData.tripPrice || ''} 
                onChange={(e) => updateFormData({ tripPrice: Number(e.target.value) })} 
            />
        </div>
      </div>
    </div>
  );
};
