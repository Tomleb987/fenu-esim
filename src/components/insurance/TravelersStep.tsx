import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InsuranceFormData } from "@/types/insurance";
import { Trash2, UserPlus } from "lucide-react";

interface Props {
  formData: InsuranceFormData;
  updateFormData: (data: Partial<InsuranceFormData>) => void;
  errors: Record<string, string>;
}

export const TravelersStep = ({ formData, updateFormData }: Props) => {
  const addTraveler = () => {
    updateFormData({ additionalTravelers: [...formData.additionalTravelers, { firstName: "", lastName: "", birthDate: "" }] });
  };
  
  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex justify-between items-center">
        <Label>Voyageurs additionnels</Label>
        <Button variant="outline" size="sm" onClick={addTraveler}><UserPlus className="w-4 h-4 mr-2"/> Ajouter</Button>
      </div>
      {formData.additionalTravelers.map((t, i) => (
        <div key={i} className="flex gap-2 items-end border p-2 rounded">
           <Input placeholder="Prénom" value={t.firstName} onChange={e => {
               const newTravelers = [...formData.additionalTravelers];
               newTravelers[i].firstName = e.target.value;
               updateFormData({ additionalTravelers: newTravelers });
           }} />
           <Button variant="ghost" size="icon" onClick={() => {
               const newTravelers = formData.additionalTravelers.filter((_, idx) => idx !== i);
               updateFormData({ additionalTravelers: newTravelers });
           }}><Trash2 className="w-4 h-4 text-red-500"/></Button>
        </div>
      ))}
      {formData.additionalTravelers.length === 0 && <p className="text-muted-foreground text-sm italic">Aucun voyageur supplémentaire.</p>}
    </div>
  );
};
