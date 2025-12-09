import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InsuranceFormData } from "@/types/insurance";

interface Props {
  formData: InsuranceFormData;
  updateFormData: (data: Partial<InsuranceFormData>) => void;
  errors: Record<string, string>;
}

export const TripDetailsStep = ({ formData, updateFormData, errors }: Props) => (
  <div className="space-y-4 animate-in fade-in">
    <div className="grid gap-2">
      <Label>Destination</Label>
      <Input value={formData.destination} onChange={e => updateFormData({ destination: e.target.value })} placeholder="Ex: Japon" />
      {errors.destination && <p className="text-red-500 text-sm">{errors.destination}</p>}
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div><Label>Départ</Label><Input type="date" value={formData.departureDate} onChange={e => updateFormData({ departureDate: e.target.value })} /></div>
      <div><Label>Retour</Label><Input type="date" value={formData.returnDate} onChange={e => updateFormData({ returnDate: e.target.value })} /></div>
    </div>
    <div><Label>Prix du voyage (€)</Label><Input type="number" value={formData.tripPrice} onChange={e => updateFormData({ tripPrice: Number(e.target.value) })} /></div>
  </div>
);
