import { InsuranceFormData } from "@/types/insurance";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AVA_TOURIST_OPTIONS, getOptionsForProduct } from "@/lib/ava_options";
import { Download, FileText } from "lucide-react";

interface SummaryStepProps {
  formData: InsuranceFormData;
  updateFormData: (data: Partial<InsuranceFormData>) => void;
  errors: Record<string, string>;
  quote: { premium: number } | null;
  isLoadingQuote: boolean;
  productType?: string;
}

export const SummaryStep = ({ formData, quote, isLoadingQuote, productType = 'ava_tourist_card' }: SummaryStepProps) => {

  const EUR_TO_XPF = 119.33;
  const toXPF = (eur: number) => Math.round(eur * EUR_TO_XPF).toLocaleString('fr-FR');
  const FRAIS_DISTRIBUTION_EUR = 10;
  const FRAIS_DISTRIBUTION_XPF = 1250;

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
    try {
      // Eviter le décalage timezone UTC → PF : parser manuellement YYYY-MM-DD
      const [year, month, day] = d.split("T")[0].split("-").map(Number);
      const date = new Date(year, month - 1, day);
      return format(date, 'dd MMM yyyy', { locale: fr });
    } catch { return d; }
  };

  // Résolution des noms d'options
  const productOptions = getOptionsForProduct(productType);
  const allOptions = productOptions.flatMap(opt => [
    opt,
    ...(opt.subOptions?.map(sub => ({ ...sub, type: 'select' as const })) || [])
  ]);
  const getOptionLabel = (id: string) => allOptions.find(o => o.id === id)?.label ?? `Option ${id}`;

  // Génération du devis PDF côté client avec jsPDF
  const downloadDevis = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });

    // --- PALETTE ---
    const purple1: [number,number,number] = [108, 43, 217];  // violet foncé
    const purple2: [number,number,number] = [168, 85, 247];  // violet clair
    const orange:  [number,number,number] = [249, 115, 22];  // orange
    const grayDk:  [number,number,number] = [55,  65,  81];
    const grayMd:  [number,number,number] = [107, 114, 128];
    const grayLt:  [number,number,number] = [243, 244, 246];
    const white:   [number,number,number] = [255, 255, 255];

    const pageW = 210;
    const pageH = 297;
    const margin = 15;
    const colW = pageW - margin * 2;

    // Charger logo une seule fois
    let logoBase64: string | null = null;
    try {
      const logoRes = await fetch("/logo.png");
      if (logoRes.ok) {
        const blob = await logoRes.blob();
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    } catch {}

    // =============================================
    // FILIGRANE (logo centré, très transparent)
    // =============================================
    if (logoBase64) {
      doc.saveGraphicsState();
      // @ts-ignore
      doc.setGState(new doc.GState({ opacity: 0.04 }));
      doc.addImage(logoBase64, "PNG", 55, 100, 100, 40);
      doc.restoreGraphicsState();
    }

    // =============================================
    // EN-TÊTE : gauche blanc (logo), droite violet
    // =============================================
    // Fond blanc côté logo
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW * 0.5, 48, "F");
    // Fond violet côté infos
    doc.setFillColor(...purple1);
    doc.rect(pageW * 0.5, 0, pageW * 0.5, 48, "F");
    // Bande orange fine en bas
    doc.setFillColor(...orange);
    doc.rect(0, 46, pageW, 2, "F");
    // Bordure fine séparatrice
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(0, 48, pageW, 48);

    // Logo sur fond blanc
    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", margin, 10, 56, 24);
    } else {
      doc.setTextColor(...purple1);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("FENUASIM", margin, 28);
    }

    // Titre + date sur fond violet
    doc.setTextColor(...white);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("ASSURANCE VOYAGE", pageW - margin, 16, { align: "right" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Devis personnalise", pageW - margin, 24, { align: "right" });
    doc.text("Emis le " + format(new Date(), "dd/MM/yyyy", { locale: fr }), pageW - margin, 31, { align: "right" });
    doc.text("Valable 30 jours", pageW - margin, 38, { align: "right" });

    let y = 58;

    // =============================================
    // BANDEAU FORMULE
    // =============================================
    doc.setFillColor(...grayLt);
    doc.roundedRect(margin, y, colW, 14, 3, 3, "F");
    doc.setTextColor(...purple1);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(productType === "ava_carte_sante" ? "AVA Carte Santé" : "AVA Tourist Card", margin + 5, y + 9);
    doc.setTextColor(...grayMd);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Assurance voyage tout risques — Polynesie francaise", pageW - margin - 3, y + 9, { align: "right" });
    y += 20;

    // =============================================
    // HELPERS
    // =============================================
    const sectionHeader = (title: string) => {
      doc.setFillColor(...purple1);
      doc.rect(margin, y, 3, 7, "F");
      doc.setTextColor(...purple1);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(title, margin + 6, y + 5.5);
      // ligne séparatrice
      doc.setDrawColor(...purple2);
      doc.setLineWidth(0.2);
      doc.line(margin + 6, y + 7, margin + colW, y + 7);
      y += 11;
    };

    const row = (label: string, value: string, highlight = false) => {
      if (highlight) {
        doc.setFillColor(248, 245, 255);
        doc.rect(margin, y - 4, colW, 8, "F");
      }
      doc.setTextColor(...grayMd);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(label, margin + 3, y);
      doc.setTextColor(...grayDk);
      doc.setFont("helvetica", "bold");
      doc.text(value, margin + 58, y);
      y += 7;
    };

    const chip = (text: string) => {
      const w = doc.getTextWidth(text) + 6;
      doc.setFillColor(...purple2);
      doc.roundedRect(margin + 3, y - 4, w, 6, 1.5, 1.5, "F");
      doc.setTextColor(...white);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(text, margin + 6, y);
      y += 8;
    };

    // =============================================
    // COLONNE GAUCHE + DROITE (2 colonnes)
    // =============================================
    const col1X = margin;
    const col2X = margin + colW / 2 + 3;
    const colHalf = colW / 2 - 3;

    // Encart gauche — Voyage
    doc.setFillColor(...grayLt);
    doc.roundedRect(col1X, y, colHalf, 38, 2, 2, "F");
    doc.setTextColor(...purple1);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("DETAILS DU VOYAGE", col1X + 4, y + 6);
    doc.setTextColor(...grayDk);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Destination :", col1X + 4, y + 13);
    doc.setFont("helvetica", "bold");
    doc.text(destinationName, col1X + 4, y + 19);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grayMd);
    doc.text("Du " + formatDate(formData.departureDate) + " au " + formatDate(formData.returnDate), col1X + 4, y + 26);
    doc.text("Cout voyage : " + formData.tripPrice + " EUR", col1X + 4, y + 32);

    // Encart droit — Assuré
    doc.setFillColor(240, 232, 255);
    doc.roundedRect(col2X, y, colHalf, 38, 2, 2, "F");
    doc.setTextColor(...purple1);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("ASSURE PRINCIPAL", col2X + 4, y + 6);
    doc.setTextColor(...grayDk);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(formData.firstName + " " + formData.lastName, col2X + 4, y + 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...grayMd);
    doc.text("Ne(e) le " + formatDate(formData.birthDate), col2X + 4, y + 21);
    doc.text(formData.email, col2X + 4, y + 27);
    if (formData.phone) doc.text(formData.phone, col2X + 4, y + 33);

    y += 44;

    // =============================================
    // VOYAGEURS SUPPLÉMENTAIRES
    // =============================================
    if (formData.additionalTravelers.length > 0) {
      sectionHeader("VOYAGEURS SUPPLEMENTAIRES (" + formData.additionalTravelers.length + ")");
      formData.additionalTravelers.forEach((t, i) => {
        row("Voyageur " + (i + 1), t.firstName + " " + t.lastName + "  —  ne(e) le " + formatDate(t.birthDate), i % 2 === 0);
      });
      y += 3;
    }

    // =============================================
    // OPTIONS
    // =============================================
    sectionHeader("OPTIONS SOUSCRITES");
    if (formData.selectedOptions.length > 0) {
      formData.selectedOptions.forEach(id => {
        chip(getOptionLabel(id));
      });
    } else {
      doc.setTextColor(...grayMd);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("Aucune option selectionnee", margin + 3, y);
      y += 8;
    }
    y += 4;

    // =============================================
    // TOTAL — lignes détaillées + carte dégradée
    // =============================================
    const EUR_TO_XPF_LOCAL = 119.33;
    const FRAIS_PDF = 10;
    const FRAIS_PDF_XPF = 1250;
    const eurVal = quote ? quote.premium : 0;
    const totalEur = eurVal + FRAIS_PDF;
    const totalXpf = Math.round(eurVal * EUR_TO_XPF_LOCAL) + FRAIS_PDF_XPF;

    // Ligne prime AVA
    doc.setTextColor(...grayMd);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Prime d'assurance AVA", margin + 3, y);
    doc.setTextColor(...grayDk);
    doc.setFont("helvetica", "bold");
    doc.text(eurVal.toFixed(2) + " EUR", pageW - margin - 3, y, { align: "right" });
    y += 7;

    // Ligne frais distribution
    doc.setTextColor(...grayMd);
    doc.setFont("helvetica", "normal");
    doc.text("Frais de distribution FENUASIM", margin + 3, y);
    doc.setTextColor(...grayDk);
    doc.setFont("helvetica", "bold");
    doc.text(FRAIS_PDF.toFixed(2) + " EUR", pageW - margin - 3, y, { align: "right" });
    y += 9;

    // Carte total
    doc.setFillColor(...purple1);
    doc.roundedRect(margin, y, colW, 22, 3, 3, "F");
    doc.setFillColor(...orange);
    doc.roundedRect(margin + colW - 40, y, 40, 22, 3, 3, "F");
    doc.setFillColor(...orange);
    doc.rect(margin + colW - 43, y, 6, 22, "F");

    doc.setTextColor(...white);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL ESTIME TTC", margin + 5, y + 8);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Prime + frais de distribution", margin + 5, y + 15);

    const xpfStr = totalXpf.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(totalEur.toFixed(2) + " EUR", pageW - margin - 5, y + 10, { align: "right" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("~ " + xpfStr + " XPF", pageW - margin - 5, y + 17, { align: "right" });
    y += 30;

    // =============================================
    // MENTIONS LÉGALES — encart gris
    // =============================================
    doc.setFillColor(...grayLt);
    doc.roundedRect(margin, y, colW, 34, 2, 2, "F");
    doc.setTextColor(...purple1);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("MENTIONS LEGALES", margin + 4, y + 6);
    doc.setTextColor(...grayMd);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    const mentions = [
      "Ce document est un devis non contractuel etabli sur la base des informations fournies.",
      `L'assurance ${productType === 'ava_carte_sante' ? 'AVA Carte Sante' : 'AVA Tourist Card'} est distribuee par FENUASIM, partenaire d'ANSET ASSURANCES.`,
      "La souscription definitive est conditionnee au paiement et a la validation du contrat.",
      "FENUASIM est enregistre au registre des intermediaires d'assurance de Polynesie francaise",
      "sous le numero PF 26 012 en qualite de mandataire d'intermediaire d'assurance.",
    ];
    mentions.forEach((line, i) => {
      doc.text(line, margin + 4, y + 12 + i * 4.5);
    });
    y += 40;

    // =============================================
    // PIED DE PAGE
    // =============================================
    doc.setFillColor(...purple1);
    doc.rect(0, pageH - 12, pageW, 12, "F");
    doc.setFillColor(...orange);
    doc.rect(0, pageH - 13, pageW, 1, "F");
    doc.setTextColor(...white);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text("www.fenuasim.com", margin, pageH - 5);
    doc.text("contact@fenuasim.com", pageW / 2, pageH - 5, { align: "center" });
    doc.text("Polynesie francaise", pageW - margin, pageH - 5, { align: "right" });

    doc.save("Devis-Assurance-FENUASIM-" + format(new Date(), "ddMMyyyy") + ".pdf");
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
          {productType === 'ava_carte_sante' ? '🏥 AVA Carte Santé' : '✈️ AVA Tourist Card'}
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
        <div className="pt-4 mt-2 border-t border-gray-200 bg-white p-4 rounded-lg shadow-sm space-y-2">
          {/* Ligne prime AVA */}
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Prime d'assurance AVA</span>
            <div className="text-right">
              {isLoadingQuote ? (
                <span className="text-sm italic text-primary animate-pulse">Calcul en cours...</span>
              ) : (
                <span className="font-medium text-gray-900">
                  {quote ? `${quote.premium.toFixed(2)} €` : "-- €"}
                </span>
              )}
            </div>
          </div>
          {/* Ligne frais distribution */}
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Frais de distribution FENUASIM</span>
            <span className="font-medium text-gray-900">{FRAIS_DISTRIBUTION_EUR.toFixed(2)} €</span>
          </div>
          {/* Séparateur */}
          <div className="border-t border-dashed border-gray-200 pt-2 mt-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg text-gray-900">Total à payer</span>
              <div className="text-right">
                {isLoadingQuote ? (
                  <span className="text-sm italic text-primary animate-pulse">Calcul en cours...</span>
                ) : (
                  <div className="text-right">
                    <span className="font-bold text-3xl text-primary block">
                      {quote ? `${(quote.premium + FRAIS_DISTRIBUTION_EUR).toFixed(2)} €` : "-- €"}
                    </span>
                    {quote && (
                      <span className="text-sm text-gray-400 font-normal">
                        ≈ {(toXPF(quote.premium + FRAIS_DISTRIBUTION_EUR))} XPF
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
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
