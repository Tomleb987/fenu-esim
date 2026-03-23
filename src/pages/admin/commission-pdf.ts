// ============================================================
// FENUA SIM – API : PDF relevé de commission partenaire
// src/pages/api/admin/commission-pdf.ts
// POST { partner_code, period: "2026-03" }
// ============================================================

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { partner_code, period } = req.body as { partner_code: string; period: string };
  if (!partner_code || !period) return res.status(400).json({ error: "partner_code et period requis" });

  const [year, month] = period.split("-").map(Number);
  const periodStart = `${period}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const periodEnd = `${period}-${String(lastDay).padStart(2, "0")}`;

  // Récupérer le partenaire
  const { data: partner } = await supabase
    .from("partner_profiles")
    .select("advisor_name, partner_code, commission_rate, iban, contact_email")
    .eq("partner_code", partner_code)
    .single();

  // Récupérer les commandes du partenaire sur la période
  const { data: orders } = await supabase
    .from("orders")
    .select("id, created_at, package_name, price, currency, commission_amount, email")
    .eq("partner_code", partner_code)
    .gte("created_at", `${periodStart}T00:00:00`)
    .lte("created_at", `${periodEnd}T23:59:59`)
    .in("status", ["completed", "paid"])
    .order("created_at", { ascending: true });

  if (!orders || orders.length === 0) {
    return res.status(404).json({ error: "Aucune commande trouvée pour cette période" });
  }

  const MONTH_FR = ["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];
  const periodLabel = MONTH_FR[month - 1] + " " + year;
  const today = new Date().toLocaleDateString("fr-FR");

  const totalSales = orders.reduce((s, o) => {
    const price = o.currency === "XPF" ? (o.price * 100 / 119.33) : o.price;
    return s + price;
  }, 0);
  const totalCommission = orders.reduce((s, o) => s + (o.commission_amount ?? 0), 0);
  const commissionRate = partner?.commission_rate ? (partner.commission_rate * 100).toFixed(0) + "%" : "-";

  const fmtNum = (n: number): string => {
    const s = Math.round(n * 100) / 100;
    return s.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const fmtEur = (n: number) => fmtNum(n) + " EUR";

  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210;
    const VIOLET: [number, number, number] = [160, 32, 240];
    const DARK:   [number, number, number] = [26, 5, 51];
    const GRAY:   [number, number, number] = [107, 114, 128];
    const WHITE:  [number, number, number] = [255, 255, 255];
    const LGRAY:  [number, number, number] = [245, 247, 250];

    // En-tete
    doc.setFillColor(...VIOLET);
    doc.rect(0, 0, W, 28, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...WHITE);
    doc.text("FENUASIM", 14, 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(220, 200, 255);
    doc.text("eSIM - Assurance - Routeurs", 14, 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...WHITE);
    doc.text("RELEVE DE COMMISSION", W - 14, 12, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(220, 200, 255);
    doc.text(periodLabel + " - " + today, W - 14, 18, { align: "right" });

    let y = 36;

    // Infos partenaire
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("PARTENAIRE", 14, y);
    doc.text("TAUX COMMISSION", 110, y);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text(partner?.advisor_name ?? partner_code, 14, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...VIOLET);
    doc.text(commissionRate, 110, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text("Code : " + partner_code, 14, y);
    y += 10;

    doc.setDrawColor(230, 225, 255);
    doc.setLineWidth(0.5);
    doc.line(14, y, W - 14, y);
    y += 8;

    // Boites resume
    const boxW = (W - 28 - 8) / 3;
    const boxes = [
      { label: "VENTES", value: String(orders.length) + " commandes", sub: "Sur la periode" },
      { label: "CA TOTAL", value: fmtEur(totalSales), sub: "Converti en EUR" },
      { label: "COMMISSION A VERSER", value: fmtEur(totalCommission), sub: commissionRate + " du CA", highlight: true },
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
      doc.setFontSize(box.highlight ? 11 : 9);
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

    // Tableau des commandes
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text("DETAIL DES VENTES", 14, y);
    y += 5;

    doc.setFillColor(...DARK);
    doc.rect(14, y, W - 28, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    doc.text("Date", 18, y + 4.5);
    doc.text("Client", 40, y + 4.5);
    doc.text("Forfait", 90, y + 4.5);
    doc.text("Montant", 155, y + 4.5, { align: "right" });
    doc.text("Commission", W - 16, y + 4.5, { align: "right" });
    y += 7;

    orders.forEach((o, idx) => {
      if (y > 260) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) { doc.setFillColor(250, 248, 255); doc.rect(14, y, W - 28, 6.5, "F"); }

      const priceEur = o.currency === "XPF" ? o.price * 100 / 119.33 : o.price;
      const commission = o.commission_amount ?? 0;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...DARK);
      doc.text(new Date(o.created_at).toLocaleDateString("fr-FR"), 18, y + 4.2);
      doc.text((o.email ?? "-").slice(0, 22), 40, y + 4.2);
      doc.text((o.package_name ?? "-").slice(0, 22), 90, y + 4.2);
      doc.text(fmtEur(priceEur), 155, y + 4.2, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...VIOLET);
      doc.text(fmtEur(commission), W - 16, y + 4.2, { align: "right" });
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
    doc.text("TOTAL A VERSER :", W - 74, y + 2.5, { align: "right" });
    doc.setTextColor(...WHITE);
    doc.text(fmtEur(totalCommission), W - 16, y + 2.5, { align: "right" });

    if (partner?.iban) {
      y += 14;
      doc.setFillColor(...LGRAY);
      doc.rect(14, y, W - 28, 10, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);
      doc.text("IBAN : " + partner.iban, 18, y + 6);
    }

    // Pied de page
    doc.setDrawColor(230, 225, 255);
    doc.setLineWidth(0.3);
    doc.line(14, 283, W - 14, 283);
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("SAS FENUASIM - contact@fenuasim.com - fenuasim.com", W / 2, 288, { align: "center" });

    const pdfBytes = Buffer.from(doc.output("arraybuffer"));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="commission-${partner_code}-${period}.pdf"`);
    return res.send(pdfBytes);

  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? "Erreur generation PDF" });
  }
}
