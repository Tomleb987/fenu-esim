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

  const { data: rental, error } = await supabase
    .from("router_rentals")
    .select("*, routers(model, serial_number, rental_price_per_day, deposit_amount)")
    .eq("id", rentalId)
    .single();

  if (error || !rental) return res.status(404).json({ error: "Location introuvable" });

  const router = (rental as any).routers;

  const fmtDate = (d: string) =>
    d
      ? new Date(d).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "-";

  const fmtNum = (n: number): string => {
    const s = Math.round((n || 0) * 100) / 100;
    return s.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const fmtEur = (n: number) => fmtNum(n) + " XPF";

  const today = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const contractNum = "CTR-" + Date.now().toString().slice(-6);

  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    const W = 210;
    const PAGE_H = 297;
    const LEFT = 14;
    const RIGHT = 14;
    const CONTENT_W = W - LEFT - RIGHT;

    const VIOLET: [number, number, number] = [160, 32, 240];
    const DARK: [number, number, number] = [26, 5, 51];
    const GRAY: [number, number, number] = [107, 114, 128];
    const WHITE: [number, number, number] = [255, 255, 255];
    const LGRAY: [number, number, number] = [245, 247, 250];

    const bottomLimit = 270;

    const ensureSpace = (needed: number, resetY = 20, withHeader = false) => {
      if (y + needed <= bottomLimit) return;

      doc.addPage();

      if (withHeader) {
        drawPageHeader();
        y = 36;
      } else {
        y = resetY;
      }
    };

    const drawPageHeader = () => {
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
    };

    const drawSectionTitle = (title: string) => {
      ensureSpace(16, 20, true);
      doc.setFillColor(...VIOLET);
      doc.rect(LEFT, y, CONTENT_W, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...WHITE);
      doc.text(title, LEFT + 3, y + 4.5);
      y += 10;
    };

    const drawParagraph = (text: string, fontSize = 8.5, lineHeight = 4.8) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(fontSize);
      doc.setTextColor(...DARK);

      const lines = doc.splitTextToSize(text, CONTENT_W);
      const needed = lines.length * lineHeight + 2;

      ensureSpace(needed, 20, true);
      doc.text(lines, LEFT, y);
      y += needed;
    };

    const drawKeyValueBox = (
      items: Array<[string, string]>,
      options?: { labelX?: number; valueX?: number; lineGap?: number; padY?: number }
    ) => {
      const labelX = options?.labelX ?? LEFT + 4;
      const valueX = options?.valueX ?? 70;
      const lineGap = options?.lineGap ?? 5.5;
      const padY = options?.padY ?? 4;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);

      const prepared = items.map(([label, value], idx) => {
        const wrapped = doc.splitTextToSize(value || "-", CONTENT_W - (valueX - LEFT) - 4);
        return { label, wrapped, idx };
      });

      const totalLines = prepared.reduce((sum, item) => sum + Math.max(1, item.wrapped.length), 0);
      const boxH = padY * 2 + totalLines * lineGap + 1;

      ensureSpace(boxH + 4, 20, true);

      doc.setFillColor(...LGRAY);
      doc.rect(LEFT, y, CONTENT_W, boxH, "F");

      let yy = y + padY + 1;

      prepared.forEach(({ label, wrapped, idx }) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...GRAY);
        doc.text(label + " :", labelX, yy);

        doc.setFont("helvetica", idx >= 3 ? "bold" : "normal");
        doc.setTextColor(
          idx >= 3 ? VIOLET[0] : DARK[0],
          idx >= 3 ? VIOLET[1] : DARK[1],
          idx >= 3 ? VIOLET[2] : DARK[2]
        );
        doc.text(wrapped, valueX, yy);

        yy += Math.max(1, wrapped.length) * lineGap;
      });

      y += boxH + 4;
    };

    let y = 0;
    drawPageHeader();
    y = 36;

    // ── Parties ────────────────────────────────────────────
    ensureSpace(42, 20, true);

    const leftBoxW = (W - 32) / 2;
    const rightBoxX = LEFT + leftBoxW + 4;

    const bailleurLines = [
      "SAS FENUASIM",
      "58 rue Monceau, 75008 Paris",
      "SIRET : 943 713 875 00010",
      "contact@fenuasim.com",
    ];

    const locataireLines = [
      rental.customer_name || "Non renseigne",
      rental.customer_email || "-",
      rental.customer_phone || "",
    ].filter(Boolean);

    const rowGap = 5;
    const bailleurH = 8 + bailleurLines.length * rowGap;
    const locataireH = 8 + locataireLines.length * rowGap;
    const boxH = Math.max(bailleurH, locataireH) + 4;

    doc.setFillColor(...LGRAY);
    doc.rect(LEFT, y, leftBoxW, boxH, "F");
    doc.rect(rightBoxX, y, leftBoxW, boxH, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("BAILLEUR", LEFT + 3, y + 5);
    doc.text("LOCATAIRE", rightBoxX + 3, y + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(bailleurLines[0], LEFT + 3, y + 11);
    doc.text(locataireLines[0] || "-", rightBoxX + 3, y + 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);

    bailleurLines.slice(1).forEach((line, i) => {
      doc.text(line, LEFT + 3, y + 16 + i * rowGap);
    });

    locataireLines.slice(1).forEach((line, i) => {
      doc.text(line, rightBoxX + 3, y + 16 + i * rowGap);
    });

    y += boxH + 6;

    // ── Objet ──────────────────────────────────────────────
    drawSectionTitle("ARTICLE 1 - OBJET DU CONTRAT");

    drawParagraph(
      "Le present contrat a pour objet la location d'un routeur WiFi portable par SAS FENUASIM (ci-apres le Bailleur) au Locataire identifie ci-dessus. Le materiel loue est destine a un usage personnel et non commercial."
    );

    // ── Description du materiel ────────────────────────────
    drawSectionTitle("ARTICLE 2 - DESCRIPTION DU MATERIEL");

    drawKeyValueBox([
      ["Modele", router?.model ?? "-"],
      ["Numero de serie", router?.serial_number ?? "-"],
      ["Type", "Routeur WiFi portable 4G/5G"],
    ]);

    // ── Duree et conditions financieres ────────────────────
    drawSectionTitle("ARTICLE 3 - DUREE ET CONDITIONS FINANCIERES");

    drawKeyValueBox([
      ["Date de debut", fmtDate(rental.rental_start)],
      ["Date de fin", fmtDate(rental.rental_end)],
      ["Duree", rental.rental_days + " nuit" + (rental.rental_days > 1 ? "s" : "")],
      ["Loyer total", fmtEur(rental.rental_amount ?? 0)],
      ["Caution versee", fmtEur(rental.deposit_amount ?? 0) + " (remboursable au retour en bon etat)"],
    ]);

    // ── Obligations du locataire ───────────────────────────
    drawSectionTitle("ARTICLE 4 - OBLIGATIONS DU LOCATAIRE");

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

    for (const ob of obligations) {
      const lines = doc.splitTextToSize("- " + ob, CONTENT_W - 3);
      const needed = lines.length * 4.8 + 1;

      ensureSpace(needed, 20, true);
      doc.text(lines, LEFT + 3, y);
      y += needed;
    }

    y += 3;

    // ── Responsabilites ────────────────────────────────────
    drawSectionTitle("ARTICLE 5 - RESPONSABILITES ET DOMMAGES");

    drawParagraph(
      "En cas de perte, vol ou destruction totale du routeur, le Locataire sera redevable d'une indemnite de 100 EUR (cent euros) correspondant a la valeur de remplacement du materiel. En cas de deterioration partielle, le montant retenu sur la caution sera evalue au cout reel de reparation, dans la limite de 100 EUR. Le Bailleur ne pourra etre tenu responsable des pertes de donnees ou interruptions de service liees a l'utilisation du routeur."
    );

    // ── Restitution ────────────────────────────────────────
    drawSectionTitle("ARTICLE 6 - RESTITUTION ET REMBOURSEMENT DE CAUTION");

    drawParagraph(
      "Le routeur doit etre restitue au plus tard le " +
        fmtDate(rental.rental_end) +
        " au point de remise convenu. La caution de " +
        fmtEur(rental.deposit_amount ?? 0) +
        " sera remboursee integralement dans un delai de 72 heures apres verification du bon etat du materiel. Tout retard de restitution superieur a 24 heures pourra faire l'objet d'une facturation complementaire au tarif journalier en vigueur."
    );

    // ── Droit applicable ───────────────────────────────────
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);

    const droitText =
      "Article 7 - Droit applicable : Le present contrat est soumis au droit francais. Tout litige sera porte devant les tribunaux competents de Paris.";
    const droitLines = doc.splitTextToSize(droitText, CONTENT_W);

    ensureSpace(droitLines.length * 4.2 + 10, 20, true);
    doc.text(droitLines, LEFT, y);
    y += droitLines.length * 4.2 + 6;

    // ── Signature ──────────────────────────────────────────
    ensureSpace(60, 20, true);

    doc.setDrawColor(230, 225, 255);
    doc.setLineWidth(0.5);
    doc.line(LEFT, y, W - RIGHT, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text("SIGNATURES", LEFT, y);
    y += 8;

    const sigW = (W - 32) / 2;

    // Bailleur
    doc.setFillColor(...LGRAY);
    doc.rect(LEFT, y, sigW, 35, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("POUR FENUASIM", LEFT + 3, y + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text("Signature et cachet :", LEFT + 3, y + 11);

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(LEFT + 3, y + 25, LEFT + sigW - 4, y + 25);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("Date : " + today, LEFT + 3, y + 32);

    // Locataire
    doc.setFillColor(...LGRAY);
    doc.rect(LEFT + sigW + 4, y, sigW, 35, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("LE LOCATAIRE", LEFT + sigW + 7, y + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text("Lu et approuve - Signature :", LEFT + sigW + 7, y + 11);

    doc.setFillColor(255, 255, 255);
    doc.rect(LEFT + sigW + 7, y + 14, sigW - 10, 8, "F");
    doc.setDrawColor(...VIOLET);
    doc.setLineWidth(0.5);
    doc.rect(LEFT + sigW + 7, y + 14, sigW - 10, 8);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("Saisir nom complet :", LEFT + sigW + 8, y + 19);
    doc.text("Date : _____ / _____ / _______", LEFT + sigW + 7, y + 32);

    y += 40;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    const mentionSig =
      "La saisie du nom complet du locataire dans le champ prevu a cet effet constitue une signature electronique au sens de l'article 1367 du Code civil.";
    const mentionLines = doc.splitTextToSize(mentionSig, CONTENT_W);
    doc.text(mentionLines, LEFT, y);

    // ── Pied de page ───────────────────────────────────────
    doc.setDrawColor(230, 225, 255);
    doc.setLineWidth(0.3);
    doc.line(LEFT, 283, W - RIGHT, 283);

    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(
      "SAS FENUASIM - SIRET 943 713 875 00010 - contact@fenuasim.com - fenuasim.com",
      W / 2,
      288,
      { align: "center" }
    );

    const pdfBytes = Buffer.from(doc.output("arraybuffer"));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="contrat-location-${contractNum}.pdf"`);
    return res.send(pdfBytes);
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? "Erreur generation PDF" });
  }
}
