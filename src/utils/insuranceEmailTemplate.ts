// src/utils/insuranceEmailTemplate.ts
// Template email assurance — responsive mobile, compatible Gmail/Outlook/Apple Mail

export interface InsuranceEmailData {
  adhesionNumber: string;
  certificatUrl?: string | null;
  attestationUrl?: string | null;
}

export function buildInsuranceEmailHtml({
  adhesionNumber,
  certificatUrl,
  attestationUrl,
}: InsuranceEmailData): string {

  const btnCertificat = certificatUrl ? `
    <tr>
      <td style="padding:6px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="background-color:#7c3aed;border-radius:10px;">
              <a href="${certificatUrl}" target="_blank"
                 style="display:block;padding:14px 20px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;line-height:1.3;">
                📄 Bulletin d'adhésion (PDF)
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>` : '';

  const btnAttestation = attestationUrl ? `
    <tr>
      <td style="padding:6px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="background-color:#ffffff;border-radius:10px;border:2px solid #7c3aed;">
              <a href="${attestationUrl}" target="_blank"
                 style="display:block;padding:12px 20px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#7c3aed;text-decoration:none;line-height:1.3;">
                📋 Attestation d'assurance signée (PDF)
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>` : '';

  const docsSection = (certificatUrl || attestationUrl) ? `
    <tr>
      <td style="padding:20px 0 4px;">
        <p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#1f2937;">
          Vos documents :
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${btnCertificat}
          ${btnAttestation}
        </table>
      </td>
    </tr>` : `
    <tr>
      <td style="padding:20px 0 4px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="background-color:#eff6ff;border-radius:10px;border:1px solid #bfdbfe;padding:16px;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:#1e40af;line-height:1.5;">
                📧 <strong>Vos documents sont en cours de génération.</strong><br/>
                Vous les recevrez dans quelques minutes, une fois validés par AVA Assurances.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Votre assurance FENUASIM est active</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:24px 16px;">

        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#16a34a 0%,#059669 100%);padding:32px 24px;">
              <p style="margin:0 0 8px;font-size:40px;line-height:1;">✅</p>
              <h1 style="margin:0;font-family:Arial,sans-serif;font-size:24px;font-weight:bold;color:#ffffff;line-height:1.3;">
                Assurance confirmée !
              </h1>
              <p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:15px;color:rgba(255,255,255,0.85);">
                Votre assurance voyage est désormais active.
              </p>
            </td>
          </tr>

          <!-- Corps -->
          <tr>
            <td style="padding:28px 24px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">

                <tr>
                  <td>
                    <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;color:#374151;line-height:1.6;">
                      Bonjour,<br/>
                      Votre paiement a bien été reçu et votre contrat est <strong>actif</strong>.
                    </p>
                  </td>
                </tr>

                <!-- Bulletin adhésion -->
                <tr>
                  <td style="padding-bottom:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                           style="background-color:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;">
                      <tr>
                        <td style="padding:16px 18px;">
                          <p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:11px;font-weight:bold;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">
                            Bulletin d'adhésion
                          </p>
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-family:Arial,sans-serif;font-size:14px;color:#6b7280;padding-bottom:8px;">
                                N° adhésion
                              </td>
                              <td align="right" style="padding-bottom:8px;">
                                <span style="font-family:'Courier New',monospace;font-size:14px;font-weight:bold;color:#111827;background:#ffffff;border:1px solid #e5e7eb;border-radius:6px;padding:3px 10px;">
                                  ${adhesionNumber}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td style="font-family:Arial,sans-serif;font-size:14px;color:#6b7280;padding-bottom:8px;">Assureur</td>
                              <td align="right" style="font-family:Arial,sans-serif;font-size:14px;font-weight:500;color:#374151;padding-bottom:8px;">AVA Assurances</td>
                            </tr>
                            <tr>
                              <td style="font-family:Arial,sans-serif;font-size:14px;color:#6b7280;">Statut</td>
                              <td align="right">
                                <span style="font-family:Arial,sans-serif;font-size:13px;font-weight:bold;color:#065f46;background:#d1fae5;border:1px solid #6ee7b7;border-radius:20px;padding:3px 12px;">
                                  ● Actif
                                </span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Documents -->
                ${docsSection}

                <!-- Notice -->
                <tr>
                  <td style="padding:16px 0 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color:#eff6ff;border-radius:10px;border:1px solid #bfdbfe;padding:14px 16px;">
                          <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#1e40af;line-height:1.6;">
                            📧 Conservez cet email comme preuve de souscription.<br/>
                            En cas de sinistre, contactez AVA Assurances avec votre numéro d'adhésion.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 24px 28px;border-top:1px solid #f3f4f6;" align="center">
              <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;color:#9ca3af;">
                🛡️ Partenaire officiel ANSET ASSURANCES
              </p>
              <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#d1d5db;">
                FENUA SIM · contact@fenuasim.com ·
                <a href="https://www.fenuasim.com" style="color:#7c3aed;text-decoration:none;">fenuasim.com</a>
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
