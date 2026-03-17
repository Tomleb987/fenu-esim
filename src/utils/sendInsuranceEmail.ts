import nodemailer from "nodemailer";

interface SendInsuranceEmailProps {
  to: string;
  subject: string;
  html: string;
}

export const sendInsuranceEmail = async ({ to, subject, html }: SendInsuranceEmailProps) => {
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASS) {
    console.error("❌ BREVO_SMTP_USER ou BREVO_SMTP_PASS manquant. Email assurance non envoyé.");
    return null;
  }

  // SMTP Brevo — même config que les emails eSIM
  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"FENUA SIM" <hello@fenuasim.com>`,
    to,
    bcc: "clients@fenua-sim.odoo.com",
    replyTo: `"FENUA SIM" <hello@fenuasim.com>`,
    subject,
    html,
    headers: {
      "X-Mailer": "FenuaSIM Assurance Mailer",
      "List-Unsubscribe":
        "<mailto:unsubscribe@fenuasim.com>, <https://fenuasim.com/unsubscribe>",
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email Assurance envoyé :", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Erreur envoi email assurance :", error);
    return null;
  }
};
