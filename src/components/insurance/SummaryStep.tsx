import { InsuranceFormData } from "@/types/insurance";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SummaryStepProps {
  formData: InsuranceFormData;
  updateFormData: (data: Partial<InsuranceFormData>) => void;
  errors: Record<string, string>;
  quote: { premium: number } | null;
  isLoadingQuote: boolean;
}

// Dictionnaire pour traduire les codes techniques en noms lisibles
const DESTINATION_LABELS: Record<string, string> = {
  "102": "Monde Entier (Hors USA/Canada) 🌍",
  "58": "USA & Canada 🇺🇸 🇨🇦",
  "53": "Europe (Schengen) 🇪🇺"
};

export const SummaryStep = ({ formData, quote, isLoadingQuote }: SummaryStepProps) => {
  
  // Fonction pour afficher le nom propre au lieu du code
  const destinationName = DESTINATION_LABELS[formData.destination] || formData.destination;

  // Formatage des dates pour faire joli (ex: 15 déc. 2025)
  const formatDate = (d: string) => d ? format(new Date(d), 'dd MMM yyyy', { locale: fr }) : "--";

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Récapitulatif</h2>
        <p className="text-muted-foreground text-sm">
          Vérifiez vos informations avant de payer.
        </p>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-4">
        
        {/* LIGNE 1 : VOYAGE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-gray-200">
            <div>
                <span className="block text-xs text-gray-500 uppercase font-semibold">Destination</span>
                {/* ICI LA CORRECTION : on affiche le nom traduit */}
                <span className="text-gray-900 font-medium">{destinationName}</span>
            </div>
            <div>
                <span className="block text-xs text-gray-500 uppercase font-semibold">Dates</span>
                <span className="text-gray-900 font-medium">
                    Du {formatDate(formData.departureDate)} au {formatDate(formData.returnDate)}
                </span>
            </div>
        </div>

        {/* LIGNE 2 : ASSURÉ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-gray-200">
            <div>
                <span className="block text-xs text-gray-500 uppercase font-semibold">Assuré principal</span>
                <span className="text-gray-900 font-medium">
                    {formData.firstName} {formData.lastName}
                </span>
                <span className="block text-xs text-gray-400">Né(e) le {formatDate(formData.birthDate)}</span>
            </div>
            <div>
                <span className="block text-xs text-gray-500 uppercase font-semibold">Voyageurs supp.</span>
                <span className="text-gray-900 font-medium">
                    {formData.additionalTravelers.length > 0 
                        ? `${formData.additionalTravelers.length} personne(s)` 
                        : "Aucun"}
                </span>
            </div>
        </div>

        {/* LIGNE 3 : OPTIONS */}
        <div>
            <span className="block text-xs text-gray-500 uppercase font-semibold mb-1">Options choisies</span>
            {formData.selectedOptions && formData.selectedOptions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {formData.selectedOptions.map((optId) => (
                        <span key={optId} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-medium">
                            Option {optId}
                        </span>
                    ))}
                </div>
            ) : (
                <span className="text-gray-400 text-sm italic">Aucune option sélectionnée</span>
            )}
        </div>

        {/* TOTAL */}
        <div className="flex justify-between items-center pt-4 mt-2 border-t border-gray-200">
            <span className="font-bold text-lg text-gray-900">Total à payer</span>
            <div className="text-right">
                {isLoadingQuote ? (
                    <span className="text-sm italic text-primary animate-pulse">Calcul en cours...</span>
                ) : (
                    <span className="font-bold text-3xl text-primary">
                        {quote ? `${quote.premium.toFixed(2)} €` : "-- €"}
                    </span>
                )}
            </div>
        </div>

      </div>
      
      <p className="text-center text-xs text-gray-400 px-4">
        En cliquant sur "Payer", vous acceptez les conditions générales de vente et confirmez l'exactitude des informations.
      </p>
    </div>
  );
};
