// ============================================================
// FENUA SIM – API : Contrat de location routeur
// src/pages/api/admin/rental-contract.ts
// POST { rentalId: string }
// ============================================================

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { rentalId } = req.body as { rentalId: string };
  if (!rentalId) return res.status(400).json({ error: "rentalId requis" });

  // Récupérer la location avec le routeur
  const { data: rental, error } = await supabase
    .from("router_rentals")
    .select("*, routers(model, serial_number, rental_price_per_day, deposit_amount)")
    .eq("id", rentalId)
    .single();

  if (error || !rental) return res.status(404).json({ error: "Location introuvable" });

  const router = (rental as any).routers;
  const fmtDate = (d: string) => d
    ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : "-";
  const fmtNum = (n: number): string => {
    const s = Math.round(n * 100) / 100;
    return s.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const fmtEur = (n: number) => fmtNum(n) + " EUR";

  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const contractNum = "CTR-" + Date.now().toString().slice(-6);

  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210;
    const VIOLET: [number, number, number] = [160, 32, 240];
    const DARK:   [number, number, number] = [26, 5, 51];
    const GRAY:   [number, number, number] = [107, 114, 128];
    const WHITE:  [number, number, number] = [255, 255, 255];
    const LGRAY:  [number, number, number] = [245, 247, 250];

    // ── En-tete ────────────────────────────────────────────
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
    doc.text("CONTRAT DE LOCATION", W - 14, 12, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(220, 200, 255);
    doc.text("N " + contractNum + " - " + today, W - 14, 18, { align: "right" });

    let y = 36;

    // ── Parties ────────────────────────────────────────────
    // Bailleur
    doc.setFillColor(...LGRAY);
    doc.rect(14, y, (W - 32) / 2, 28, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("BAILLEUR", 17, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text("SAS FENUASIM", 17, y + 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text("58 rue Monceau, 75008 Paris", 17, y + 16);
    doc.text("SIRET : 943 713 875 00010", 17, y + 21);
    doc.text("contact@fenuasim.com", 17, y + 26);

    // Locataire
    const rx = 14 + (W - 32) / 2 + 4;
    doc.setFillColor(...LGRAY);
    doc.rect(rx, y, (W - 32) / 2, 28, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("LOCATAIRE", rx + 3, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(rental.customer_name || "Non renseigne", rx + 3, y + 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(rental.customer_email || "-", rx + 3, y + 16);
    if (rental.customer_phone) doc.text(rental.customer_phone, rx + 3, y + 21);

    y += 34;

    // ── Objet du contrat ───────────────────────────────────
    doc.setFillColor(...VIOLET);
    doc.rect(14, y, W - 28, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.text("ARTICLE 1 - OBJET DU CONTRAT", 17, y + 4.5);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    const objet = "Le present contrat a pour objet la location d'un routeur WiFi portable par SAS FENUASIM (ci-apres le Bailleur) au Locataire identifie ci-dessus. Le materiel loue est destine a un usage personnel et non commercial.";
    const objetLines = doc.splitTextToSize(objet, W - 28);
    doc.text(objetLines, 14, y);
    y += objetLines.length * 5 + 4;

    // ── Description du materiel ───────────────────────────
    doc.setFillColor(...VIOLET);
    doc.rect(14, y, W - 28, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.text("ARTICLE 2 - DESCRIPTION DU MATERIEL", 17, y + 4.5);
    y += 10;

    doc.setFillColor(...LGRAY);
    doc.rect(14, y, W - 28, 20, "F");
    const matInfos = [
      ["Modele", router?.model ?? "-"],
      ["Numero de serie", router?.serial_number ?? "-"],
      ["Type", "Routeur WiFi portable 4G/5G"],
    ];
    matInfos.forEach(([label, val], i) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text(label + " :", 18, y + 5 + i * 6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK);
      doc.text(val, 70, y + 5 + i * 6);
    });
    y += 24;

    // ── Duree et conditions financieres ──────────────────
    doc.setFillColor(...VIOLET);
    doc.rect(14, y, W - 28, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.text("ARTICLE 3 - DUREE ET CONDITIONS FINANCIERES", 17, y + 4.5);
    y += 10;

    doc.setFillColor(...LGRAY);
    doc.rect(14, y, W - 28, 30, "F");
    const finInfos = [
      ["Date de debut", fmtDate(rental.rental_start)],
      ["Date de fin", fmtDate(rental.rental_end)],
      ["Duree", rental.rental_days + " nuit" + (rental.rental_days > 1 ? "s" : "")],
      ["Loyer total", fmtEur(rental.rental_amount ?? 0)],
      ["Caution versee", fmtEur(rental.deposit_amount ?? 0) + " (remboursable au retour en bon etat)"],
    ];
    finInfos.forEach(([label, val], i) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text(label + " :", 18, y + 5 + i * 5.5);
      doc.setFont("helvetica", i >= 3 ? "bold" : "normal");
      doc.setTextColor(i >= 3 ? VIOLET[0] : DARK[0], i >= 3 ? VIOLET[1] : DARK[1], i >= 3 ? VIOLET[2] : DARK[2]);
      doc.text(val, 70, y + 5 + i * 5.5);
    });
    y += 34;

    // ── Obligations du locataire ───────────────────────────
    doc.setFillColor(...VIOLET);
    doc.rect(14, y, W - 28, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.text("ARTICLE 4 - OBLIGATIONS DU LOCATAIRE", 17, y + 4.5);
    y += 10;

    const obligations = [
      "Le Locataire s'engage a utiliser le routeur avec soin et en bon pere de famille.",
      "L'utilisation est strictement personnelle. Toute cession ou sous-location est interdite.",
      "Le Locataire s'engage a restituer le materiel en bon etat de fonctionnement a la date convenue.",
      "Toute utilisation illicite ou frauduleuse engage la seule responsabilite du Locataire.",
      "Le Locataire s'engage a signaler immediatement tout dysfonctionnement a contact@fenuasim.com.",
    ];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    obligations.forEach((ob, i) => {
      const lines = doc.splitTextToSize("- " + ob, W - 34);
      doc.text(lines, 17, y + i * 10);
      y += (lines.length - 1) * 4;
    });
    y += 12;

    // ── Responsabilites ────────────────────────────────────
    doc.setFillColor(...VIOLET);
    doc.rect(14, y, W - 28, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.text("ARTICLE 5 - RESPONSABILITES ET DOMMAGES", 17, y + 4.5);
    y += 10;

    const respoText = "En cas de perte, vol ou destruction totale du routeur, le Locataire sera redevable d'une indemnite de 100 EUR (cent euros) correspondant a la valeur de remplacement du materiel. En cas de deterioration partielle, le montant retenu sur la caution sera evalue au cout reel de reparation, dans la limite de 100 EUR. Le Bailleur ne pourra etre tenu responsable des pertes de donnees ou interruptions de service liees a l'utilisation du routeur.";
    const respoLines = doc.splitTextToSize(respoText, W - 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    doc.text(respoLines, 14, y);
    y += respoLines.length * 5 + 4;

    // ── Restitution ────────────────────────────────────────
    doc.setFillColor(...VIOLET);
    doc.rect(14, y, W - 28, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.text("ARTICLE 6 - RESTITUTION ET REMBOURSEMENT DE CAUTION", 17, y + 4.5);
    y += 10;

    const restitText = "Le routeur doit etre restitue au plus tard le " + fmtDate(rental.rental_end) + " au point de remise convenu. La caution de " + fmtEur(rental.deposit_amount ?? 0) + " sera remboursee integralement dans un delai de 72 heures apres verification du bon etat du materiel. Tout retard de restitution superieur a 24 heures pourra faire l'objet d'une facturation complementaire au tarif journalier en vigueur.";
    const restitLines = doc.splitTextToSize(restitText, W - 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    doc.text(restitLines, 14, y);
    y += restitLines.length * 5 + 4;

    // ── Droit applicable ───────────────────────────────────
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text("Article 7 - Droit applicable : Le present contrat est soumis au droit francais. Tout litige sera porte devant les tribunaux competents de Paris.", 14, y);
    y += 8;

    // ── Signature ──────────────────────────────────────────
    if (y > 240) { doc.addPage(); y = 20; }

    doc.setDrawColor(230, 225, 255);
    doc.setLineWidth(0.5);
    doc.line(14, y, W - 14, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text("SIGNATURES", 14, y);
    y += 8;

    const sigW = (W - 32) / 2;

    // Bailleur
    doc.setFillColor(...LGRAY);
    doc.rect(14, y, sigW, 35, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("POUR FENUASIM", 17, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text("Signature et cachet :", 17, y + 11);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(17, y + 25, 14 + sigW - 4, y + 25);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("Date : " + today, 17, y + 32);

    // Locataire
    doc.setFillColor(...LGRAY);
    doc.rect(14 + sigW + 4, y, sigW, 35, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("LE LOCATAIRE", 14 + sigW + 7, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text("Lu et approuve - Signature :", 14 + sigW + 7, y + 11);
    // Champ signature electronique
    doc.setFillColor(255, 255, 255);
    doc.rect(14 + sigW + 7, y + 14, sigW - 10, 8, "F");
    doc.setDrawColor(...VIOLET);
    doc.setLineWidth(0.5);
    doc.rect(14 + sigW + 7, y + 14, sigW - 10, 8);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("Saisir nom complet :", 14 + sigW + 8, y + 19);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.text("Date : _____ / _____ / _______", 14 + sigW + 7, y + 32);

    y += 40;

    // Mention signature electronique
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    const mentionSig = "La saisie du nom complet du locataire dans le champ prevu a cet effet constitue une signature electronique au sens de l'article 1367 du Code civil.";
    doc.text(doc.splitTextToSize(mentionSig, W - 28), 14, y);

    // ── Pied de page ───────────────────────────────────────
    doc.setDrawColor(230, 225, 255);
    doc.setLineWidth(0.3);
    doc.line(14, 283, W - 14, 283);
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("SAS FENUASIM - SIRET 943 713 875 00010 - contact@fenuasim.com - fenuasim.com", W / 2, 288, { align: "center" });

    const pdfBytes = Buffer.from(doc.output("arraybuffer"));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="contrat-location-${contractNum}.pdf"`);
    return res.send(pdfBytes);

  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? "Erreur generation PDF" });
  }
}
