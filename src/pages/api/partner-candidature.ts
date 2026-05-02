// ============================================================
// FENUA SIM – API : Candidature partenaire
// src/pages/api/partner-candidature.ts
// ============================================================

import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { societe, nom, prenom, email, telephone, territoire, activite, message } = req.body;

  if (!societe || !nom || !prenom || !email || !territoire || !activite) {
    return res.status(400).json({ error: "Champs obligatoires manquants" });
  }

  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_PASS,
    },
  });

  const ACTIVITE_LABELS: Record<string, string> = {
    agence_voyage: "Agence de voyages",
    assurance: "Assurance / Courtage",
    hotel: "Hôtellerie / Hébergement",
    transport: "Transport / Compagnie aérienne",
    banque: "Banque / Finance",
    telecom: "Télécommunications",
    distribution: "Distribution / Commerce",
    autre: "Autre",
  };

  const TERRITOIRE_LABELS: Record<string, string> = {
    pf: "Polynésie française",
    nc: "Nouvelle-Calédonie",
    re: "La Réunion",
    mq: "Martinique",
    gp: "Guadeloupe",
    gf: "Guyane",
    france: "France métropolitaine",
    autre: "Autre",
  };

  const activiteLabel = ACTIVITE_LABELS[activite] || activite;
  const territoireLabel = TERRITOIRE_LABELS[territoire] || territoire;

  // ── Email interne à l'équipe FENUA SIM ──
  await transporter.sendMail({
    from: `"FENUA SIM" <hello@fenuasim.com>`,
    to: "contact@fenuasim.com",
    replyTo: email,
    subject: `🤝 Nouvelle candidature partenaire — ${societe}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #A020F0, #FF7F11); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">🤝 Nouvelle candidature partenaire</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px;">${societe}</p>
        </div>
        <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #eee;">

          <h2 style="color: #1a0533; font-size: 16px; margin-bottom: 16px;">Structure</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 7px 0; color: #666; width: 160px;">Société</td><td style="font-weight: bold; color: #1a0533;">${societe}</td></tr>
            <tr><td style="padding: 7px 0; color: #666;">Secteur</td><td style="color: #1a0533;">${activiteLabel}</td></tr>
            <tr><td style="padding: 7px 0; color: #666;">Territoire</td><td style="color: #1a0533;">${territoireLabel}</td></tr>
          </table>

          <h2 style="color: #1a0533; font-size: 16px; margin: 20px 0 16px;">Contact</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 7px 0; color: #666; width: 160px;">Nom</td><td style="font-weight: bold; color: #1a0533;">${prenom} ${nom}</td></tr>
            <tr><td style="padding: 7px 0; color: #666;">Email</td><td><a href="mailto:${email}" style="color: #A020F0;">${email}</a></td></tr>
            ${telephone ? `<tr><td style="padding: 7px 0; color: #666;">Téléphone</td><td style="color: #1a0533;">${telephone}</td></tr>` : ""}
          </table>

          ${message ? `
          <h2 style="color: #1a0533; font-size: 16px; margin: 20px 0 16px;">Message</h2>
          <p style="color: #444; background: white; padding: 14px; border-radius: 8px; border: 1px solid #eee; line-height: 1.6;">${message}</p>
          ` : ""}

          <div style="margin-top: 24px; padding: 16px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #FF7F11;">
            <p style="margin: 0; color: #666; font-size: 13px;">
              <strong>Action requise :</strong> Répondre à ${prenom} dans les 48h ouvrées pour qualifier la candidature.
            </p>
          </div>

          <div style="margin-top: 20px; text-align: center;">
            <a href="mailto:${email}?subject=Votre candidature partenaire FENUA SIM&body=Bonjour ${prenom},%0A%0AMerci pour votre intérêt pour le programme partenaire FENUA SIM.%0A%0A"
               style="display: inline-block; background: linear-gradient(135deg, #A020F0, #FF7F11); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Répondre à ${prenom}
            </a>
          </div>
        </div>
        <p style="text-align: center; color: #ccc; font-size: 12px; margin-top: 16px;">FENUASIM · Programme partenaire</p>
      </div>
    `,
  });

  // ── Email de confirmation au candidat ──
  await transporter.sendMail({
    from: `"FENUA SIM" <hello@fenuasim.com>`,
    to: email,
    subject: `Votre candidature partenaire FENUA SIM a bien été reçue 🤝`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #A020F0, #FF7F11); padding: 28px 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">🤝 FENUA SIM</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Programme partenaire</p>
        </div>
        <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #eee;">
          <p style="color: #1a0533; font-size: 16px; margin-bottom: 16px;">Bonjour <strong>${prenom}</strong>,</p>
          <p style="color: #444; line-height: 1.7; margin-bottom: 20px;">
            Merci pour votre intérêt pour le programme partenaire FENUA SIM. Nous avons bien reçu votre candidature et notre équipe vous contactera dans les <strong>48 heures ouvrées</strong> pour discuter des modalités de partenariat.
          </p>

          <div style="background: #F3E8FF; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #7B15B8; margin: 0 0 12px; font-size: 14px;">Récapitulatif de votre candidature</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr><td style="padding: 5px 0; color: #666; width: 140px;">Société</td><td style="color: #1a0533; font-weight: bold;">${societe}</td></tr>
              <tr><td style="padding: 5px 0; color: #666;">Secteur</td><td style="color: #1a0533;">${activiteLabel}</td></tr>
              <tr><td style="padding: 5px 0; color: #666;">Territoire</td><td style="color: #1a0533;">${territoireLabel}</td></tr>
            </table>
          </div>

          <div style="border-left: 4px solid #A020F0; padding-left: 16px; margin-bottom: 24px;">
            <p style="color: #444; font-size: 14px; line-height: 1.6; margin: 0;">
              En tant que partenaire FENUA SIM, vous bénéficierez d'une <strong>commission attractive</strong> sur chaque eSIM vendue, d'un <strong>dashboard dédié</strong> et d'un <strong>support WhatsApp prioritaire</strong>.
            </p>
          </div>

          <p style="color: #888; font-size: 13px; margin-top: 24px; line-height: 1.6;">
            À très bientôt,<br/>
            <strong style="color: #1a0533;">L'équipe FENUA SIM</strong><br/>
            <a href="mailto:contact@fenuasim.com" style="color: #A020F0;">contact@fenuasim.com</a>
          </p>
        </div>
        <p style="text-align: center; color: #ccc; font-size: 11px; margin-top: 16px;">
          FENUA SIM · eSIM pour les voyageurs du monde entier
        </p>
      </div>
    `,
  });

  return res.status(200).json({ success: true });
}
