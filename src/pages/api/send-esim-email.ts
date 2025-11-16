import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";
import { createEsimEmailHTML } from "@/utils/emailTemplates";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const {
      email,
      customerName,
      packageName,
      destinationName,
      dataAmount,
      dataUnit,
      validityDays,
      qrCodeUrl,
      sharingLink,
      sharingLinkCode,
    } = req.body;

    // Basic validation
    if (!email || !destinationName) {
      return res.status(400).json({
        message: "Missing required fields",
        required: ["email", "destinationName"],
      });
    }

    // SMTP Brevo
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
      },
    });

    // Build HTML content
    const emailHTML = createEsimEmailHTML({
      customerName: customerName || "Client",
      packageName: packageName || "Forfait eSIM",
      destinationName,
      dataAmount: dataAmount || "3",
      dataUnit: dataUnit || "GB",
      validityDays: validityDays || 30,
      qrCodeUrl,
      sharingLink,
      sharingLinkCode,
    });

    // Correct Odoo-friendly headers
    const mailOptions = {
      // 🔥 Odoo identifie l’email avec cette adresse
      from: `"FENUA SIM" <clients@fenua-sim.odoo.com>`,

      // 🔥 Le client reçoit l’email normalement
      to: email,

      // 🔥 Copie envoyée à Odoo → l'email se classe dans la fiche du client
      bcc: "clients@fenua-sim.odoo.com",

      // 🔥 Les réponses arrivent dans ta vraie boîte pro
      replyTo: "hello@fenuasim.com",

      subject: `Votre eSIM pour ${destinationName} est prête ! 🌐`,
      html: emailHTML,

      text:
        `Bonjour ${customerName || "Client"},\n\n` +
        `Votre eSIM pour ${destinationName} est prête !\n\n` +
        `Détails :\n` +
        `- Forfait : ${packageName}\n` +
        `- Données : ${dataAmount} ${dataUnit}\n` +
        `- Validité : ${validityDays} jours\n` +
        (qrCodeUrl
          ? `\nPour installer votre eSIM, scannez le QR Code indiqué dans la version HTML.\n`
          : `\nVeuillez suivre les instructions dans votre espace client.\n`) +
        `\nCordialement,\nL'équipe FENUA SIM\n`,

      headers: {
        "List-Unsubscribe":
          "<mailto:unsubscribe@fenuasim.com>, <https://fenuasim.com/unsubscribe>",
        Precedence: "bulk",
        "X-Mailer": "FenuaSIM Mailer 1.0",
      },
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    return res.status(200).json({
      message: "Email sent successfully",
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return res.status(500).json({
      message: "Failed to send email",
      error: error.message || "Unknown error",
    });
  }
}
