// src/pages/api/partner/send-payment-link.ts
import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";

export const config = { api: { bodyParser: true } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const {
    clientEmail,
    clientFirstName,
    clientLastName,
    packageName,
    destination,
    dataAmount,
    validityDays,
    amount,
    currency,
    paymentUrl,
    advisorName,
  } = req.body;

  if (!clientEmail || !paymentUrl) {
    return res.status(400).json({ error: "clientEmail et paymentUrl sont requis" });
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

  const formattedAmount = currency === "xpf"
    ? `${Math.round(amount).toLocaleString("fr")} XPF`
    : `${Number(amount).toFixed(2)} €`;

  const emailHTML = createPaymentLinkEmailHTML({
    clientFirstName,
    clientLastName,
    packageName,
    destination,
    dataAmount,
    validityDays,
    formattedAmount,
    paymentUrl,
    advisorName,
  });

  try {
    const info = await transporter.sendMail({
      from: `"FENUA SIM" <hello@fenuasim.com>`,
      to: clientEmail,
      bcc: "clients@fenua-sim.odoo.com",
      replyTo: `"FENUA SIM" <hello@fenuasim.com>`,
      subject: `Votre lien de paiement eSIM — ${destination || packageName}`,
      html: emailHTML,
      text: `Bonjour ${clientFirstName},\n\nVoici votre lien de paiement sécurisé pour votre eSIM :\n${paymentUrl}\n\nMontant : ${formattedAmount}\n\nCe lien est valable 24h.\n\nL'équipe FENUA SIM`,
    });

    console.log("✅ Email lien paiement envoyé:", info.messageId, "→", clientEmail);
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error("❌ Erreur envoi email lien paiement:", error);
    return res.status(500).json({ error: error.message });
  }
}

function createPaymentLinkEmailHTML({
  clientFirstName,
  clientLastName,
  packageName,
  destination,
  dataAmount,
  validityDays,
  formattedAmount,
  paymentUrl,
  advisorName,
}: {
  clientFirstName: string;
  clientLastName: string;
  packageName: string;
  destination: string;
  dataAmount: string;
  validityDays: string;
  formattedAmount: string;
  paymentUrl: string;
  advisorName: string;
}) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre lien de paiement eSIM</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0a4a6e 0%,#0e6899 60%,#00b8d4 100%);padding:40px 40px 32px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                Fenua<span style="color:#67e8f9;">SIM</span>
              </div>
              <div style="color:rgba(255,255,255,0.7);font-size:13px;margin-top:4px;letter-spacing:1px;text-transform:uppercase;">
                Connectez-vous partout dans le monde
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="font-size:18px;font-weight:600;color:#1a1a2e;margin:0 0 8px;">
                Bonjour ${clientFirstName} ${clientLastName} 👋
              </p>
              <p style="font-size:15px;color:#4a5568;margin:0 0 32px;line-height:1.6;">
                ${advisorName || "Votre conseiller FenuaSIM"} vous a préparé un lien de paiement sécurisé pour votre eSIM. Cliquez ci-dessous pour finaliser votre commande en quelques secondes.
              </p>

              <!-- Package Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7ff;border-radius:12px;border:1.5px solid #bfdbfe;margin-bottom:32px;">
                <tr>
                  <td style="padding:24px;">
                    <div style="font-size:11px;font-weight:600;color:#0e6899;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">📦 Votre forfait</div>
                    <div style="font-size:20px;font-weight:700;color:#0a4a6e;margin-bottom:16px;">${packageName}</div>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding:6px 0;border-bottom:1px solid #dbeafe;">
                        <table width="100%"><tr>
                          <td style="font-size:13px;color:#64748b;">🌍 Destination</td>
                          <td style="font-size:13px;font-weight:600;color:#1a1a2e;text-align:right;">${destination || "—"}</td>
                        </tr></table>
                      </td></tr>
                      <tr><td style="padding:6px 0;border-bottom:1px solid #dbeafe;">
                        <table width="100%"><tr>
                          <td style="font-size:13px;color:#64748b;">📶 Données</td>
                          <td style="font-size:13px;font-weight:600;color:#1a1a2e;text-align:right;">${dataAmount || "—"}</td>
                        </tr></table>
                      </td></tr>
                      <tr><td style="padding:6px 0;border-bottom:1px solid #dbeafe;">
                        <table width="100%"><tr>
                          <td style="font-size:13px;color:#64748b;">📅 Validité</td>
                          <td style="font-size:13px;font-weight:600;color:#1a1a2e;text-align:right;">${validityDays || "—"}</td>
                        </tr></table>
                      </td></tr>
                      <tr><td style="padding:10px 0 0;">
                        <table width="100%"><tr>
                          <td style="font-size:14px;font-weight:600;color:#0a4a6e;">💰 Montant total</td>
                          <td style="font-size:20px;font-weight:700;color:#0a4a6e;text-align:right;">${formattedAmount}</td>
                        </tr></table>
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <a href="${paymentUrl}" style="display:inline-block;background:#0a4a6e;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:16px 48px;border-radius:10px;">
                      💳 Payer maintenant
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Lien texte -->
              <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:24px;border:1px solid #e2e8f0;">
                <p style="font-size:12px;color:#94a3b8;margin:0 0 6px;">Ou copiez ce lien dans votre navigateur :</p>
                <p style="font-size:11px;color:#0e6899;margin:0;word-break:break-all;font-family:monospace;">${paymentUrl}</p>
              </div>

              <!-- Sécurité -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="font-size:13px;font-weight:600;color:#15803d;margin:0 0 4px;">🔒 Paiement 100% sécurisé</p>
                    <p style="font-size:12px;color:#166534;margin:0;">Votre paiement est traité par Stripe. Vos données bancaires ne sont jamais partagées.</p>
                  </td>
                </tr>
              </table>

              <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">
                ⏱ Ce lien est valable <strong>24 heures</strong>. Passé ce délai, contactez votre conseiller.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="font-size:13px;font-weight:600;color:#0a4a6e;margin:0 0 4px;">FENUA SIM</p>
              <p style="font-size:12px;color:#94a3b8;margin:0 0 8px;">Votre eSIM pour voyager partout dans le monde</p>
              <p style="font-size:11px;color:#cbd5e1;margin:0;">
                <a href="https://fenuasim.com" style="color:#0e6899;text-decoration:none;">fenuasim.com</a>
                &nbsp;·&nbsp;
                <a href="mailto:hello@fenuasim.com" style="color:#0e6899;text-decoration:none;">hello@fenuasim.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
