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

export const SummaryStep = ({ formData, quote, isLoadingQuote }: SummaryStepProps) => {
  
  // Fonction de traduction "blindée"
  const getDestinationLabel = (code: string | number) => {
      const codeStr = String(code).trim();
      switch (codeStr) {
          case "102": return "Monde Entier (Hors USA/Canada) 🌍";
          case "58":  return "USA & Canada 🇺🇸 🇨🇦";
          case "53":  return "Europe (Schengen) 🇪🇺";
          default:    return codeStr;
      }
  };

  const destinationName = getDestinationLabel(formData.destination);
  
  // Helper pour formater les dates proprement
  const formatDate = (d: string) => {
      if (!d) return "--";
      try {
          return format(new Date(d), 'dd MMM yyyy', { locale: fr });
      } catch (e) {
          return d;
      }
  };

  // ✅ CORRECTION ICI : Noms exacts de vos fichiers PDF
  const docs = [
      { name: "IPID - Document d'Information", file: "/documents/IPID-TOURIST-CARD.pdf", icon: "📄" },
      { name: "Conditions Générales (CG)", file: "/documents/CG-AVA-TOURIST-CARD.pdf", icon: "📄" },
      { name: "Notice AVA TECH+ (Multimédia)", file: "/documents/NI-AVA-TECH-PLUS-1.pdf", icon: "📱" },
  ];

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
                <span className="text-gray-900 font-medium text-lg">{destinationName}</span>
            </div>
            <div>
                <span className="block text-xs text-gray-500 uppercase font-semibold">Dates</span>
                <span className="text-gray-900 font-medium">
                    Du {formatDate(formData.departureDate)} au {formatDate(formData.returnDate)}
                </span>
            </div>
        </div>

        {/* LIGNE 2 : ASSURÉ & VOYAGEURS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-gray-200">
            {/* Assuré Principal */}
            <div>
                <span className="block text-xs text-gray-500 uppercase font-semibold mb-1">Assuré principal</span>
                <div className="text-gray-900 font-medium">
                    {formData.firstName} {formData.lastName}
                </div>
                <div className="text-xs text-gray-500">
                    Né(e) le {formatDate(formData.birthDate)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                    {formData.email}
                </div>
            </div>

            {/* Voyageurs Supplémentaires (Liste détaillée) */}
            <div>
                <span className="block text-xs text-gray-500 uppercase font-semibold mb-1">
                    Voyageurs supp. ({formData.additionalTravelers.length})
                </span>
                
                {formData.additionalTravelers.length > 0 ? (
                    <div className="flex flex-col gap-2 mt-1">
                        {formData.additionalTravelers.map((t, index) => (
                            <div key={index} className="pl-3 border-l-2 border-primary/20 text-sm">
                                <span className="font-medium text-gray-900">
                                    {t.firstName} {t.lastName}
                                </span>
                                <span className="block text-xs text-gray-500">
                                    Né(e) le {formatDate(t.birthDate)}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <span className="text-gray-400 text-sm italic">Aucun</span>
                )}
            </div>
        </div>

        {/* LIGNE 3 : OPTIONS */}
        <div className="pb-4 border-b border-gray-200">
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

        {/* LIGNE 4 : DOCUMENTS TÉLÉCHARGEABLES */}
        <div className="pb-2">
            <span className="block text-xs text-gray-500 uppercase font-semibold mb-2">Documents contractuels</span>
            <div className="flex flex-col gap-2">
                {docs.map((doc, idx) => (
                    <a 
                        key={idx} 
                        href={doc.file} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                        <span className="mr-2 text-lg">{doc.icon}</span>
                        {doc.name}
                        <span className="ml-1 text-xs text-gray-400 no-underline">(PDF)</span>
                    </a>
                ))}
            </div>
        </div>

        {/* TOTAL */}
        <div className="flex justify-between items-center pt-4 mt-2 border-t border-gray-200 bg-white p-4 rounded-lg shadow-sm">
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
        En cliquant sur "Payer", vous reconnaissez avoir lu les documents d'information (IPID) et les conditions générales.
      </p>
    </div>
  );
};
