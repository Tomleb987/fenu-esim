import { Resend } from 'resend';

// On initialise Resend uniquement pour ce fichier
const resend = new Resend(process.env.RESEND_API_KEY);

interface SendInsuranceEmailProps {
  to: string;
  subject: string;
  html: string;
}

export const sendInsuranceEmail = async ({ to, subject, html }: SendInsuranceEmailProps) => {
  if (!process.env.RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY manquant. Email assurance non envoyé.");
    return null;
  }

  try {
    const data = await resend.emails.send({
      from: 'Fenuasim Assurance <assurance@fenuasim.com>', // Sender dédié
      to,
      subject,
      html,
    });

    console.log("✅ Email Assurance envoyé :", data);
    return data;
  } catch (error) {
    console.error("❌ Erreur envoi email assurance :", error);
    return null;
  }
};
