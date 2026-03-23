// ============================================================
// FENUA SIM – API : Génération devis FENUASIMBOX (PDF + email)
// src/pages/api/admin/fenuasimbox-devis.ts
// ============================================================

import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { action, devis } = req.body as {
    action: "pdf" | "email";
    devis: {
      firstName: string; lastName: string; email: string; phone: string;
      packageName: string; packageData: string; packageValidity: string;
      currency: string;
      esimPrice: number;
      withRouter: boolean;
      routerModel: string;
      rentalStart: string; rentalEnd: string; rentalDays: number;
      rentalAmount: number; deposit: number; total: number;
      paymentUrl: string;
    };
  };

  if (!devis) return res.status(400).json({ error: "Donnees manquantes" });

  const fmtNum = (n: number): string => {
    const s = Math.round(n).toString();
    let result = "";
    for (let i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 === 0) result += " ";
      result += s[i];
    }
    return result;
  };

  const fmtCurrency = (n: number) => {
    if (devis.currency === "xpf") return fmtNum(n) + " XPF";
    return fmtNum(n) + " EUR";
  };

  const fmtDate = (d: string) => d
    ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : "-";

  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const devisNum = "DEV-" + Date.now().toString().slice(-6);

  const generatePdf = async (): Promise<Buffer> => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210;
    const VIOLET: [number, number, number] = [160, 32, 240];
    const DARK:   [number, number, number] = [26, 5, 51];
    const GRAY:   [number, number, number] = [107, 114, 128];
    const WHITE:  [number, number, number] = [255, 255, 255];
    const LGRAY:  [number, number, number] = [245, 247, 250];

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
    doc.setFontSize(14);
    doc.setTextColor(...WHITE);
    doc.text("DEVIS", W - 14, 12, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(220, 200, 255);
    doc.text("N " + devisNum + " - " + today, W - 14, 18, { align: "right" });

    let y = 36;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("CLIENT", 14, y);
    doc.text("VALIDITE DU LIEN", 110, y);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(devis.firstName + " " + devis.lastName, 14, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text("24h apres generation", 110, y);
    y += 4;
    doc.text(devis.email, 14, y);
    if (devis.phone) { y += 4; doc.text(devis.phone, 14, y); }

    y += 10;
    doc.setDrawColor(230, 225, 255);
    doc.setLineWidth(0.5);
    doc.line(14, y, W - 14, y);
    y += 8;

    doc.setFillColor(...DARK);
    doc.rect(14, y, W - 28, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    doc.text("DESIGNATION", 18, y + 4.5);
    doc.text("DETAIL", 100, y + 4.5);
    doc.text("MONTANT", W - 16, y + 4.5, { align: "right" });
    y += 7;

    const drawLine = (label: string, detail: string, amount: string, highlight = false) => {
      if (highlight) { doc.setFillColor(248, 245, 255); doc.rect(14, y, W - 28, 8, "F"); }
      doc.setFont("helvetica", highlight ? "bold" : "normal");
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      doc.text(label, 18, y + 5.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text(detail, 100, y + 5.5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      if (highlight) {
        doc.setTextColor(...VIOLET);
      } else {
        doc.setTextColor(...DARK);
      }
      doc.text(amount, W - 16, y + 5.5, { align: "right" });
      doc.setDrawColor(240, 235, 255);
      doc.line(14, y + 8, W - 14, y + 8);
      y += 8;
    };

    drawLine(
      "Forfait eSIM",
      devis.packageData + " - " + devis.packageValidity,
      fmtCurrency(devis.esimPrice),
      true
    );

    if (devis.withRouter) {
      drawLine(
        "Location routeur " + devis.routerModel,
        devis.rentalDays + " nuit" + (devis.rentalDays > 1 ? "s" : "") +
          " - " + fmtDate(devis.rentalStart) + " au " + fmtDate(devis.rentalEnd),
        fmtCurrency(devis.rentalAmount)
      );
      drawLine(
        "Caution routeur",
        "Remboursee au retour en bon etat",
        fmtCurrency(devis.deposit)
      );
    }

    y += 4;
    doc.setFillColor(...VIOLET);
    doc.rect(W - 80, y, 66, 12, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text("TOTAL", W - 82, y + 8, { align: "right" });
    doc.setTextColor(...WHITE);
    doc.setFontSize(11);
    doc.text(fmtCurrency(devis.total), W - 16, y + 8, { align: "right" });
    y += 20;

    doc.setFillColor(...LGRAY);
    doc.rect(14, y, W - 28, 18, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...VIOLET);
    doc.text("LIEN DE PAIEMENT SECURISE", 18, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    const shortUrl = devis.paymentUrl.slice(0, 75) + (devis.paymentUrl.length > 75 ? "..." : "");
    doc.text(shortUrl, 18, y + 11);
    doc.setFont("helvetica", "italic");
    doc.text("Cliquez sur le lien pour proceder au paiement securise via Stripe", 18, y + 15.5);
    y += 26;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text("Ce devis est valable 7 jours. Le lien de paiement Stripe est valable 24h.", 14, y);
    y += 5;
    doc.text("La caution est integralement remboursee au retour du routeur en bon etat.", 14, y);

    doc.setDrawColor(230, 225, 255);
    doc.setLineWidth(0.3);
    doc.line(14, 283, W - 14, 283);
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("SAS FENUASIM - contact@fenuasim.com - fenuasim.com", W / 2, 288, { align: "center" });

    return Buffer.from(doc.output("arraybuffer"));
  };

  if (action === "pdf") {
    try {
      const pdfBytes = await generatePdf();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=\"devis-fenuasimbox-" + devisNum + ".pdf\"");
      return res.send(pdfBytes);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (action === "email") {
    try {
      const pdfBytes = await generatePdf();
      const transporter = nodemailer.createTransport({
        host: "smtp-relay.brevo.com", port: 587, secure: false,
        auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_PASS },
      });

      await transporter.sendMail({
        from: `"FENUA SIM" <hello@fenuasim.com>`,
        to: devis.email,
        replyTo: "hello@fenuasim.com",
        subject: "Votre devis FENUASIM BOX - " + devis.firstName,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#A020F0,#FF7F11);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="color:white;margin:0;font-size:22px;">FENUASIM BOX</h1>
              <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">Votre devis de location de routeur WiFi</p>
            </div>
            <div style="background:white;padding:32px;border-radius:0 0 12px 12px;border:1px solid #eee;">
              <p style="color:#1a0533;font-size:16px;">Bonjour <strong>${devis.firstName}</strong>,</p>
              <p style="color:#666;line-height:1.6;">Veuillez trouver ci-joint votre devis FENUASIM BOX.</p>
              <div style="background:#f9f9f9;border-radius:10px;padding:20px;margin:20px 0;">
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                  <tr>
                    <td style="padding:6px 0;color:#666;">Forfait eSIM</td>
                    <td style="text-align:right;font-weight:bold;color:#1a0533;">${devis.packageName}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#666;">${devis.packageData} - ${devis.packageValidity}</td>
                    <td style="text-align:right;color:#A020F0;font-weight:bold;">${fmtCurrency(devis.esimPrice)}</td>
                  </tr>
                  ${devis.withRouter ? `
                  <tr><td colspan="2" style="padding-top:12px;border-top:1px solid #eee;"></td></tr>
                  <tr>
                    <td style="padding:6px 0;color:#666;">Routeur ${devis.routerModel}</td>
                    <td style="text-align:right;font-weight:bold;color:#1a0533;">${devis.rentalDays} nuits</td>
                  </tr>
                  <tr>
                    <td style="color:#666;font-size:12px;">${fmtDate(devis.rentalStart)} au ${fmtDate(devis.rentalEnd)}</td>
                    <td style="text-align:right;color:#A020F0;font-weight:bold;">${fmtCurrency(devis.rentalAmount)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#666;">Caution (remboursable)</td>
                    <td style="text-align:right;color:#666;">${fmtCurrency(devis.deposit)}</td>
                  </tr>
                  ` : ""}
                  <tr style="border-top:2px solid #A020F0;">
                    <td style="padding:12px 0 6px;font-weight:bold;font-size:16px;color:#1a0533;">TOTAL</td>
                    <td style="padding:12px 0 6px;text-align:right;font-weight:bold;font-size:18px;color:#A020F0;">${fmtCurrency(devis.total)}</td>
                  </tr>
                </table>
              </div>
              <div style="text-align:center;margin:24px 0;">
                <a href="${devis.paymentUrl}"
                   style="display:inline-block;background:linear-gradient(135deg,#A020F0,#FF7F11);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:15px;">
                  Payer maintenant
                </a>
                <p style="margin:8px 0 0;font-size:12px;color:#999;">Lien securise Stripe - Valable 24h</p>
              </div>
              <p style="color:#888;font-size:13px;margin-top:24px;">A bientot,<br/><strong style="color:#1a0533;">L'equipe FENUA SIM</strong></p>
            </div>
          </div>
        `,
        attachments: [{
          filename: "devis-fenuasimbox-" + devisNum + ".pdf",
          content: pdfBytes,
          contentType: "application/pdf",
        }],
      });

      return res.status(200).json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: "Action inconnue" });
}
