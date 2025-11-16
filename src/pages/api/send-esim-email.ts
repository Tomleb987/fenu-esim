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
      sharingLinkCode
    } = req.body;

    // Validate required fields
    if (!email || !destinationName) {
      return res.status(400).json({
        message: "Missing required fields",
        required: ["email", "destinationName"],
        received: {
          email: !!email,
          destinationName: !!destinationName,
        },
      });
    }

    // Configure SMTP (Brevo)
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
      },
    });

    // Build the HTML email
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

    // Email options
    const mailOptions = {
      from: `"FENUASIM" <hello@fenuasim.com>`,
      to: email,

      // ⭐⭐⭐ Ajout indispensable : copie envoyée à Odoo ⭐⭐⭐
      bcc: "clients@fenua-sim.odoo.com",

      subject: `Votre eSIM pour ${destinationName} est prête ! 🌐`,
      html: emailHTML,
      text:
        `Bonjour ${customerName || "Client"},\n\n` +
        `Votre eSIM pour ${destinationName} est maintenant prête !\n\n` +
        `Détails:\n` +
        `- Forfait: ${packageName}\n` +
        `- Données: ${dataAmount} ${dataUnit}\n` +
        `- Validité: ${validityDays} jours\n` +
        (qrCodeUrl
          ? "\nPour installer votre eSIM, scannez le code QR disponible dans la version HTML de cet email.\n"
          : "\nPour installer votre eSIM, veuillez suivre les instructions fournies dans votre espace client ou contactez notre support.\n") +
        `\nCordialement,\nL'équipe FENUA SIM\n`,
      headers: {
        "List-Unsubscribe":
          "<mailto:unsubscribe@fenuasim.com>, <https://fenuasim.com/unsubscribe>",
        Precedence: "bulk",
        "X-Mailer": "FenuaSIM Mailer 1.0",
      },
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: "Email sent successfully",
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });

  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({
      message: "Failed to send email",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
