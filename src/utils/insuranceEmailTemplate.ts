// src/utils/insuranceEmailTemplate.ts

interface InsuranceEmailData {
  adhesionNumber: string;
  certificatUrl?: string | null;
  attestationUrl?: string | null;
  firstName?: string;
  lastName?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  productLabel?: string;
}

export function insuranceEmailHtml({
  adhesionNumber,
  certificatUrl,
  attestationUrl,
  firstName,
  lastName,
  destination,
  startDate,
  endDate,
  productLabel,
}: InsuranceEmailData): string {

  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Madame, Monsieur";
  const formatDate = (d?: string | null) => {
    if (!d) return null;
    try { return new Date(d).toLocaleDateString("fr-FR"); } catch { return null; }
  };
  const dateDepart = formatDate(startDate);
  const dateRetour = formatDate(endDate);

  const btnCertificat = certificatUrl ? `
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 12px;width:100%;">
                <tr>
                  <td style="background-color:#A020F0;border-radius:10px;text-align:center;">
                    <a href="${certificatUrl}" target="_blank"
                       style="display:block;padding:14px 20px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">
                      Télécharger mon certificat d'assurance
                    </a>
                  </td>
                </tr>
              </table>` : '';

  const btnAttestation = '';

  const docsSection = (certificatUrl || attestationUrl) ? `
            <tr>
              <td style="padding:24px 40px 8px;">
                <p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#1a0533;text-align:center;">
                  Vos documents sont disponibles :
                </p>
                ${btnCertificat}
                ${btnAttestation}
              </td>
            </tr>` : `
            <tr>
              <td style="padding:20px 40px 8px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#eff6ff;border-radius:10px;border:1px solid #bfdbfe;padding:14px 16px;">
                      <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#1e40af;line-height:1.6;">
                        Vos documents sont en cours de generation par AVA Assurances.<br/>
                        Vous les recevrez dans quelques minutes.
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
  <title>Votre assurance voyage FENUA SIM est active</title>
</head>
<body style="margin:0;padding:0;background-color:#f8f7ff;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7ff;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#A020F0 0%,#FF4D6D 50%,#FF7F11 100%);padding:36px 40px;text-align:center;">
            <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
              FENUA<span style="opacity:0.5;">•</span>SIM
            </div>
            <div style="color:rgba(255,255,255,0.75);font-size:12px;margin-top:4px;letter-spacing:1px;text-transform:uppercase;">
              Assurance Voyage — Partenaire AVA
            </div>
            <div style="margin-top:20px;font-size:44px;line-height:1;">✅</div>
            <h1 style="margin:10px 0 4px;font-family:Arial,sans-serif;font-size:22px;font-weight:800;color:#ffffff;">
              Votre assurance est active !
            </h1>
            <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:rgba(255,255,255,0.8);">
              Votre contrat a bien été enregistré et validé.
            </p>
          </td>
        </tr>

        <!-- SALUTATION -->
        <tr>
          <td style="padding:32px 40px 0;">
            <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:17px;font-weight:600;color:#1a0533;">
              Bonjour ${fullName},
            </p>
            <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:#4a5568;line-height:1.6;">
              Votre paiement a bien été reçu. Votre couverture est désormais
              <strong style="color:#16a34a;">active</strong>.
              Retrouvez ci-dessous le récapitulatif de votre contrat et vos documents.
            </p>
          </td>
        </tr>

        <!-- CARTE RECAP -->
        <tr>
          <td style="padding:20px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#faf5ff;border-radius:12px;border:1.5px solid #e9d5ff;">
              <tr>
                <td style="padding:20px 22px;">
                  <div style="font-size:11px;font-weight:700;color:#A020F0;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">
                    🛡️ ${productLabel || "Assurance Voyage AVA"}
                  </div>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e9d5ff;font-family:Arial,sans-serif;font-size:13px;color:#6b7280;">
                        Assuré principal
                      </td>
                      <td style="text-align:right;padding:8px 0;border-bottom:1px solid #e9d5ff;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#1a0533;">
                        ${fullName}
                      </td>
                    </tr>
                    ${destination ? `
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e9d5ff;font-family:Arial,sans-serif;font-size:13px;color:#6b7280;">
                        Destination
                      </td>
                      <td style="text-align:right;padding:8px 0;border-bottom:1px solid #e9d5ff;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#1a0533;">
                        ${destination}
                      </td>
                    </tr>` : ""}
                    ${dateDepart ? `
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e9d5ff;font-family:Arial,sans-serif;font-size:13px;color:#6b7280;">
                        Départ
                      </td>
                      <td style="text-align:right;padding:8px 0;border-bottom:1px solid #e9d5ff;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#1a0533;">
                        ${dateDepart}
                      </td>
                    </tr>` : ""}
                    ${dateRetour ? `
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e9d5ff;font-family:Arial,sans-serif;font-size:13px;color:#6b7280;">
                        Retour
                      </td>
                      <td style="text-align:right;padding:8px 0;border-bottom:1px solid #e9d5ff;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#1a0533;">
                        ${dateRetour}
                      </td>
                    </tr>` : ""}
                    <tr>
                      <td style="padding:10px 0 0;font-family:Arial,sans-serif;font-size:13px;color:#6b7280;">
                        N° Adhésion
                      </td>
                      <td style="text-align:right;padding:10px 0 0;">
                        <span style="font-family:'Courier New',monospace;font-size:14px;font-weight:bold;color:#A020F0;background:#ffffff;border:1.5px solid #e9d5ff;border-radius:6px;padding:3px 10px;">
                          ${adhesionNumber}
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- DOCUMENTS -->
        ${docsSection}

        <!-- SINISTRE -->
        <tr>
          <td style="padding:16px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;padding:14px 16px;">
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#15803d;line-height:1.7;">
                    <strong>En cas de sinistre</strong><br/>
                    Contactez AVA Assurances en mentionnant votre numéro d'adhésion
                    <strong>${adhesionNumber}</strong>.<br/>
                    Conservez cet email comme justificatif de votre couverture.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#faf5ff;padding:20px 40px 24px;border-top:1px solid #f0e8ff;text-align:center;">
            <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#A020F0;">
              FENUA SIM — Partenaire AVA Assurances
            </p>
            <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#cbd5e1;">
              <a href="https://fenuasim.com" style="color:#A020F0;text-decoration:none;">fenuasim.com</a>
              &nbsp;·&nbsp;
              <a href="mailto:hello@fenuasim.com" style="color:#A020F0;text-decoration:none;">hello@fenuasim.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
