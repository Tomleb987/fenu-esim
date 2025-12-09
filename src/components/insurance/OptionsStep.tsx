import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { InsuranceFormData } from "@/types/insurance";
import { getOptionsForProduct } from "@/lib/ava_options"; // ✅ Import des options statiques
import { ShieldCheck } from "lucide-react";

interface Props {
  formData: InsuranceFormData;
  updateFormData: (data: Partial<InsuranceFormData>) => void;
  errors: Record<string, string>;
}

export const OptionsStep = ({ formData, updateFormData }: Props) => {
  // On récupère les options disponibles pour le produit choisi (ex: 'ava_tourist_card')
  // Si aucun produit n'est défini, on prend celui par défaut
  const productType = "ava_tourist_card"; // Ou formData.productType si vous gérez le multi-produit
  const options = getOptionsForProduct(productType);

  const handleOptionToggle = (optionId: string) => {
    const currentOptions = formData.selectedOptions || [];
    if (currentOptions.includes(optionId)) {
      updateFormData({ selectedOptions: currentOptions.filter(id => id !== optionId) });
    } else {
      updateFormData({ selectedOptions: [...currentOptions, optionId] });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Options complémentaires</h2>
        <p className="text-muted-foreground">Personnalisez votre couverture</p>
      </div>

      {options.length === 0 ? (
        <div className="text-center p-8 border-2 border-dashed rounded-lg bg-muted/30">
            <ShieldCheck className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-50"/>
            <p>Aucune option supplémentaire disponible pour cette offre.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {options.map((opt) => (
            <div 
                key={opt.id} 
                className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    formData.selectedOptions?.includes(opt.id) 
                    ? "border-primary bg-primary/5 ring-1 ring-primary" 
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => handleOptionToggle(opt.id)}
            >
              <Checkbox 
                id={opt.id} 
                checked={formData.selectedOptions?.includes(opt.id)}
                onCheckedChange={() => handleOptionToggle(opt.id)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor={opt.id} className="font-bold text-base cursor-pointer">
                  {opt.label}
                </Label>
                {opt.description && (
                  <p className="text-sm text-muted-foreground">
                    {opt.description}
                  </p>
                )}
                {opt.price && (
                    <span className="text-sm font-medium text-primary mt-1 block">
                        + {opt.price} €
                    </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
