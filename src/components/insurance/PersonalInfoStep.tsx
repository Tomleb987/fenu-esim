import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InsuranceFormData } from "@/types/insurance";

interface Props {
  formData: InsuranceFormData;
  updateFormData: (data: Partial<InsuranceFormData>) => void;
  errors: Record<string, string>;
  productType?: string;
}

// Calcule l'âge à partir d'une date ISO (YYYY-MM-DD)
function getAge(birthDateStr: string): number | null {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export const PersonalInfoStep = ({ formData, updateFormData, errors, productType = "ava_tourist_card" }: Props) => {

  const AGE_MAX = productType === "ava_carte_sante" ? 65 : null;
  const AGE_MIN = 18;

  const age = getAge(formData.birthDate);

  let ageWarning: string | null = null;
  if (age !== null) {
    if (age < AGE_MIN) {
      ageWarning = `⚠️ Vous devez avoir au moins ${AGE_MIN} ans pour souscrire seul. Un mineur ne peut pas souscrire une assurance sans tuteur légal.`;
    } else if (AGE_MAX && age > AGE_MAX) {
      ageWarning = `⚠️ La AVA Carte Santé est réservée aux personnes de moins de ${AGE_MAX} ans. Pour les personnes de plus de 65 ans, nous vous recommandons la Tourist Card (sans limite d'âge).`;
    }
  }

  return (
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
            <Label>
              Date de naissance <span className="text-red-500">*</span>
              {AGE_MAX && (
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  (18 – {AGE_MAX} ans)
                </span>
              )}
              {!AGE_MAX && (
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  (18 ans minimum)
                </span>
              )}
            </Label>
            <Input
              type="date"
              value={formData.birthDate}
              onChange={e => updateFormData({ birthDate: e.target.value })}
              className={errors.birthDate || ageWarning ? "border-red-400" : ""}
            />
            {errors.birthDate && <p className="text-red-500 text-xs mt-1">{errors.birthDate}</p>}
            {/* Alerte âge en temps réel */}
            {ageWarning && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                {ageWarning}
              </div>
            )}
            {/* Confirmation âge valide */}
            {age !== null && !ageWarning && (
              <p className="text-green-600 text-xs mt-1">✓ {age} ans — éligible</p>
            )}
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
};
