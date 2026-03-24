import { useState } from "react";
import { InsuranceFormData } from "@/types/insurance";
import { getOptionsForProduct, AvaOption } from "@/lib/ava_options";

interface OptionsStepProps {
  formData: InsuranceFormData;
  updateFormData: (data: Partial<InsuranceFormData>) => void;
  errors: Record<string, string>;
  productType?: string;
}

export const OptionsStep = ({ formData, updateFormData, productType = "ava_tourist_card" }: OptionsStepProps) => {
  const options = getOptionsForProduct(productType);
  const selectedIds = formData.selectedOptions || [];

  // Dates spécifiques pour les options date-range (ex: CDW 728)
  const [dateRangeValues, setDateRangeValues] = useState<Record<string, { from: string; to: string }>>({});

  const handleDateRangeToggle = (opt: AvaOption, checked: boolean) => {
    let newSelected = [...selectedIds];
    if (checked) {
      if (!newSelected.includes(opt.id)) newSelected.push(opt.id);
    } else {
      newSelected = newSelected.filter(id => id !== opt.id);
      setDateRangeValues(prev => { const n = { ...prev }; delete n[opt.id]; return n; });
    }
    updateFormData({ selectedOptions: newSelected });
  };

  const handleDateRangeChange = (optId: string, field: "from" | "to", value: string) => {
    setDateRangeValues(prev => ({
      ...prev,
      [optId]: { ...prev[optId], [field]: value }
    }));
    // Stocker les dates dans formData pour les transmettre à ava.ts
    updateFormData({
      optionDateRanges: {
        ...(formData.optionDateRanges || {}),
        [optId]: {
          ...(formData.optionDateRanges?.[optId] || {}),
          [field === "from" ? "from_date_option" : "to_date_option"]: value
        }
      }
    });
  };

  const isDateRangeChecked = (opt: AvaOption) => selectedIds.includes(opt.id);

  const handleBooleanToggle = (opt: AvaOption, checked: boolean) => {
    const targetId = opt.defaultSubOptionId || opt.id;
    let newSelected = [...selectedIds];
    if (checked) {
      newSelected.push(targetId);
    } else {
      newSelected = newSelected.filter(id => id !== targetId);
    }
    updateFormData({ selectedOptions: newSelected });
  };

  const handleSelectChange = (opt: AvaOption, value: string) => {
    const subOptionIds = opt.subOptions?.map(so => so.id) || [];
    let newSelected = selectedIds.filter(id => !subOptionIds.includes(id));
    if (value) newSelected.push(value);
    updateFormData({ selectedOptions: newSelected });
  };

  const isBooleanChecked = (opt: AvaOption) => {
    const targetId = opt.defaultSubOptionId || opt.id;
    return selectedIds.includes(targetId);
  };

  const getSelectValue = (opt: AvaOption) => {
    const found = opt.subOptions?.find(so => selectedIds.includes(so.id));
    return found ? found.id : "";
  };

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
                    <option key={sub.id} value={sub.id}>{sub.label}</option>
                  ))}
                </select>
              </div>
            )}

            {opt.type === 'date-range' && (
              <div>
                <label className="flex items-start gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    checked={isDateRangeChecked(opt)}
                    onChange={(e) => handleDateRangeToggle(opt, e.target.checked)}
                  />
                  <div className="flex-1">
                    <span className={labelClass}>{opt.label}</span>
                    {opt.description && <span className={descClass}>{opt.description}</span>}
                  </div>
                </label>
                {isDateRangeChecked(opt) && (
                  <div className="grid grid-cols-2 gap-3 mt-2 pl-7">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                        Début de location
                      </label>
                      <input
                        type="date"
                        className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        value={dateRangeValues[opt.id]?.from || ""}
                        min={formData.departureDate || ""}
                        max={formData.returnDate || ""}
                        onChange={(e) => handleDateRangeChange(opt.id, "from", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                        Fin de location
                      </label>
                      <input
                        type="date"
                        className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        value={dateRangeValues[opt.id]?.to || ""}
                        min={dateRangeValues[opt.id]?.from || formData.departureDate || ""}
                        max={formData.returnDate || ""}
                        onChange={(e) => handleDateRangeChange(opt.id, "to", e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        ))}
      </div>

      <div className="text-right text-xs text-gray-400 mt-4">
        {selectedIds.length} option(s) sélectionnée(s)
      </div>
    </div>
  );
};
