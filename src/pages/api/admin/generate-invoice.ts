// ============================================================
// FENUA SIM – API Génération Devis / Facture PDF
// Format fidèle au style Odoo FENUA SIM
// src/pages/api/admin/generate-invoice.ts
// ============================================================

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { jsPDF } from "jspdf";


// Logo FENUA SIM encodé en base64
const LOGO_B64 = "iVBORw0KGgoAAAANSUhEUgAAAZAAAAGQCAIAAAAP3aGbAAAu6ElEQVR42u3dd3Rc130n8N/vvjYNAFEI9l7EIomULVkuilzkltiKa1xir205Rdl1cjbZ3SSbXryxN85JdhPHXsd27MRNcuLuuEmusmRJJEWKEhvYCZIgCaJj2pv37v3tH/OmYgBiQEAEqO/nvKNjwph5M4N533fv7913L4sIAQAsBAofAQAgsAAAEFgAgMACAEBgAQAgsAAAgQUAgMACAEBgAQACCwAAgQUAgMACAAQWAAACCwAAgQUACCwAAAQWAAACCwAQWAAACCwAAAQWACCwAAAQWAAACCwAQGABACCwAAAQWACAwAIAQGABAAILAACBBQCAwAIABBYAAAILAACBBQAILAAABBYAAAILABBYAAAILAAABBYAILAAABBYAAAILABAYAEAILAAABBYAIDAAgBAYAEAILAAAIEFAIDAAgBAYAEAAgsAAIEFAIDAAgAEFgAAAgsAEFgAAAgsAAAEFgAgsAAAEFgAAAgsAEBgAQAgsAAAEFgAgMACAEBgAQAgsAAAgQUAgMACAEBgAQACCwAAgQUAgMACAAQWAAACCwAAgQUACCwAAAQWAAACCwAQWAAACCwAAAQWACCwAAAQWACAwAIAQGABACCwAACBBQCAwAIAQGABAAILAACBBQCAwAIABBYAAAILAACBBQAILAAABBYAAAILABBYAAAILAAABBYAILAAABBYAAAILABAYAEAILAAABBYAIDAAgBAYAEAILAAAIEFAIDAAgAEFgAAAgsAAIEFAAgsAAAEFgAAAgsAEFgAAAgsAAAEFgAgsAAAEFgAAAgsAEBgAQAgsAAAEFgAgMACAEBgAQAgsAAAgQUAgMACAEBgAQACCwAAgQUAgMACAAQWAAACCwAAgQUACCwAAAQWACCwAAAQWAAACCwAQGABACCwAAAQWACAwAIAQGABACCwAACBBQCAwAIAQGABAAILAACBBQCAwAIABBYAAAILAACBBQAILAAABBYAAAILABY0Gx8BwCwREiKRhfFimYiZiBfWR8yyUD5fgPmbVIaESC3A/orRxIp4wcQWWlgAVxNVQkTEipik4MvgZUmPixiubnY1bItN/CdP+ms8xWNZJm3uTfFYVpRaxJ0ryXaIiIxZKGmLwAK4irRiJiJ98ljw6E/CE0dk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";

const CO = {
  name:    "FENUA SIM",
  legal:   "FENUA SIM - SASU",
  address: "58 RUE MONCEAU",
  city:    "75008 PARIS",
  country: "France",
  siret:   "943 713 875 RCS Paris",
  capital: "Capital social de 500€",
  email:   "contact@fenuasim.com",
  site:    "https://www.fenuasim.com",
  iban:    "FR76 4061 8804 7600 0405 1858 605",
  bic:     "BOUS FRPP XXX",
  rib:     "40618 80476 00040518586 05",
};

async function nextNumber(type: "devis" | "facture"): Promise<string> {
  const year   = new Date().getFullYear();
  const prefix = type === "devis" ? "D" : "F";
  const key    = `${prefix}_${year}_counter`;
  try {
    const { data, error } = await supabase.rpc("increment_counter", { counter_key: key });
    if (!error && data) return `${prefix}-${year}-${String(data).padStart(4, "0")}`;
  } catch {}
  return `${prefix}-${year}-${Date.now().toString().slice(-4)}`;
}

interface PDFLine {
  description:  string;
  qty:          number;
  unite:        string;
  prixUnitaire: number;
  montant:      number;
  currency:     string;
}

interface PDFData {
  docType:       "devis" | "facture";
  docNumber:     string;
  date:          string;
  echeance:      string;
  vendeur:       string;
  clientName:    string;
  clientAddress: string;
  clientCity:    string;
  clientCountry: string;
  lines:         PDFLine[];
  notes?:        string;
}

function fmtMnt(n: number, currency: string): string {
  if (currency === "XPF" || currency === "FCFP") {
    // Pas de toLocaleString pour éviter les espaces insécables mal rendus par jsPDF
    const rounded = Math.round(n);
    const str = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return `${str} XPF`;
  }
  return `${n.toFixed(2).replace(".", ",")} EUR`;
}

function buildPDF(d: PDFData): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W   = 210;
  const MAR = 15;

  const VIOLET = [160, 32, 240]  as [number,number,number];
  const DARK   = [30,  30,  40]  as [number,number,number];
  const GRAY   = [120, 120, 130] as [number,number,number];
  const LGRAY  = [248, 248, 250] as [number,number,number];
  const WHITE  = [255, 255, 255] as [number,number,number];
  const LINE   = [220, 220, 225] as [number,number,number];

  // Logo FENUA SIM (image réelle)
  try {
    doc.addImage(LOGO_B64, "PNG", MAR, 8, 28, 28);
  } catch {
    // Fallback texte si image échoue
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...VIOLET);
    doc.text("FENUA SIM", MAR, 20);
  }

  // Adresse société en haut à droite
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(CO.name,    W - MAR, 10, { align: "right" });
  doc.text(CO.address, W - MAR, 15, { align: "right" });
  doc.text(CO.city,    W - MAR, 20, { align: "right" });
  doc.text(CO.country, W - MAR, 25, { align: "right" });

  // Titre Devis/Facture
  const titre = d.docType === "devis" ? "Devis" : "Facture";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...VIOLET);
  doc.text(`${titre} # ${d.docNumber}`, W - MAR, 44, { align: "right" });

  // Séparateur
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(MAR, 49, W - MAR, 49);

  // Bloc client
  let y = 60;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(d.clientName, MAR, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  if (d.clientAddress) { y += 5; doc.text(d.clientAddress, MAR, y); }
  if (d.clientCity)    { y += 5; doc.text(d.clientCity,    MAR, y); }
  if (d.clientCountry) { y += 5; doc.text(d.clientCountry, MAR, y); }

  // Méta date/échéance/vendeur
  const metaY = 57;
  const col1  = 80, col2 = 130, col3 = 160;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...VIOLET);
  const lbl = d.docType === "devis" ? "Date du devis" : "Date de la facture";
  doc.text(lbl,        col1, metaY);
  doc.text("Echéance", col2, metaY);
  doc.text("Vendeur",  col3, metaY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(d.date,     col1, metaY + 6);
  doc.text(d.echeance, col2, metaY + 6);
  doc.text(d.vendeur,  col3, metaY + 6);

  // Tableau
  let tY = Math.max(y + 6, 80);

  // En-tête tableau
  doc.setFillColor(...LGRAY);
  doc.rect(MAR, tY, W - MAR * 2, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text("Description",   MAR + 2, tY + 5.2);
  doc.text("Quantite",      125,     tY + 5.2);
  doc.text("Prix unitaire", 152,     tY + 5.2);
  doc.text("Montant",       W - MAR, tY + 5.2, { align: "right" });
  tY += 8;

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.line(MAR, tY, W - MAR, tY);

  // Lignes
  for (const line of d.lines) {
    const cur = line.currency;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(line.description, MAR + 2, tY + 7);
    doc.setTextColor(...GRAY);
    doc.text(`${line.qty.toFixed(2)} ${line.unite}`, 125, tY + 7);
    doc.text(fmtMnt(line.prixUnitaire, cur),          152, tY + 7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(fmtMnt(line.montant, cur), W - MAR, tY + 7, { align: "right" });
    tY += 10;
    doc.setDrawColor(...LINE);
    doc.line(MAR, tY, W - MAR, tY);
  }

  // RIB
  tY += 5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text(`RIB : ${CO.rib} / IBAN : ${CO.iban} /BIC : ${CO.bic}`, MAR, tY);

  // Total
  tY += 8;
  const total = d.lines.reduce((s, l) => s + l.montant, 0);
  const cur   = d.lines[0]?.currency ?? "EUR";
  doc.setDrawColor(...VIOLET);
  doc.setLineWidth(0.3);
  doc.line(MAR, tY, W - MAR, tY);
  tY += 1;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...VIOLET);
  doc.text("Total", W / 2, tY + 6.5, { align: "center" });
  doc.text(fmtMnt(total, cur), W - MAR, tY + 6.5, { align: "right" });
  doc.setLineWidth(0.3);
  doc.line(MAR, tY + 10, W - MAR, tY + 10);

  // Conditions
  tY += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(`Conditions generales : ${CO.site}`, MAR, tY);
  if (d.notes) { tY += 5; doc.text(d.notes, MAR, tY); }

  // Pied de page
  const footY = 287;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.line(MAR, footY - 5, W - MAR, footY - 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text(
    `${CO.legal} ${CO.capital} - ${CO.siret} . Email : ${CO.email} Site : ${CO.site}`,
    W / 2, footY - 1, { align: "center" }
  );
  doc.text("Page 1 / 1", W - MAR, footY - 1, { align: "right" });

  return Buffer.from(doc.output("arraybuffer"));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Mode direct (depuis la page admin devis)
  if (req.body.mode === "direct") {
    try {
      const data = req.body as PDFData & { mode: string };
      // Valider les champs requis
      if (!data.docType) data.docType = "devis";
      if (!data.docNumber || data.docNumber === "") {
        data.docNumber = await nextNumber(data.docType);
      }
      if (!data.lines || data.lines.length === 0) {
        return res.status(400).json({ error: "Au moins une ligne est requise" });
      }
      const pdfBuf = buildPDF(data);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${data.docNumber}.pdf"`);
      return res.send(pdfBuf);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Mode depuis commande existante
  const { orderId, rentalId, type, docType } = req.body;
  if (!orderId && !rentalId) return res.status(400).json({ error: "orderId ou rentalId requis" });

  const invoiceType: "esim" | "router_rental" = type ?? (rentalId ? "router_rental" : "esim");
  const docKind: "devis" | "facture"          = docType ?? "facture";

  try {
    const docNumber = await nextNumber(docKind);
    const echeance  = new Date(Date.now() + 30 * 86400000).toLocaleDateString("fr-FR");
    let pdfData: PDFData;

    if (invoiceType === "esim" && orderId) {
      const { data: order, error } = await supabase
        .from("orders")
        .select("id, email, prenom, nom, first_name, last_name, package_name, price, currency, stripe_session_id, created_at")
        .eq("id", orderId).single();
      if (error || !order) return res.status(404).json({ error: "Commande introuvable" });

      const customerName = [order.prenom || order.first_name, order.nom || order.last_name].filter(Boolean).join(" ") || order.email;
      const price   = Number(order.price ?? 0);
      const cur     = ((order.currency || "EUR").toUpperCase() === "XPF" && price >= 200) ? "XPF" : "EUR";
      const amount  = cur === "XPF" ? price : (price < 200 ? price : price / 119.33);

      pdfData = {
        docType: docKind, docNumber,
        date: new Date(order.created_at).toLocaleDateString("fr-FR"),
        echeance, vendeur: "Support FENUA SIM",
        clientName: customerName, clientAddress: "", clientCity: "", clientCountry: "",
        lines: [{ description: order.package_name ?? "eSIM", qty: 1, unite: "Unite(s)", prixUnitaire: amount, montant: amount, currency: cur }],
      };
    } else if (invoiceType === "router_rental" && rentalId) {
      const { data: rental, error } = await supabase
        .from("router_rentals")
        .select("id, customer_email, customer_name, rental_start, rental_end, rental_days, price_per_day, rental_amount, deposit_amount, currency, created_at, router_id")
        .eq("id", rentalId).single();
      if (error || !rental) return res.status(404).json({ error: "Location introuvable" });

      const { data: router } = await supabase.from("routers").select("model").eq("id", rental.router_id).maybeSingle();
      const ppd  = Number(rental.price_per_day ?? 5);
      const days = Number(rental.rental_days ?? 1);
      const amt  = Number(rental.rental_amount ?? ppd * days);
      const start = rental.rental_start ? new Date(rental.rental_start).toLocaleDateString("fr-FR") : "";
      const end   = rental.rental_end   ? new Date(rental.rental_end).toLocaleDateString("fr-FR")   : "";

      pdfData = {
        docType: docKind, docNumber,
        date: new Date(rental.created_at).toLocaleDateString("fr-FR"),
        echeance, vendeur: "Support FENUA SIM",
        clientName: rental.customer_name || rental.customer_email, clientAddress: "", clientCity: "", clientCountry: "",
        lines: [{ description: `Location routeur ${router?.model ?? ""} - ${start} au ${end} (${days} jours)`, qty: days, unite: "Jour(s)", prixUnitaire: ppd, montant: amt, currency: "EUR" }],
        notes: rental.deposit_amount ? `Caution versee : ${Number(rental.deposit_amount).toFixed(2)} EUR - Remboursable au retour en bon etat.` : undefined,
      };
    } else {
      return res.status(400).json({ error: "Type invalide" });
    }

    const pdfBuffer = buildPDF(pdfData);
    if (docKind === "facture") {
      await supabase.from("invoices").insert({
        invoice_number: docNumber, order_id: orderId ?? null, rental_id: rentalId ?? null,
        invoice_type: invoiceType, customer_email: pdfData.clientName,
        amount: pdfData.lines[0]?.montant ?? 0, currency: pdfData.lines[0]?.currency ?? "EUR",
        product_name: pdfData.lines[0]?.description ?? "", pdf_generated_at: new Date().toISOString(), email_sent: false,
      }).select("id").single();
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${docNumber}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? "Erreur serveur" });
  }
}
