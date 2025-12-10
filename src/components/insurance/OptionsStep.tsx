import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InsuranceFormData } from "@/types/insurance";
import { getOptionsForProduct, AvaOption } from "@/lib/ava_options"; 
import { Shield, ShieldCheck } from "lucide-react";

interface Props {
  formData: InsuranceFormData;
  updateFormData: (data: Partial<InsuranceFormData>) => void;
  errors: Record<string, string>;
}

export const OptionsStep = ({ formData, updateFormData }: Props) => {
  const productType = "ava_tourist_card";
  const options = getOptionsForProduct(productType);
  const selectedIds = formData.selectedOptions || [];

  // Gestion des cases à cocher (Boolean)
  const handleBooleanToggle = (opt: AvaOption, checked: boolean) => {
    // L'ID à envoyer est soit la sous-option par défaut, soit l'ID principal
    const targetId = opt.defaultSubOptionId || opt.id;
    
    if (checked) {
      updateFormData({ selectedOptions: [...selectedIds, targetId] });
    } else {
      updateFormData({ selectedOptions: selectedIds.filter(id => id !== targetId) });
    }
  };

  // Gestion des menus déroulants (Select)
  const handleSelectChange = (opt: AvaOption, value: string) => {
    // 1. On retire toutes les autres sous-options de ce groupe qui seraient déjà cochées
    const otherSubOptions = opt.subOptions?.map(so => so.id) || [];
    const cleanedSelection = selectedIds.filter(id => !otherSubOptions.includes(id));
    
    // 2. On ajoute la nouvelle valeur
    updateFormData({ selectedOptions: [...cleanedSelection, value] });
  };

  // Vérifie si une option (ou une de ses sous-options) est active
  const isOptionActive = (opt: AvaOption) => {
    if (opt.type === 'boolean') {
       const targetId = opt.defaultSubOptionId || opt.id;
       return selectedIds.includes(targetId);
    }
    // Pour un select, on regarde si L'UNE des sous-options est dans la liste
    return opt.subOptions?.some(sub => selectedIds.includes(sub.id));
  };

  // Récupère la valeur actuelle pour un Select
  const getSelectedValue = (opt: AvaOption) => {
    return opt.subOptions?.find(sub => selectedIds.includes(sub.id))?.id || "";
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Options complémentaires</h2>
        <p className="text-muted-foreground">Personnalisez votre couverture selon vos besoins</p>
      </div>

      <div className="grid gap-4">
        {options.map((opt) => {
          const isActive = isOptionActive(opt);

          return (
            <div 
                key={opt.id} 
                className={`flex flex-col p-4 rounded-lg border-2 transition-all ${
                    isActive
                    ? "border-primary bg-primary/5 ring-1 ring-primary" 
                    : "border-border hover:border-primary/50"
                }`}
            >
              <div className="flex items-center space-x-3">
                {/* --- TYPE BOOLEAN (Checkbox) --- */}
                {opt.type === 'boolean' && (
                    <Checkbox 
                        id={opt.id} 
                        checked={isActive}
                        onCheckedChange={(checked) => handleBooleanToggle(opt, checked)}
                    />
                )}
                
                {/* --- TYPE SELECT (Icone) --- */}
                {opt.type === 'select' && (
                    <div className={`p-1 rounded-full ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                        {isActive ? <ShieldCheck className="w-5 h-5"/> : <Shield className="w-5 h-5"/>}
                    </div>
                )}

                <div className="flex-1">
                    <Label htmlFor={opt.id} className="font-bold text-base cursor-pointer block">
                      {opt.label}
                    </Label>
                    
                    {/* Si c'est un SELECT, on affiche le menu déroulant en dessous */}
                    {opt.type === 'select' && (
                        <div className="mt-3 max-w-xs">
                             <Select 
                                value={getSelectedValue(opt)} 
                                onValueChange={(val) => handleSelectChange(opt, val)}
                             >
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Choisir un niveau..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {opt.subOptions?.map((sub) => (
                                        <SelectItem key={sub.id} value={sub.id}>
                                            {sub.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                             </Select>
                        </div>
                    )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
