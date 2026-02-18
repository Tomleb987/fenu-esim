import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InsuranceFormData } from "@/types/insurance";

interface Props {
  formData: InsuranceFormData;
  updateFormData: (data: Partial<InsuranceFormData>) => void;
  errors: Record<string, string>;
}

export const PersonalInfoStep = ({ formData, updateFormData, errors }: Props) => (
  <div className="space-y-6 animate-in fade-in">

    {/* Identité */}
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Identité</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Prénom <span className="text-red-500">*</span></Label>
          <Input
            value={formData.firstName}
            onChange={e => updateFormData({ firstName: e.target.value })}
            placeholder="Jean"
            className={errors.firstName ? "border-red-400" : ""}
          />
          {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
        </div>
        <div>
          <Label>Nom <span className="text-red-500">*</span></Label>
          <Input
            value={formData.lastName}
            onChange={e => updateFormData({ lastName: e.target.value })}
            placeholder="Dupont"
            className={errors.lastName ? "border-red-400" : ""}
          />
          {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
        </div>
        <div>
          <Label>Date de naissance <span className="text-red-500">*</span></Label>
          <Input
            type="date"
            value={formData.birthDate}
            onChange={e => updateFormData({ birthDate: e.target.value })}
            className={errors.birthDate ? "border-red-400" : ""}
          />
          {errors.birthDate && <p className="text-red-500 text-xs mt-1">{errors.birthDate}</p>}
        </div>
        <div>
          <Label>Téléphone</Label>
          <Input
            value={formData.phone}
            onChange={e => updateFormData({ phone: e.target.value })}
            placeholder="+689 87 00 00 00"
            type="tel"
          />
        </div>
      </div>
    </div>

    {/* Contact */}
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Contact</h3>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label>Email <span className="text-red-500">*</span></Label>
          <Input
            value={formData.email}
            onChange={e => updateFormData({ email: e.target.value })}
            placeholder="jean.dupont@email.com"
            type="email"
            className={errors.email ? "border-red-400" : ""}
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>
      </div>
    </div>

    {/* Adresse */}
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Adresse postale</h3>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label>Rue <span className="text-red-500">*</span></Label>
          <Input
            value={formData.address}
            onChange={e => updateFormData({ address: e.target.value })}
            placeholder="12 rue des Cocotiers"
            className={errors.address ? "border-red-400" : ""}
          />
          {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Code postal <span className="text-red-500">*</span></Label>
            <Input
              value={formData.postalCode}
              onChange={e => updateFormData({ postalCode: e.target.value })}
              placeholder="98714"
              className={errors.postalCode ? "border-red-400" : ""}
            />
            {errors.postalCode && <p className="text-red-500 text-xs mt-1">{errors.postalCode}</p>}
          </div>
          <div>
            <Label>Ville <span className="text-red-500">*</span></Label>
            <Input
              value={formData.city}
              onChange={e => updateFormData({ city: e.target.value })}
              placeholder="Papeete"
              className={errors.city ? "border-red-400" : ""}
            />
            {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
          </div>
        </div>
      </div>
    </div>

  </div>
);
