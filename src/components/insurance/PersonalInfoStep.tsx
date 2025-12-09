import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InsuranceFormData } from "@/types/insurance";

interface Props {
  formData: InsuranceFormData;
  updateFormData: (data: Partial<InsuranceFormData>) => void;
  errors: Record<string, string>;
}

export const PersonalInfoStep = ({ formData, updateFormData }: Props) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
    <div><Label>Prénom</Label><Input value={formData.firstName} onChange={e => updateFormData({ firstName: e.target.value })} /></div>
    <div><Label>Nom</Label><Input value={formData.lastName} onChange={e => updateFormData({ lastName: e.target.value })} /></div>
    <div><Label>Email</Label><Input value={formData.email} onChange={e => updateFormData({ email: e.target.value })} /></div>
    <div><Label>Date Naissance</Label><Input type="date" value={formData.birthDate} onChange={e => updateFormData({ birthDate: e.target.value })} /></div>
  </div>
);
