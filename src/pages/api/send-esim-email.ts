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

    // -----------------------------------------------
    // 🔥 CONFIG OPTIMISÉE POUR ODOO SAAS
    // -----------------------------------------------
    const mailOptions = {
      // 1️⃣ Le client → Odoo associe automatiquement l'email à sa fiche
      to: email,

      // 2️⃣ L'expéditeur reconnu par Odoo
      from: `"FENUA SIM" <notifications@fenua-sim.odoo.com>`,

      // 3️⃣ Le catchall Odoo → copie invisible → historique client OK
      bcc: "clients@fenua-sim.odoo.com",

      // 4️⃣ AUCUN "hello@" dans replyTo → sinon Odoo associe mal le message
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
          : `Retrouvez les instructions dans votre espace client.\n`) +
        `\nL’équipe FENUA SIM\n`,

      headers: {
        "X-Mailer": "FenuaSIM Mailer",
        "List-Unsubscribe":
          "<mailto:unsubscribe@fenuasim.com>, <https://fenuasim.com/unsubscribe>",
      },
    };

    // Envoi
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
