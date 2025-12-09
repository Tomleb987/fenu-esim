import { InsuranceFormData } from "@/types/insurance";
import { Loader2 } from "lucide-react";

interface Props {
  formData: InsuranceFormData;
  updateFormData: any;
  errors: any;
  quote: { premium: number } | null;
  isLoadingQuote: boolean;
}

export const SummaryStep = ({ formData, quote, isLoadingQuote }: Props) => (
  <div className="space-y-6 animate-in fade-in bg-gray-50 p-6 rounded-lg">
    <h3 className="font-bold text-lg">Récapitulatif</h3>
    <div className="grid grid-cols-2 gap-4 text-sm">
        <div><strong>Destination:</strong> {formData.destination}</div>
        <div><strong>Dates:</strong> {formData.departureDate} au {formData.returnDate}</div>
        <div><strong>Assuré:</strong> {formData.firstName} {formData.lastName}</div>
        <div><strong>Voyageurs:</strong> {formData.additionalTravelers.length} supp.</div>
    </div>
    <div className="border-t pt-4 mt-4">
        <div className="flex justify-between items-center">
            <span className="font-bold text-lg">Total à payer</span>
            <span className="font-bold text-2xl text-primary">
                {isLoadingQuote ? <Loader2 className="animate-spin"/> : quote ? `${quote.premium.toFixed(2)} €` : "--"}
            </span>
        </div>
    </div>
  </div>
);
