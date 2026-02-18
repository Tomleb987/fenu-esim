import { InsuranceFormData } from "@/types/insurance";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AVA_TOURIST_OPTIONS } from "@/lib/ava_options";
import { Download, FileText } from "lucide-react";

interface SummaryStepProps {
  formData: InsuranceFormData;
  updateFormData: (data: Partial<InsuranceFormData>) => void;
  errors: Record<string, string>;
  quote: { premium: number } | null;
  isLoadingQuote: boolean;
}

export const SummaryStep = ({ formData, quote, isLoadingQuote }: SummaryStepProps) => {

  const getDestinationLabel = (code: string | number) => {
    const codeStr = String(code).trim();
    switch (codeStr) {
      case "102": return "Monde Entier (Hors USA/Canada)";
      case "58":  return "USA & Canada";
      case "53":  return "Europe (Schengen)";
      default:    return codeStr;
    }
  };

  const destinationName = getDestinationLabel(formData.destination);

  const formatDate = (d: string) => {
    if (!d) return "--";
    try { return format(new Date(d), 'dd MMM yyyy', { locale: fr }); }
    catch { return d; }
  };

  // Résolution des noms d'options
  const allOptions = AVA_TOURIST_OPTIONS.flatMap(opt => [
    opt,
    ...(opt.subOptions?.map(sub => ({ ...sub, type: 'select' as const })) || [])
  ]);
  const getOptionLabel = (id: string) => allOptions.find(o => o.id === id)?.label ?? `Option ${id}`;

  // Génération du devis PDF côté client avec jsPDF
  const downloadDevis = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    const purple = [160, 32, 240] as [number, number, number];
    const gray   = [100, 100, 100] as [number, number, number];
    const black  = [30, 30, 30]   as [number, number, number];
    const light  = [248, 245, 255] as [number, number, number];

    const pageW = 210;
    const margin = 18;
    const colW = pageW - margin * 2;

    // --- EN-TÊTE ---
    doc.setFillColor(...purple);
    doc.rect(0, 0, pageW, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("FENUASIM", margin, 16);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Assurance Voyage — Devis", margin, 25);
    doc.setFontSize(9);
    doc.text(`Émis le ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`, pageW - margin, 25, { align: "right" });

    let y = 50;

    // --- Formule + Référence devis ---
    doc.setTextColor(...purple);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("AVA Tourist Card", margin, y);
    y += 7;
    doc.setTextColor(...gray);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Devis non contractuel — valable 30 jours`, margin, y);
    y += 10;

    // --- Section helper ---
    const section = (title: string) => {
      doc.setFillColor(...light);
      doc.rect(margin, y, colW, 8, "F");
      doc.setTextColor(...purple);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(title.toUpperCase(), margin + 3, y + 5.5);
      y += 12;
    };

    const row = (label: string, value: string) => {
      doc.setTextColor(...gray);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(label, margin + 3, y);
      doc.setTextColor(...black);
      doc.setFont("helvetica", "bold");
      doc.text(value, margin + 55, y);
      y += 7;
    };

    // --- VOYAGE ---
    section("Détails du voyage");
    row("Destination", destinationName);
    row("Départ", formatDate(formData.departureDate));
    row("Retour", formatDate(formData.returnDate));
    row("Coût du voyage", `${formData.tripPrice} €`);
    y += 3;

    // --- ASSURÉ PRINCIPAL ---
    section("Assuré principal");
    row("Nom", `${formData.firstName} ${formData.lastName}`);
    row("Date de naissance", formatDate(formData.birthDate));
    row("Email", formData.email);
    if (formData.phone) row("Téléphone", formData.phone);
    y += 3;

    // --- VOYAGEURS SUPPLÉMENTAIRES ---
    if (formData.additionalTravelers.length > 0) {
      section(`Voyageurs supplémentaires (${formData.additionalTravelers.length})`);
      formData.additionalTravelers.forEach((t, i) => {
        row(`Voyageur ${i + 1}`, `${t.firstName} ${t.lastName} — né(e) le ${formatDate(t.birthDate)}`);
      });
      y += 3;
    }

    // --- OPTIONS ---
    section("Options souscrites");
    if (formData.selectedOptions.length > 0) {
      formData.selectedOptions.forEach(id => {
        doc.setTextColor(...black);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`✓  ${getOptionLabel(id)}`, margin + 3, y);
        y += 7;
      });
    } else {
      doc.setTextColor(...gray);
      doc.setFontSize(9);
      doc.text("Aucune option sélectionnée", margin + 3, y);
      y += 7;
    }
    y += 3;

    // --- TOTAL ---
    doc.setFillColor(...purple);
    doc.rect(margin, y, colW, 16, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL ESTIMÉ TTC", margin + 5, y + 10.5);
    const priceText = quote ? `${quote.premium.toFixed(2)} €` : "En cours de calcul";
    doc.setFontSize(14);
    doc.text(priceText, pageW - margin - 5, y + 10.5, { align: "right" });
    y += 24;

    // --- MENTIONS LÉGALES ---
    doc.setTextColor(...gray);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    const mentions = [
      "Ce document est un devis non contractuel établi sur la base des informations fournies.",
      "L'assurance AVA Tourist Card est distribuée par FENUASIM, partenaire d'ANSET ASSURANCES.",
      "La souscription définitive est conditionnée au paiement et à la validation du contrat.",
    ];
    mentions.forEach(line => {
      doc.text(line, margin, y);
      y += 5;
    });

    // --- PIED DE PAGE ---
    doc.setFillColor(...purple);
    doc.rect(0, 287, pageW, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("www.fenuasim.com", pageW / 2, 293, { align: "center" });

    doc.save(`Devis-Assurance-FENUASIM-${format(new Date(), 'ddMMyyyy')}.pdf`);
  };

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
        <span className="inline-block mt-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1 rounded-full">
          AVA Tourist Card
        </span>
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
          <div>
            <span className="block text-xs text-gray-500 uppercase font-semibold mb-1">Assuré principal</span>
            <div className="text-gray-900 font-medium">{formData.firstName} {formData.lastName}</div>
            <div className="text-xs text-gray-500">Né(e) le {formatDate(formData.birthDate)}</div>
            <div className="text-xs text-gray-500 mt-1">{formData.email}</div>
          </div>
          <div>
            <span className="block text-xs text-gray-500 uppercase font-semibold mb-1">
              Voyageurs supp. ({formData.additionalTravelers.length})
            </span>
            {formData.additionalTravelers.length > 0 ? (
              <div className="flex flex-col gap-2 mt-1">
                {formData.additionalTravelers.map((t, index) => (
                  <div key={index} className="pl-3 border-l-2 border-primary/20 text-sm">
                    <span className="font-medium text-gray-900">{t.firstName} {t.lastName}</span>
                    <span className="block text-xs text-gray-500">Né(e) le {formatDate(t.birthDate)}</span>
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
                  {getOptionLabel(optId)}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-gray-400 text-sm italic">Aucune option sélectionnée</span>
          )}
        </div>

        {/* LIGNE 4 : DOCUMENTS CONTRACTUELS */}
        <div className="pb-4 border-b border-gray-200">
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
                <span className="ml-1 text-xs text-gray-400">(PDF)</span>
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

      {/* BOUTON TÉLÉCHARGER DEVIS */}
      {quote && (
        <button
          onClick={downloadDevis}
          className="w-full flex items-center justify-center gap-2 border border-primary text-primary hover:bg-primary/5 font-medium py-3 px-4 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Télécharger mon devis (PDF)
        </button>
      )}

      <p className="text-center text-xs text-gray-400 px-4">
        En cliquant sur "Payer", vous reconnaissez avoir lu les documents d'information (IPID) et les conditions générales.
      </p>
    </div>
  );
};
