import { Resend } from 'resend';

// Initialisation de Resend avec la clé API (assurez-vous de l'avoir dans .env)
const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailProps {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: SendEmailProps) => {
  // Vérification de sécurité
  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️ RESEND_API_KEY manquant. Email non envoyé.");
    return null;
  }

  try {
    const data = await resend.emails.send({
      from: 'Fenuasim <onboarding@resend.dev>', // Changez ceci par votre domaine vérifié une fois en prod (ex: contact@fenuasim.com)
      to,
      subject,
      html,
    });

    console.log("📧 Email envoyé avec succès :", data);
    return data;
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email :", error);
    // On ne bloque pas le processus si l'email échoue, mais on log l'erreur
    return null;
  }
};
