import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import nodemailer from "nodemailer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { token, signedName } = req.body as { token: string; signedName: string };
  if (!token || !signedName) return res.status(400).json({ error: "Token et nom requis" });

  const { data: rental, error } = await supabase
    .from("router_rentals")
    .select("id, signature_status, customer_email, customer_name")
    .eq("signature_token", token)
    .single();

  if (error || !rental) return res.status(404).json({ error: "Contrat introuvable" });
  if (rental.signature_status === "signed") return res.status(400).json({ error: "Contrat déjà signé" });

  const signedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("router_rentals")
    .update({
      signature_status: "signed",
      signed_at: signedAt,
      signed_name: signedName,
    })
    .eq("id", rental.id);

  if (updateError) return res.status(500).json({ error: updateError.message });

  // Générer le PDF du contrat signé
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.fenuasim.com";
    const pdfRes = await fetch(`${baseUrl}/api/admin/rental-contract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rentalId: rental.id }),
    });

    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_PASS },
    });

    const signedDateFr = new Date(signedAt).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
    });

    const mailOptions: any = {
      from: "FENUA SIM <hello@fenuasim.com>",
      subject: "✅ Contrat de location signé — FENUASIM BOX",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#A020F0">Contrat signé électroniquement</h2>
          <p>Bonjour ${rental.customer_name},</p>
          <p>Votre contrat de location FENUASIM BOX a bien été signé électroniquement.</p>
          <table style="background:#f9f9f9;padding:16px;border-radius:8px;width:100%">
            <tr><td style="color:#888">Signataire</td><td><strong>${signedName}</strong></td></tr>
            <tr><td style="color:#888">Date</td><td>${signedDateFr}</td></tr>
          </table>
          <p style="color:#888;font-size:12px;margin-top:24px">
            Conformément à l'article 1367 du Code civil, cette signature électronique a valeur légale.
          </p>
          <p>À bientôt,<br/>L'équipe FENUA SIM</p>
        </div>
      `,
    };

    if (pdfRes.ok) {
      const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
      mailOptions.attachments = [{
        filename: `contrat-location-signe-${rental.id.slice(0, 8)}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      }];
    }

    // Email au client
    await transporter.sendMail({ ...mailOptions, to: rental.customer_email });

    // Email à FENUASIM
    await transporter.sendMail({
      ...mailOptions,
      to: "contact@fenuasim.com",
      subject: `✅ [SIGNATURE] ${rental.customer_name} a signé son contrat`,
    });

  } catch (emailErr) {
    console.error("Erreur envoi email post-signature:", emailErr);
  }

  res.status(200).json({ success: true });
}
