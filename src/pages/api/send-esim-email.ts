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

    // HTML email body
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

    // 🔥 CONFIG ODOO OPTIMISÉE
    const mailOptions = {
      // Odoo associe l'email au client via "to:"
      to: email,

      // Doit utiliser l'adresse d'envoi définie dans Odoo
      from: `"FENUA SIM" <notifications@fenua-sim.odoo.com>`,

      // Catchall → Odoo classe automatiquement le mail dans la fiche du client
      bcc: "clients@fenua-sim.odoo.com",

      // IMPORTANT : aucune trace de hello@ pour éviter mauvaise association
      replyTo: `"FENUA SIM" <notifications@fenua-sim.odoo.com>`,

      subject: `Votre eSIM pour ${destinationName} est prête ! 🌐`,
      html: emailHTML,

      text:
        `Bonjour ${customerName || "Client"},\n\n` +
        `Votre eSIM pour ${destinationName} est prête !\n\n` +
        `Forfait : ${packageName}\n` +
        `Données : ${dataAmount} ${dataUnit}\n` +
        `Validité : ${validityDays} jours\n` +
        (qrCodeUrl
          ? `Installez votre eSIM via le QR code dans la version HTML.\n`
          : `Instructions disponibles dans votre espace client.\n`) +
        `\nL’équipe FENUA SIM\n`,

      headers: {
        "X-Mailer": "FenuaSIM Mailer",
        "List-Unsubscribe":
          "<mailto:unsubscribe@fenuasim.com>, <https://fenuasim.com/unsubscribe>",
      },
    };

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
