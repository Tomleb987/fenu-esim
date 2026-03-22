// ============================================================
// FENUA SIM – API Route : Génération facture PDF
// Fichier : src/pages/api/admin/generate-invoice.ts
//
// Utilise jspdf (déjà installé dans le projet)
// Appelée automatiquement après paiement eSIM confirmé
// ou manuellement depuis le dashboard
// ============================================================

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { jsPDF } from "jspdf";

// ── Constantes entreprise ────────────────────────────────────
const COMPANY = {
  name: "FENUASIM",
  legal: "SAS FENUASIM",
  address1: "58 RUE MONCEAU",     // ← À compléter
  address2: "75000 Paris",      // ← À compléter
  siret: "943 713 875",  // ← À compléter
  email: "contact@fenuasim.com",
  website: "www.fenuasim.com",
  vat: "TVA non applicable, art. 293 B du CGI",
};

// ── Générateur numéro facture ────────────────────────────────
async function nextInvoiceNumber(): Promise<string> {
  const { data, error } = await supabase.rpc("generate_invoice_number");
  if (error) throw new Error(`Numérotation facture : ${error.message}`);
  return data as string;
}

// ── Génération PDF (jspdf) ───────────────────────────────────
function buildPDF(data: {
  invoiceNumber: string;
  date: string;
  customerEmail: string;
  customerName?: string;
  productName: string;
  destination?: string;
  dataAmount?: string;
  validity?: string;
  amount: number;
  currency: string;
  stripePaymentId?: string;
  type: "esim" | "router_rental";
  // Champs spécifiques location routeur
  routerModel?: string;
  rentalStart?: string;
  rentalEnd?: string;
  rentalDays?: number;
  pricePerDay?: number;
  depositAmount?: number;
}): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const currSymbol = data.currency === "EUR" ? "€" : data.currency;
  const amtStr = `${data.amount.toFixed(2)} ${currSymbol}`;

  // ── Couleurs ──
  const VIOLET = [160, 32, 240] as [number, number, number];
  const DARK   = [26, 5, 51]   as [number, number, number];
  const GRAY   = [107, 114, 128] as [number, number, number];
  const LGRAY  = [245, 247, 250] as [number, number, number];
  const WHITE  = [255, 255, 255] as [number, number, number];

  // ── Header bande dégradée (simulée) ──
  doc.setFillColor(...VIOLET);
  doc.rect(0, 0, W, 28, "F");

  // Nom société
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...WHITE);
  doc.text("FENUASIM", 14, 16);

  // Tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(220, 200, 255);
  doc.text("eSIM · Assurance · Routeurs", 14, 22);

  // Titre FACTURE à droite
  const title = data.type === "esim" ? "FACTURE" : "FACTURE DE LOCATION";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...WHITE);
  doc.text(title, W - 14, 14, { align: "right" });

  // Numéro
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(220, 200, 255);
  doc.text(`N° ${data.invoiceNumber}`, W - 14, 21, { align: "right" });

  // ── Séparateur ──
  let y = 36;

  // ── Bloc émetteur ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text("DE", 14, y);

  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(COMPANY.legal, 14, y);

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(COMPANY.address1, 14, y);
  y += 4;
  doc.text(COMPANY.address2, 14, y);
  y += 4;
  doc.text(`SIRET : ${COMPANY.siret}`, 14, y);
  y += 4;
  doc.text(COMPANY.email, 14, y);

  // ── Bloc destinataire (milieu) ──
  const midX = 80;
  let yy = 36;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text("FACTURÉ À", midX, yy);

  yy += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(data.customerName || "Client", midX, yy);

  yy += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(data.customerEmail, midX, yy);

  // ── Bloc date (droite) ──
  const rightX = 155;
  let yr = 36;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text("DATE", rightX, yr);

  yr += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(data.date, rightX, yr);

  if (data.stripePaymentId) {
    yr += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("RÉFÉRENCE PAIEMENT", rightX, yr);
    yr += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(data.stripePaymentId.slice(0, 22), rightX, yr);
  }

  // ── Tableau produit ──
  y = 78;

  // En-tête tableau
  doc.setFillColor(...DARK);
  doc.rect(14, y, W - 28, 10, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text("DÉSIGNATION", 18, y + 6.5);
  doc.text("DÉTAILS", 100, y + 6.5);
  doc.text("MONTANT", W - 18, y + 6.5, { align: "right" });

  y += 10;

  // Ligne produit
  doc.setFillColor(...LGRAY);
  doc.rect(14, y, W - 28, 16, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(data.productName, 18, y + 7);

  // Détails
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);

  if (data.type === "esim") {
    const details = [
      data.destination ? `Destination : ${data.destination}` : "",
      data.dataAmount   ? `Data : ${data.dataAmount}`         : "",
      data.validity     ? `Validité : ${data.validity}`       : "",
    ].filter(Boolean).join("  ·  ");
    doc.text(details, 100, y + 7);
  } else {
    // Routeur
    doc.text(`${data.rentalStart} → ${data.rentalEnd}`, 100, y + 5);
    doc.text(`${data.rentalDays} jours × ${data.pricePerDay?.toFixed(2)} ${currSymbol}/j`, 100, y + 10);
  }

  // Montant
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(amtStr, W - 18, y + 7, { align: "right" });

  y += 20;

  // Note caution routeur
  if (data.type === "router_rental" && data.depositAmount) {
    doc.setFont("helvetica", "oblique");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(
      `Caution versée : ${data.depositAmount.toFixed(2)} ${currSymbol} — Remboursable au retour en bon état. Non incluse dans cette facture.`,
      14, y
    );
    y += 8;
  }

  // Mention TVA
  doc.setFont("helvetica", "oblique");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(COMPANY.vat, 14, y);

  y += 12;

  // ── Total ──
  doc.setFillColor(...VIOLET);
  doc.rect(W - 14 - 80, y, 80, 14, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...WHITE);
  doc.text(`TOTAL TTC : ${amtStr}`, W - 18, y + 9.5, { align: "right" });

  // ── Pied de page ──
  const footerY = 282;
  doc.setDrawColor(230, 230, 230);
  doc.line(14, footerY - 4, W - 14, footerY - 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text(
    `${COMPANY.legal}  ·  ${COMPANY.address1}, ${COMPANY.address2}  ·  SIRET ${COMPANY.siret}  ·  ${COMPANY.email}`,
    W / 2, footerY, { align: "center" }
  );

  return Buffer.from(doc.output("arraybuffer"));
}

// ── Handler principal ────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { orderId, rentalId, type } = req.body as {
    orderId?: string;
    rentalId?: string;
    type?: "esim" | "router_rental";
  };

  if (!orderId && !rentalId) return res.status(400).json({ error: "orderId ou rentalId requis" });

  const invoiceType: "esim" | "router_rental" = type ?? (rentalId ? "router_rental" : "esim");

  try {
    let pdfData: Parameters<typeof buildPDF>[0];

    if (invoiceType === "esim" && orderId) {
      // ── Récupérer la commande eSIM ──
      const { data: order, error } = await supabase
        .from("orders")
        .select(`
          id, email, prenom, nom, first_name, last_name,
          package_name, price, currency, stripe_session_id, created_at,
          partner_code, promo_code
        `)
        .eq("id", orderId)
        .single();

      if (error || !order) return res.status(404).json({ error: "Commande introuvable" });

      // Récupérer les détails du package
      const { data: pkg } = await supabase
        .from("airalo_packages")
        .select("data_amount, data_unit, validity_days, country, region_fr, region")
        .eq("airalo_id", order.package_id ?? "")
        .maybeSingle();

      const invoiceNumber = await nextInvoiceNumber();
      const dateStr = new Date(order.created_at).toLocaleDateString("fr-FR");
      const customerName = [order.prenom || order.first_name, order.nom || order.last_name].filter(Boolean).join(" ");
      const amount = order.price ?? 0;

      pdfData = {
        invoiceNumber,
        date: dateStr,
        customerEmail: order.email,
        customerName,
        productName: order.package_name ?? "eSIM",
        destination: pkg ? (pkg.country || pkg.region_fr || pkg.region) : undefined,
        dataAmount: pkg ? `${pkg.data_amount} ${pkg.data_unit}` : undefined,
        validity: pkg ? `${pkg.validity_days} jours` : undefined,
        amount,
        currency: order.currency ?? "EUR",
        stripePaymentId: order.stripe_session_id,
        type: "esim",
      };

      const pdfBuffer = buildPDF(pdfData);

      // Sauvegarder la facture en base
      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          order_id: orderId,
          invoice_type: "esim",
          customer_email: order.email,
          customer_name: customerName,
          amount,
          currency: order.currency ?? "EUR",
          product_name: order.package_name,
          pdf_generated_at: new Date().toISOString(),
          email_sent: false,
        })
        .select("id")
        .single();

      if (!invErr && invoice) {
        await supabase.from("orders").update({ invoice_id: invoice.id }).eq("id", orderId);
      }

      // Retourner le PDF
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${invoiceNumber}.pdf"`);
      return res.send(pdfBuffer);
    }

    if (invoiceType === "router_rental" && rentalId) {
      // ── Récupérer la location routeur ──
      const { data: rental, error } = await supabase
        .from("router_rentals")
        .select(`
          id, customer_email, customer_name,
          rental_start, rental_end, rental_days,
          price_per_day, rental_amount, deposit_amount,
          currency, stripe_session_id, created_at,
          router_id
        `)
        .eq("id", rentalId)
        .single();

      if (error || !rental) return res.status(404).json({ error: "Location introuvable" });

      const { data: router } = await supabase
        .from("routers")
        .select("model, serial_number")
        .eq("id", rental.router_id)
        .maybeSingle();

      const invoiceNumber = await nextInvoiceNumber();
      const dateStr = new Date(rental.created_at).toLocaleDateString("fr-FR");

      pdfData = {
        invoiceNumber,
        date: dateStr,
        customerEmail: rental.customer_email,
        customerName: rental.customer_name,
        productName: `Location routeur ${router?.model ?? ""}`,
        amount: rental.rental_amount ?? 0,
        currency: rental.currency ?? "EUR",
        stripePaymentId: rental.stripe_session_id,
        type: "router_rental",
        routerModel: router?.model,
        rentalStart: rental.rental_start
          ? new Date(rental.rental_start).toLocaleDateString("fr-FR") : "",
        rentalEnd: rental.rental_end
          ? new Date(rental.rental_end).toLocaleDateString("fr-FR") : "",
        rentalDays: rental.rental_days,
        pricePerDay: rental.price_per_day,
        depositAmount: rental.deposit_amount,
      };

      const pdfBuffer = buildPDF(pdfData);

      // Sauvegarder la facture
      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          rental_id: rentalId,
          invoice_type: "router_rental",
          customer_email: rental.customer_email,
          customer_name: rental.customer_name,
          amount: rental.rental_amount,
          currency: rental.currency ?? "EUR",
          product_name: `Location routeur ${router?.model ?? ""}`,
          pdf_generated_at: new Date().toISOString(),
          email_sent: false,
        })
        .select("id")
        .single();

      if (!invErr && invoice) {
        await supabase.from("router_rentals").update({ invoice_id: invoice.id }).eq("id", rentalId);
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${invoiceNumber}.pdf"`);
      return res.send(pdfBuffer);
    }

    return res.status(400).json({ error: "Type de facture invalide" });
  } catch (err: any) {
    console.error("generate-invoice error:", err);
    return res.status(500).json({ error: err.message ?? "Erreur serveur" });
  }
}
