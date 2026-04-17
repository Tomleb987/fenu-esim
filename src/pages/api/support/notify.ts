import { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { user_email, subject, message, priority } = req.body;

  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: "FENUA SIM <hello@fenuasim.com>",
    to: "contact@fenuasim.com",
    replyTo: user_email,
    subject: `[Support ${priority.toUpperCase()}] ${subject}`,
    html: `
      <h2>Nouveau ticket support</h2>
      <p><strong>De :</strong> ${user_email}</p>
      <p><strong>Priorité :</strong> ${priority}</p>
      <p><strong>Sujet :</strong> ${subject}</p>
      <hr/>
      <p>${message.replace(/\n/g, "<br/>")}</p>
    `,
  });

  res.status(200).json({ ok: true });
}
