// ============================================================
// FENUA SIM – API Route : Bordereau ANSET PDF
// src/pages/api/admin/anset-bordereau.ts
// POST { period: "2026-03" }
// ============================================================

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

const COMPANY = {
  legal:    "SAS FENUASIM",
  address1: "58 rue Monceau",
  address2: "75000 Paris",
  siret:    "943 713 875 ",
  ruia :    " PF26 010",
  email:    "contact@fenuasim.com",
};

const ASSUREUR = { name: "ANSET", address: "À compléter" };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { period } = req.body as { period: string };
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return res.status(400).json({ error: "period requis (ex: 2026-03)" });
  }

  const [year, month] = period.split("-").map(Number);
  const periodStart = `${period}-01`;
  const periodEnd   = new Date(year, month, 0).toISOString().slice(0, 10);

  const { data: contracts, error } = await supabase
    .from("insurances")
    .select(`
      id, created_at,
      subscriber_first_name, subscriber_last_name,
      user_email, adhesion_number, product_type,
      premium_ava, frais_distribution, amount_to_transfer,
      transfer_status, start_date, end_date
    `)
    .gte("created_at", `${periodStart}T00:00:00`)
    .lte("created_at", `${periodEnd}T23:59:59`)
    .in("status", ["paid", "validated"])
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  if (!contracts || contracts.length === 0) {
    return res.status(404).json({ error: "Aucun contrat trouvé pour cette période" });
  }

  const totalPremium    = contracts.reduce((s, c) => s + (c.premium_ava ?? 0), 0);
  const totalFees       = contracts.reduce((s, c) => s + (c.frais_distribution ?? 0), 0);
  // Formule : (premium_ava - frais_distribution) × 0.90
  // prime_nette = premium_ava - frais_distribution
  // commission_fenua = prime_nette × 10%
  // amount_to_transfer = prime_nette × 0.90
  const calcTransfer = (c: any) => {
    const primeNette = (c.premium_ava ?? 0) - (c.frais_distribution ?? 0);
    return c.amount_to_transfer ?? (primeNette * 0.90);
  };
  const totalToTransfer = contracts.reduce((s, c) => s + calcTransfer(c), 0);

  const MONTH_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const periodLabel = `${MONTH_FR[month - 1]} ${year}`;
  const today = new Date().toLocaleDateString("fr-FR");
  const fmtEur = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

  try {
    // Import dynamique pour éviter les erreurs SSR avec jsPDF
    const { jsPDF } = await import("jspdf");

    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const W = 210;
    let y = 0;

    const VIOLET: [number, number, number] = [160, 32, 240];
    const DARK:   [number, number, number] = [26, 5, 51];
    const GRAY:   [number, number, number] = [107, 114, 128];
    const LGRAY:  [number, number, number] = [245, 247, 250];
    const WHITE:  [number, number, number] = [255, 255, 255];

    // En-tête
    doc.setFillColor(...VIOLET);
    doc.rect(0, 0, W, 30, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...WHITE);
    doc.text("FENUASIM", 14, 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(220, 200, 255);
    doc.text("eSIM · Assurance · Routeurs", 14, 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...WHITE);
    doc.text("BORDEREAU DE REVERSEMENT", W - 14, 13, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(220, 200, 255);
    doc.text(`ANSET · ${periodLabel}`, W - 14, 20, { align: "right" });

    y = 38;

    // Blocs émetteur / destinataire / date
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("ÉMETTEUR", 14, y);
    doc.text("DESTINATAIRE", 110, y);
    doc.text("DATE", W - 50, y);

    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(COMPANY.legal, 14, y);
    doc.text(ASSUREUR.name, 110, y);
    doc.text(today, W - 50, y);

    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(COMPANY.address1, 14, y);
    doc.text(ASSUREUR.address, 110, y);

    y += 4;
    doc.text(COMPANY.address2, 14, y);
    y += 4;
    doc.text(`SIRET : ${COMPANY.siret}`, 14, y);

    y += 10;
    doc.setDrawColor(230, 225, 255);
    doc.setLineWidth(0.5);
    doc.line(14, y, W - 14, y);
    y += 8;

    // Période
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(`Période : ${periodLabel}  ·  ${contracts.length} contrat${contracts.length > 1 ? "s" : ""}`, 14, y);
    y += 8;

    // 3 boîtes résumé
    const boxW = (W - 28 - 8) / 3;
    const boxes = [
      { label: "PRIMES ENCAISSÉES", value: fmtEur(totalPremium), sub: "Pour compte ANSET", highlight: false },
      { label: "FRAIS DISTRIBUTION", value: fmtEur(totalFees), sub: "CA Fenua Sim conservé", highlight: false },
      { label: "MONTANT À REVERSER", value: fmtEur(totalToTransfer), sub: "À virer à ANSET", highlight: true },
    ];

    boxes.forEach((box, i) => {
      const bx = 14 + i * (boxW + 4);
      if (box.highlight) doc.setFillColor(...VIOLET);
      else doc.setFillColor(...LGRAY);
      doc.rect(bx, y, boxW, 18, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      if (box.highlight) doc.setTextColor(220, 200, 255);
      else doc.setTextColor(...GRAY);
      doc.text(box.label, bx + 3, y + 5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      if (box.highlight) doc.setTextColor(...WHITE);
      else doc.setTextColor(...DARK);
      doc.text(box.value, bx + 3, y + 12);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      if (box.highlight) doc.setTextColor(200, 180, 240);
      else doc.setTextColor(...GRAY);
      doc.text(box.sub, bx + 3, y + 17);
    });

    y += 26;

    // Tableau des contrats
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text("DÉTAIL DES CONTRATS", 14, y);
    y += 5;

    // En-tête tableau
    doc.setFillColor(...DARK);
    doc.rect(14, y, W - 28, 7, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    doc.text("Date",        16,       y + 4.5);
    doc.text("Assuré",      37,       y + 4.5);
    doc.text("N° adhésion", 95,       y + 4.5);
    doc.text("Produit",     130,      y + 4.5);
    doc.text("Prime",       177,      y + 4.5, { align: "right" });
    doc.text("À reverser",  W - 16,   y + 4.5, { align: "right" });
    y += 7;

    contracts.forEach((c, idx) => {
      if (y > 260) { doc.addPage(); y = 20; }

      if (idx % 2 === 0) {
        doc.setFillColor(250, 248, 255);
        doc.rect(14, y, W - 28, 6.5, "F");
      }

      const date       = new Date(c.created_at).toLocaleDateString("fr-FR");
      const name       = `${c.subscriber_first_name ?? ""} ${c.subscriber_last_name ?? ""}`.trim() || c.user_email || "-";
      const adhesion   = (c.adhesion_number ?? "-").slice(0, 18);
      const product    = (c.product_type ?? "-").slice(0, 18);
      const premium    = fmtEur(c.premium_ava ?? 0);
      const primeNette = (c.premium_ava ?? 0) - (c.frais_distribution ?? 0);
      const toTransfer = fmtEur(c.amount_to_transfer ?? (primeNette * 0.90));

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...DARK);
      doc.text(date,              16,       y + 4.2);
      doc.text(name.slice(0, 25), 37,       y + 4.2);
      doc.text(adhesion,          95,       y + 4.2);
      doc.text(product,           130,      y + 4.2);
      doc.text(premium,           177,      y + 4.2, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...VIOLET);
      doc.text(toTransfer,        W - 16,   y + 4.2, { align: "right" });
      y += 6.5;
    });

    // Total
    y += 2;
    doc.setDrawColor(...VIOLET);
    doc.setLineWidth(0.5);
    doc.line(14, y, W - 14, y);
    y += 5;

    doc.setFillColor(...VIOLET);
    doc.rect(W - 72, y - 4, 58, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text("TOTAL À REVERSER :", W - 74, y + 2.5, { align: "right" });
    doc.setTextColor(...WHITE);
    doc.text(fmtEur(totalToTransfer), W - 16, y + 2.5, { align: "right" });

    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text("Ce bordereau récapitule les primes d'assurance encaissées pour le compte d'ANSET.", 14, y);
    y += 4;
    doc.text(`Le montant de ${fmtEur(totalToTransfer)} doit être viré à ANSET dans les délais contractuels.`, 14, y);

    // Pied de page
    const footerY = 287;
    doc.setDrawColor(230, 225, 255);
    doc.setLineWidth(0.3);
    doc.line(14, footerY - 4, W - 14, footerY - 4);
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(`${COMPANY.legal}  ·  SIRET ${COMPANY.siret}  ·  ${COMPANY.email}`, W / 2, footerY, { align: "center" });

    const pdfBytes = Buffer.from(doc.output("arraybuffer"));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="bordereau-anset-${period}.pdf"`);
    return res.send(pdfBytes);

  } catch (err: any) {
    console.error("anset-bordereau error:", err);
    return res.status(500).json({ error: err.message ?? "Erreur génération PDF" });
  }
}
