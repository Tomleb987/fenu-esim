// ============================================================
// FENUA SIM – API Route : Bordereau ANSET PDF
// src/pages/api/admin/anset-bordereau.ts
//
// POST { period: "2026-03" }
// → Génère et télécharge le bordereau PDF du mois
// ============================================================

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { jsPDF } from "jspdf";

// ── Constantes ────────────────────────────────────────────────
const COMPANY = {
  legal:    "SAS FENUASIM",
  address1: "XX Rue XXXX",       // ← À compléter
  address2: "75000 Paris",
  siret:    "XXX XXX XXX XXXXX", // ← À compléter
  email:    "contact@fenuasim.com",
};

const ASSUREUR = {
  name:    "ANSET",
  address: "À compléter",
};

const G_VIOLET = [160, 32, 240] as [number, number, number];
const DARK     = [26, 5, 51]   as [number, number, number];
const GRAY     = [107, 114, 128] as [number, number, number];
const LGRAY    = [245, 247, 250] as [number, number, number];
const WHITE    = [255, 255, 255] as [number, number, number];
const GREEN    = [5, 150, 105]  as [number, number, number];

// ── Handler ───────────────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { period } = req.body as { period: string };
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return res.status(400).json({ error: "period requis (ex: 2026-03)" });
  }

  const [year, month] = period.split("-").map(Number);
  const periodStart = `${period}-01`;
  const periodEnd   = new Date(year, month, 0).toISOString().slice(0, 10);

  // ── Récupérer les contrats du mois ──
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

  // ── Calculs ──
  const totalPremium    = contracts.reduce((s, c) => s + (c.premium_ava ?? 0), 0);
  const totalFees       = contracts.reduce((s, c) => s + (c.frais_distribution ?? 0), 0);
  const totalToTransfer = contracts.reduce((s, c) => s + (c.amount_to_transfer ?? ((c.premium_ava ?? 0) - (c.frais_distribution ?? 0))), 0);

  const MONTH_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const periodLabel = `${MONTH_FR[month - 1]} ${year}`;
  const today = new Date().toLocaleDateString("fr-FR");
  const fmtEur = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

  // ── Génération PDF ──
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const W = 210;
  let y = 0;

  // En-tête violet
  doc.setFillColor(...G_VIOLET);
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

  // Bloc émetteur / destinataire
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

  // Ligne séparatrice
  doc.setDrawColor(230, 225, 255);
  doc.setLineWidth(0.5);
  doc.line(14, y, W - 14, y);

  y += 8;

  // Récapitulatif financier
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(`Période : ${periodLabel}  ·  ${contracts.length} contrat${contracts.length > 1 ? "s" : ""}`, 14, y);

  y += 8;

  // 3 boîtes résumé
  const boxW = (W - 28 - 8) / 3;
  const boxes = [
    { label: "Total primes encaissées", value: fmtEur(totalPremium), sub: "Encaissé pour compte ANSET" },
    { label: "Frais de distribution", value: fmtEur(totalFees), sub: "CA Fenua Sim (conservé)" },
    { label: "Montant à reverser", value: fmtEur(totalToTransfer), sub: "À virer à ANSET", highlight: true },
  ];

  boxes.forEach((box, i) => {
    const bx = 14 + i * (boxW + 4);
    if (box.highlight) {
      doc.setFillColor(...G_VIOLET);
    } else {
      doc.setFillColor(...LGRAY);
    }
    doc.rect(bx, y, boxW, 18, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    if (box.highlight) doc.setTextColor(220, 200, 255);
    else doc.setTextColor(...GRAY);
    doc.text(box.label.toUpperCase(), bx + 3, y + 5);

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

  const cols = [
    { label: "Date",       x: 16,  w: 20 },
    { label: "Assuré",     x: 37,  w: 45 },
    { label: "N° adhésion",x: 83,  w: 35 },
    { label: "Produit",    x: 119, w: 35 },
    { label: "Prime",      x: 155, w: 22, right: true },
    { label: "À reverser", x: 178, w: 18, right: true },
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  cols.forEach(col => {
    doc.text(col.label, col.right ? col.x + col.w : col.x, y + 4.5, { align: col.right ? "right" : "left" });
  });

  y += 7;

  // Lignes contrats
  contracts.forEach((c, idx) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    if (idx % 2 === 0) {
      doc.setFillColor(250, 248, 255);
      doc.rect(14, y, W - 28, 6.5, "F");
    }

    const date    = new Date(c.created_at).toLocaleDateString("fr-FR");
    const name    = `${c.subscriber_first_name ?? ""} ${c.subscriber_last_name ?? ""}`.trim() || c.user_email || "-";
    const adhesion = c.adhesion_number ?? "-";
    const product  = (c.product_type ?? "-").slice(0, 18);
    const premium  = fmtEur(c.premium_ava ?? 0);
    const toTransfer = fmtEur(c.amount_to_transfer ?? ((c.premium_ava ?? 0) - (c.frais_distribution ?? 0)));

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...DARK);

    doc.text(date,       16,       y + 4.2);
    doc.text(name.slice(0, 22),    37,  y + 4.2);
    doc.text(adhesion.slice(0, 16), 83, y + 4.2);
    doc.text(product,    119,      y + 4.2);

    doc.setFont("helvetica", "normal");
    doc.text(premium,    177, y + 4.2, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...G_VIOLET);
    doc.text(toTransfer, W - 16, y + 4.2, { align: "right" });

    y += 6.5;
  });

  // Ligne total
  y += 2;
  doc.setDrawColor(...G_VIOLET);
  doc.setLineWidth(0.5);
  doc.line(14, y, W - 14, y);
  y += 5;

  doc.setFillColor(...G_VIOLET);
  doc.rect(W - 70, y - 4, 56, 10, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text("TOTAL À REVERSER :", W - 72, y + 2.5, { align: "right" });

  doc.setTextColor(...WHITE);
  doc.text(fmtEur(totalToTransfer), W - 16, y + 2.5, { align: "right" });

  y += 16;

  // Note bas de page
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

  // ── Réponse PDF ──
  const pdfBytes = Buffer.from(doc.output("arraybuffer"));
  const filename = `bordereau-anset-${period}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(pdfBytes);
}
