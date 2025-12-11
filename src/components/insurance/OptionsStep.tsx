import { InsuranceFormData } from "@/types/insurance";

interface OptionsStepProps {
  formData: InsuranceFormData;
  updateFormData: (data: Partial<InsuranceFormData>) => void;
  errors: Record<string, string>;
}

export const OptionsStep = ({ formData, updateFormData }: OptionsStepProps) => {
  const handleToggleOption = (optionKey: string) => {
    const current = new Set(formData.selectedOptions || []);
    if (current.has(optionKey)) {
      current.delete(optionKey);
    } else {
      current.add(optionKey);
    }
    updateFormData({ selectedOptions: Array.from(current) });
  };

  const isChecked = (key: string) =>
    Array.isArray(formData.selectedOptions) &&
    formData.selectedOptions.includes(key);

  const labelClass = "text-sm font-medium text-gray-800";
  const hintClass = "text-xs text-muted-foreground";

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold mb-2">Options de votre contrat</h2>
        <p className="text-muted-foreground text-sm">
          Choisissez les garanties complémentaires pour adapter votre
          couverture.
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex items-start gap-3 p-4 border rounded-lg bg-gray-50 cursor-pointer hover:border-primary/40 transition-all">
          <input
            type="checkbox"
            className="mt-1"
            checked={isChecked("annulation")}
            onChange={() => handleToggleOption("annulation")}
          />
          <div>
            <div className={labelClass}>Assurance annulation</div>
            <p className={hintClass}>
              Remboursement de votre voyage en cas d&apos;imprévu couvert.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-4 border rounded-lg bg-gray-50 cursor-pointer hover:border-primary/40 transition-all">
          <input
            type="checkbox"
            className="mt-1"
            checked={isChecked("bagages")}
            onChange={() => handleToggleOption("bagages")}
          />
          <div>
            <div className={labelClass}>Protection bagages</div>
            <p className={hintClass}>
              Indemnisation en cas de perte, vol ou dommage.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-4 border rounded-lg bg-gray-50 cursor-pointer hover:border-primary/40 transition-all">
          <input
            type="checkbox"
            className="mt-1"
            checked={isChecked("sports")}
            onChange={() => handleToggleOption("sports")}
          />
          <div>
            <div className={labelClass}>Sports & activités</div>
            <p className={hintClass}>
              Extension de garanties pour certaines activités de loisirs.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
};
