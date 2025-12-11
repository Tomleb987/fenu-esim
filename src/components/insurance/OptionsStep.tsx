import { InsuranceFormData } from "@/types/insurance";
import { getOptionsForProduct, AvaOption } from "@/lib/ava_options";

interface OptionsStepProps {
  formData: InsuranceFormData;
  updateFormData: (data: Partial<InsuranceFormData>) => void;
  errors: Record<string, string>;
}

export const OptionsStep = ({ formData, updateFormData }: OptionsStepProps) => {
  // On récupère la configuration dynamique
  const options = getOptionsForProduct("ava_tourist_card");
  const selectedIds = formData.selectedOptions || [];

  // --- GESTION DES CASES À COCHER (Boolean) ---
  const handleBooleanToggle = (opt: AvaOption, checked: boolean) => {
    // L'ID à envoyer est celui défini comme défaut (ex: "338" pour l'option "335")
    const targetId = opt.defaultSubOptionId || opt.id;
    
    let newSelected = [...selectedIds];
    if (checked) {
      newSelected.push(targetId);
    } else {
      newSelected = newSelected.filter(id => id !== targetId);
    }
    updateFormData({ selectedOptions: newSelected });
  };

  // --- GESTION DES MENUS DÉROULANTS (Select) ---
  const handleSelectChange = (opt: AvaOption, value: string) => {
    // 1. On retire toutes les sous-options de ce groupe qui seraient déjà sélectionnées
    const subOptionIds = opt.subOptions?.map(so => so.id) || [];
    let newSelected = selectedIds.filter(id => !subOptionIds.includes(id));
    
    // 2. Si une valeur est choisie (pas vide), on l'ajoute
    if (value) {
      newSelected.push(value);
    }
    
    updateFormData({ selectedOptions: newSelected });
  };

  // --- HELPERS D'AFFICHAGE ---
  const isBooleanChecked = (opt: AvaOption) => {
    const targetId = opt.defaultSubOptionId || opt.id;
    return selectedIds.includes(targetId);
  };

  const getSelectValue = (opt: AvaOption) => {
    // On cherche si l'une des sous-options est actuellement sélectionnée
    const found = opt.subOptions?.find(so => selectedIds.includes(so.id));
    return found ? found.id : "";
  };

  // Styles CSS (Tailwind)
  const cardClass = "p-4 border rounded-lg transition-all bg-white hover:border-primary/40";
  const labelClass = "text-sm font-bold text-gray-900 block mb-1";
  const descClass = "text-xs text-gray-500 mb-3 block";
  const selectClass = "w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Options de votre contrat</h2>
        <p className="text-muted-foreground text-sm">
          Personnalisez votre couverture selon vos besoins spécifiques.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {options.map((opt) => (
          <div key={opt.id} className={`${cardClass} ${isBooleanChecked(opt) || getSelectValue(opt) ? 'border-primary bg-primary/5' : ''}`}>
            
            {/* CAS 1 : CASE À COCHER SIMPLE */}
            {opt.type === 'boolean' && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  checked={isBooleanChecked(opt)}
                  onChange={(e) => handleBooleanToggle(opt, e.target.checked)}
                />
                <div className="flex-1">
                  <span className={labelClass}>{opt.label}</span>
                  {opt.description && <span className={descClass}>{opt.description}</span>}
                </div>
              </label>
            )}

            {/* CAS 2 : LISTE DÉROULANTE */}
            {opt.type === 'select' && (
              <div className="flex flex-col">
                <label className="mb-2">
                    <span className={labelClass}>{opt.label}</span>
                    {opt.description && <span className={descClass}>{opt.description}</span>}
                </label>
                
                <select
                    className={selectClass}
                    value={getSelectValue(opt)}
                    onChange={(e) => handleSelectChange(opt, e.target.value)}
                >
                    <option value="">-- Non souscrit / Standard --</option>
                    {opt.subOptions?.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                            {sub.label}
                        </option>
                    ))}
                </select>
              </div>
            )}

          </div>
        ))}
      </div>
      
      {/* Résumé discret */}
      <div className="text-right text-xs text-gray-400 mt-4">
        {selectedIds.length} option(s) sélectionnée(s)
      </div>
    </div>
  );
};
