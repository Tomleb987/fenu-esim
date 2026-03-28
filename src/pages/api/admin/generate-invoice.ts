// ============================================================
// FENUA SIM – API Génération Devis / Facture PDF
// Format fidèle au style Odoo FENUA SIM
// src/pages/api/admin/generate-invoice.ts
// ============================================================

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { jsPDF } from "jspdf";

const CO = {
  name:    "FENUA SIM",
  legal:   "FENUA SIM - SASU",
  address: "58 RUE MONCEAU",
  city:    "75008 PARIS",
  country: "France",
  siret:   "943 713 875 RCS Paris",
  capital: "Capital social de 500 EUR",
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
  if (currency === "XPF" || currency === "FCFP") return `${Math.round(n).toLocaleString("fr-FR")} XPF`;
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

  // Logo FENUA.SIM
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...VIOLET);
  doc.text("FENUA", MAR, 18);
  doc.setTextColor(...DARK);
  doc.setFontSize(14);
  doc.text(" o ", MAR + 21, 18);
  doc.setTextColor(...VIOLET);
  doc.setFontSize(16);
  doc.text("SIM", MAR + 28, 18);

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
