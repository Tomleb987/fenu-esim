// ============================================================
// FENUA SIM – API : Demande FENUABOX
// src/pages/api/fenuasimbox-request.ts
// ============================================================

import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { firstName, lastName, email, phone, arrivalDate, departureDate, destination, travelers, message } = req.body;

  if (!firstName || !lastName || !email || !arrivalDate || !departureDate) {
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

  const nights = Math.round(
    (new Date(departureDate).getTime() - new Date(arrivalDate).getTime()) / 86400000
  );

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  // Email à l'équipe Fenua Sim
  await transporter.sendMail({
    from: `"FENUA SIM" <hello@fenuasim.com>`,
    to: "hello@fenuasim.com",
    replyTo: email,
    subject: `🎒 Nouvelle demande FENUABOX — ${firstName} ${lastName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #A020F0, #FF7F11); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">📦 Nouvelle demande FENUABOX</h1>
        </div>
        <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #eee;">
          
          <h2 style="color: #1a0533; font-size: 16px; margin-bottom: 16px;">Client</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #666; width: 140px;">Nom</td><td style="font-weight: bold; color: #1a0533;">${firstName} ${lastName}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;">Email</td><td><a href="mailto:${email}" style="color: #A020F0;">${email}</a></td></tr>
            ${phone ? `<tr><td style="padding: 6px 0; color: #666;">Téléphone</td><td style="color: #1a0533;">${phone}</td></tr>` : ""}
            ${travelers ? `<tr><td style="padding: 6px 0; color: #666;">Voyageurs</td><td style="color: #1a0533;">${travelers} personne${parseInt(travelers) > 1 ? "s" : ""}</td></tr>` : ""}
          </table>

          <h2 style="color: #1a0533; font-size: 16px; margin: 20px 0 16px;">Séjour</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #666; width: 140px;">Destination</td><td style="font-weight: bold; color: #1a0533;">${destination || "Non précisée"}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;">Arrivée</td><td style="color: #1a0533;">${fmtDate(arrivalDate)}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;">Départ</td><td style="color: #1a0533;">${fmtDate(departureDate)}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;">Durée</td><td style="font-weight: bold; color: #A020F0;">${nights} nuit${nights > 1 ? "s" : ""}</td></tr>
          </table>

          ${message ? `
          <h2 style="color: #1a0533; font-size: 16px; margin: 20px 0 16px;">Message</h2>
          <p style="color: #444; background: white; padding: 12px; border-radius: 8px; border: 1px solid #eee;">${message}</p>
          ` : ""}

          <div style="margin-top: 24px; padding: 16px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #FF7F11;">
            <p style="margin: 0; color: #666; font-size: 13px;">
              <strong>Action requise :</strong> Réponds à ${firstName} pour confirmer la disponibilité et envoyer le devis.
            </p>
          </div>

          <div style="margin-top: 16px; text-align: center;">
            <a href="mailto:${email}?subject=Votre demande FENUABOX — Confirmation&body=Bonjour ${firstName},%0A%0AMerci pour votre demande de location de routeur FENUABOX.%0A%0A"
               style="display: inline-block; background: linear-gradient(135deg, #A020F0, #FF7F11); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Répondre à ${firstName}
            </a>
          </div>
        </div>
        <p style="text-align: center; color: #ccc; font-size: 12px; margin-top: 16px;">FENUASIM · Dashboard interne</p>
      </div>
    `,
  });

  // Email de confirmation au client
  await transporter.sendMail({
    from: `"FENUA SIM" <hello@fenuasim.com>`,
    to: email,
    subject: `Votre demande FENUABOX a bien été reçue 📦`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #A020F0, #FF7F11); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">📦 FENUABOX</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Routeur WiFi de voyage</p>
        </div>
        <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #eee;">
          <p style="color: #1a0533; font-size: 16px;">Bonjour <strong>${firstName}</strong>,</p>
          <p style="color: #444; line-height: 1.6;">
            Merci pour votre demande de location de routeur FENUABOX. 
            Nous avons bien reçu votre demande et allons revenir vers vous rapidement pour confirmer la disponibilité et vous envoyer les détails.
          </p>

          <div style="background: #f9f9f9; border-radius: 10px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #1a0533; margin: 0 0 12px; font-size: 14px;">Récapitulatif de votre demande</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr><td style="padding: 5px 0; color: #666;">Destination</td><td style="color: #1a0533; font-weight: bold;">${destination || "Non précisée"}</td></tr>
              <tr><td style="padding: 5px 0; color: #666;">Arrivée</td><td style="color: #1a0533;">${fmtDate(arrivalDate)}</td></tr>
              <tr><td style="padding: 5px 0; color: #666;">Départ</td><td style="color: #1a0533;">${fmtDate(departureDate)}</td></tr>
              <tr><td style="padding: 5px 0; color: #666;">Durée</td><td style="color: #A020F0; font-weight: bold;">${nights} nuit${nights > 1 ? "s" : ""}</td></tr>
              ${travelers ? `<tr><td style="padding: 5px 0; color: #666;">Voyageurs</td><td style="color: #1a0533;">${travelers}</td></tr>` : ""}
            </table>
          </div>

          <p style="color: #444; line-height: 1.6; font-size: 14px;">
            Notre équipe vous contactera sous <strong>24h</strong> pour confirmer votre réservation.
            <br/>Des questions ? Répondez à cet email ou contactez-nous sur WhatsApp.
          </p>

          <p style="color: #888; font-size: 13px; margin-top: 24px;">
            À bientôt,<br/>
            <strong style="color: #1a0533;">L'équipe FENUA SIM</strong>
          </p>
        </div>
      </div>
    `,
  });

  return res.status(200).json({ success: true });
}
