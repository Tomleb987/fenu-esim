import { InsuranceFormData } from "@/types/insurance";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AVA_TOURIST_OPTIONS } from "@/lib/ava_options";
import { Download } from "lucide-react";

interface SummaryStepProps {
  formData: InsuranceFormData;
  updateFormData: (data: Partial<InsuranceFormData>) => void;
  errors: Record<string, string>;
  quote: { premium: number } | null;
  isLoadingQuote: boolean;
  productType?: string;
}

const PRODUCT_LABELS: Record<string, string> = {
  ava_tourist_card: "AVA Tourist Card",
  ava_carte_sante:  "AVA Carte Sante",
  avantages_pom:    "AVAntages POM",
  avantages_360:    "AVAntages 360",
};

const getProductLabel = (productType: string) =>
  PRODUCT_LABELS[productType] ?? "AVA Tourist Card";

export const SummaryStep = ({ formData, quote, isLoadingQuote, productType }: SummaryStepProps) => {

  const EUR_TO_XPF = 119.33;
  const FRAIS_DISTRIB_EUR = 10;
  const toXPF = (eur: number) =>
    Math.round(eur * EUR_TO_XPF).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

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
      const [year, month, day] = d.split("T")[0].split("-").map(Number);
      const date = new Date(year, month - 1, day);
      return format(date, "dd MMM yyyy", { locale: fr });
    } catch { return d; }
  };

  const allOptions = AVA_TOURIST_OPTIONS.flatMap(opt => [
    opt,
    ...(opt.subOptions?.map(sub => ({ ...sub, type: "select" as const })) || [])
  ]);
  const getOptionLabel = (id: string) => allOptions.find(o => o.id === id)?.label ?? `Option ${id}`;

  const downloadDevis = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });

    const purple:  [number,number,number] = [108, 43, 217];
    const grayDk:  [number,number,number] = [30,  30,  30];
    const grayMd:  [number,number,number] = [100, 100, 110];
    const grayLt:  [number,number,number] = [245, 245, 248];
    const grayBrd: [number,number,number] = [210, 210, 220];
    const white:   [number,number,number] = [255, 255, 255];

    const pageW = 210;
    const pageH = 297;
    const margin = 20;
    const colW = pageW - margin * 2;
    const xR = pageW - margin;

    const EUR_TO_XPF_LOCAL = 119.33;
    const FRAIS = 10;
    const premiumEur = quote ? quote.premium : 0;
    const totalEur = premiumEur + FRAIS;
    const sepXpf = (v: number) =>
      Math.round(v * EUR_TO_XPF_LOCAL).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    const fmtEur = (v: number) => v.toFixed(2) + " EUR";
    const fmtXpf = (v: number) => sepXpf(v) + " XPF";

    const productLabelPdf = getProductLabel(productType ?? formData.productType);

    // Logo
    let logoBase64: string | null = null;
    try {
      const logoRes = await fetch("/logo.png");
      if (logoRes.ok) {
        const blob = await logoRes.blob();
        const blobUrl = URL.createObjectURL(blob);
        await new Promise<void>((res) => {
          const img = new Image();
          img.onload = () => {
            (window as any)._logoNaturalW = img.naturalWidth;
            (window as any)._logoNaturalH = img.naturalHeight;
            URL.revokeObjectURL(blobUrl);
            res();
          };
          img.src = blobUrl;
        });
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    } catch {}

    // Fond blanc
    doc.setFillColor(...white);
    doc.rect(0, 0, pageW, pageH, "F");

    let y = margin;

    // En-tête
    if (logoBase64) {
      const natW = (window as any)._logoNaturalW || 260;
      const natH = (window as any)._logoNaturalH || 80;
      const logoH = 14;
      const logoW = (natW / natH) * logoH;
      doc.addImage(logoBase64, "PNG", margin, y, logoW, logoH);
    } else {
      doc.setTextColor(...purple);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("FENUA SIM", margin, y + 10);
    }

    doc.setTextColor(...grayMd);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text("FENUA SIM — 58 rue Monceau, 75008 Paris", xR, y + 4, { align: "right" });
    doc.text("contact@fenuasim.com — www.fenuasim.com", xR, y + 9, { align: "right" });
    doc.text("SASU — 943 713 875 RCS Paris", xR, y + 14, { align: "right" });

    y += 22;

    doc.setDrawColor(...grayBrd);
    doc.setLineWidth(0.3);
    doc.line(margin, y, xR, y);
    y += 8;

    // Titre
    doc.setTextColor(...purple);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Devis Assurance Voyage", xR, y, { align: "right" });
    y += 7;
    doc.setTextColor(...grayMd);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Emis le " + format(new Date(), "dd/MM/yyyy", { locale: fr }) +
      "  |  Valable 30 jours  |  Partenaire ANSET ASSURANCES",
      xR, y, { align: "right" }
    );
    y += 10;

    // Produit
    doc.setTextColor(...grayDk);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(productLabelPdf, margin, y);
    doc.setTextColor(...grayMd);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Assurance voyage — Polynesie francaise", margin, y + 5);
    y += 12;

    doc.setDrawColor(...grayBrd);
    doc.setLineWidth(0.3);
    doc.line(margin, y, xR, y);
    y += 8;

    // 2 colonnes : Voyage + Assuré
    const col2X = margin + colW / 2 + 3;

    doc.setTextColor(...purple);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("DETAILS DU VOYAGE", margin, y);
    doc.text("ASSURE PRINCIPAL", col2X, y);
    y += 5;

    doc.setTextColor(...grayDk);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(destinationName, margin, y);
    doc.text(formData.firstName + " " + formData.lastName, col2X, y);
    y += 5;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grayMd);
    doc.text("Du " + formatDate(formData.departureDate) + " au " + formatDate(formData.returnDate), margin, y);
    doc.text("Ne(e) le " + formatDate(formData.birthDate), col2X, y);
    y += 5;
    doc.text("Cout voyage : " + formData.tripPrice + " EUR  (" + fmtXpf(Number(formData.tripPrice || 0)) + ")", margin, y);
    doc.text(formData.email, col2X, y);
    y += 5;
    if (formData.phone) {
      doc.text(formData.phone, col2X, y);
      y += 5;
    }
    y += 6;

    doc.setDrawColor(...grayBrd);
    doc.setLineWidth(0.3);
    doc.line(margin, y, xR, y);
    y += 8;

    // Voyageurs supplémentaires
    if (formData.additionalTravelers.length > 0) {
      doc.setTextColor(...purple);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("VOYAGEURS SUPPLEMENTAIRES", margin, y);
      y += 5;
      formData.additionalTravelers.forEach((t, i) => {
        doc.setTextColor(...grayDk);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text((i + 1) + ".  " + t.firstName + " " + t.lastName + "  —  ne(e) le " + formatDate(t.birthDate), margin, y);
        y += 5;
      });
      y += 4;
      doc.setDrawColor(...grayBrd);
      doc.setLineWidth(0.3);
      doc.line(margin, y, xR, y);
      y += 8;
    }

    // Options
    doc.setTextColor(...purple);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("OPTIONS SOUSCRITES", margin, y);
    y += 5;
    if (formData.selectedOptions.length > 0) {
      formData.selectedOptions.forEach((id) => {
        doc.setTextColor(...grayDk);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("•  " + getOptionLabel(id), margin, y);
        y += 5;
      });
    } else {
      doc.setTextColor(...grayMd);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("Aucune option selectionnee", margin, y);
      y += 5;
    }
    y += 6;

    doc.setDrawColor(...grayBrd);
    doc.setLineWidth(0.3);
    doc.line(margin, y, xR, y);
    y += 8;

    // Tableau montants
    doc.setTextColor(...purple);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("DETAIL DES MONTANTS", margin, y);
    y += 6;

    const colEur = xR - 52;
    const colXpf = xR - 2;

    // En-tête tableau
    doc.setFillColor(...grayLt);
    doc.rect(margin, y, colW, 7, "F");
    doc.setDrawColor(...grayBrd);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, colW, 7, "S");
    doc.setTextColor(...grayMd);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("Description", margin + 3, y + 4.5);
    doc.text("Montant EUR", colEur, y + 4.5, { align: "right" });
    doc.text("Montant XPF", colXpf, y + 4.5, { align: "right" });
    y += 7;

    // Ligne 1 : Prime AVA
    doc.setDrawColor(...grayBrd);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, colW, 7, "S");
    doc.setTextColor(...grayDk);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Prime d'assurance AVA (" + productLabelPdf + ")", margin + 3, y + 4.5);
    doc.setFont("helvetica", "bold");
    doc.text(fmtEur(premiumEur), colEur, y + 4.5, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grayMd);
    doc.text(fmtXpf(premiumEur), colXpf, y + 4.5, { align: "right" });
    y += 7;

    // Ligne 2 : Frais
    doc.setDrawColor(...grayBrd);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, colW, 7, "S");
    doc.setTextColor(...grayDk);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Frais de distribution FENUASIM", margin + 3, y + 4.5);
    doc.setFont("helvetica", "bold");
    doc.text(fmtEur(FRAIS), colEur, y + 4.5, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grayMd);
    doc.text(fmtXpf(FRAIS), colXpf, y + 4.5, { align: "right" });
    y += 7;

    // Ligne Total
    doc.setDrawColor(...grayBrd);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, colW, 9, "S");
    doc.setTextColor(...purple);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Total TTC", margin + 3, y + 5.5);
    doc.text(fmtEur(totalEur), colEur, y + 5.5, { align: "right" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grayMd);
    doc.text(fmtXpf(totalEur), colXpf, y + 5.5, { align: "right" });
    y += 14;

    doc.setTextColor(...grayMd);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "italic");
    doc.text("Taux de conversion : 1 EUR = 119,33 XPF (taux fixe Institut d'emission d'Outre-Mer)", margin, y);
    y += 10;

    // Mentions légales
    doc.setDrawColor(...grayBrd);
    doc.setLineWidth(0.3);
    doc.line(margin, y, xR, y);
    y += 6;

    doc.setTextColor(...purple);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("MENTIONS LEGALES", margin, y);
    y += 5;
    doc.setTextColor(...grayMd);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    const mentions = [
      "Ce document est un devis non contractuel etabli sur la base des informations fournies.",
      `L'assurance ${productLabelPdf} est distribuee par FENUASIM, mandataire d'ANSET ASSURANCES.`,
      "ANSET ASSURANCES - 5 avenue du Prince Hinoi, 98713 Papeete - Polynesie francaise — N° RUIA PF 26 010.",
      "FENUASIM - N° RUIA PF 26 012 - Mandataire d'intermediaire d'assurance.",
      "La souscription definitive est conditionnee au paiement et a la validation du contrat.",
    ];
    mentions.forEach((line) => { doc.text(line, margin, y); y += 4; });

    // Pied de page
    doc.setDrawColor(...grayBrd);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 16, xR, pageH - 16);
    doc.setTextColor(...grayMd);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("FENUA SIM — SASU — Capital social 500 EUR — 943 713 875 RCS Paris", margin, pageH - 10);
    doc.text("www.fenuasim.com  |  contact@fenuasim.com", margin, pageH - 6);
    doc.setTextColor(...purple);
    doc.setFont("helvetica", "bold");
    doc.text("Page 1 / 1", xR, pageH - 8, { align: "right" });

    doc.save("Devis-Assurance-FENUASIM-" + format(new Date(), "ddMMyyyy") + ".pdf");
  };

  const isCarteSante = (productType ?? formData.productType) === "ava_carte_sante";
  const docs = isCarteSante
    ? [
        { name: "IPID – Carte Santé", file: "/documents/IPID-CARTE-SANTE.pdf", icon: "📄" },
        { name: "Conditions Générales (CG)", file: "/documents/CG-AVA-CARTE-SANTE.pdf", icon: "📄" },
      ]
    : [
        { name: "IPID – Tourist Card", file: "/documents/IPID-TOURIST-CARD.pdf", icon: "📄" },
        { name: "Conditions Générales (CG)", file: "/documents/CG-AVA-TOURIST-CARD.pdf", icon: "📄" },
      ];

  const productLabelUI = getProductLabel(productType ?? formData.productType);
  const premiumEur = quote ? quote.premium : 0;
  const totalEur = premiumEur + FRAIS_DISTRIB_EUR;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Récapitulatif</h2>
        <p className="text-muted-foreground text-sm">Vérifiez vos informations avant de payer.</p>
        <span className="inline-block mt-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1 rounded-full">
          {productLabelUI}
        </span>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-4">

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

        <div className="pb-4 border-b border-gray-200">
          <span className="block text-xs text-gray-500 uppercase font-semibold mb-2">Documents contractuels</span>
          <div className="flex flex-col gap-2">
            {docs.map((doc, idx) => (
              <a key={idx} href={doc.file} target="_blank" rel="noopener noreferrer"
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                <span className="mr-2 text-lg">{doc.icon}</span>
                {doc.name}
                <span className="ml-1 text-xs text-gray-400">(PDF)</span>
              </a>
            ))}
          </div>
        </div>

        <div className="rounded-lg overflow-hidden border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary text-white">
                <th className="text-left px-3 py-2 font-semibold">Description</th>
                <th className="text-right px-3 py-2 font-semibold">EUR</th>
                <th className="text-right px-3 py-2 font-semibold">XPF</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingQuote ? (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-primary italic animate-pulse">
                    Calcul en cours...
                  </td>
                </tr>
              ) : (
                <>
                  <tr className="bg-gray-50">
                    <td className="px-3 py-2 text-gray-700">Prime d&apos;assurance AVA</td>
                    <td className="px-3 py-2 text-right text-gray-900 font-medium">
                      {quote ? `${quote.premium.toFixed(2)} €` : "-- €"}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-500 text-xs">
                      {quote ? `${toXPF(quote.premium)} XPF` : "--"}
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="px-3 py-2 text-gray-700">Frais de distribution FENUASIM</td>
                    <td className="px-3 py-2 text-right text-gray-900 font-medium">10.00 €</td>
                    <td className="px-3 py-2 text-right text-gray-500 text-xs">{toXPF(10)} XPF</td>
                  </tr>
                  <tr className="bg-primary text-white">
                    <td className="px-3 py-3 font-bold text-base">Total TTC</td>
                    <td className="px-3 py-3 text-right font-bold text-lg">
                      {quote ? `${totalEur.toFixed(2)} €` : "-- €"}
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-sm">
                      {quote ? `${toXPF(totalEur)} XPF` : "--"}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {quote && (
        <button onClick={downloadDevis}
          className="w-full flex items-center justify-center gap-2 border border-primary text-primary hover:bg-primary/5 font-medium py-3 px-4 rounded-lg transition-colors">
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