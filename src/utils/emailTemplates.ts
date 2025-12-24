export function createEsimEmailHTML({
  customerName,
  packageName,
  destinationName,
  dataAmount,
  dataUnit,
  validityDays,
  qrCodeUrl,
  sharingLink,
  sharingLinkCode
}: {
  customerName: string;
  packageName: string;
  destinationName: string;
  dataAmount: string;
  dataUnit: string;
  validityDays: number;
  qrCodeUrl: string;
  sharingLink: string;
  sharingLinkCode: string;
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Votre eSIM est prête !</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px; padding: 20px 0; border-bottom: 2px solid #10b981;">
          <h1 style="color: #10b981; font-size: 28px; margin: 0; font-weight: bold;">
            🌐 Votre eSIM est prête !
          </h1>
          <p style="font-size: 16px; color: #666; margin: 10px 0 0 0;">
            Bonjour ${customerName}, votre eSIM pour <strong>${destinationName}</strong> est maintenant disponible.
          </p>
        </div>

        <!-- Package Details -->
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #10b981;">
          <h2 style="font-size: 20px; margin: 0 0 15px 0; color: #374151;">
            📋 Détails de votre forfait
          </h2>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">🎯 Destination:</td>
              <td style="padding: 8px 0; color: #111827;">${destinationName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">📦 Forfait:</td>
              <td style="padding: 8px 0; color: #111827;">${packageName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">📊 Données:</td>
              <td style="padding: 8px 0; color: #111827;">${dataAmount === "illimité" ? "illimité" : `${dataAmount} ${dataUnit}`}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #10b981;">
          <h2 style="font-size: 20px; margin: 0 0 15px 0; color: #374151;">
            📋 Activer votre eSIM
          </h2>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">🎯 lien d’activation:</td>
              <td style="padding: 8px 0; color: #111827;">${sharingLink}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">📦 Code d'accès:</td>
              <td style="padding: 8px 0; color: #111827;">${sharingLinkCode}</td>
            </tr>
          </table>
        </div>

        <!-- QR Code Section -->
        <div style="text-align: center; margin-bottom: 30px; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h2 style="font-size: 20px; margin: 0 0 15px 0; color: #374151;">
            📱 Scannez votre code QR
          </h2>
          <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; display: inline-block; border: 2px dashed #e5e7eb;">
            <img 
              src="${qrCodeUrl}" 
              alt="eSIM QR Code" 
              style="width: 200px; height: 200px; display: block; border-radius: 4px;"
            />
          </div>
          <p style="font-size: 14px; color: #6b7280; margin: 15px 0 0 0; font-style: italic;">
            Utilisez l'appareil photo de votre téléphone pour scanner ce code QR
          </p>
        </div>

        <!-- Installation Steps -->
        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #3b82f6;">
          <h2 style="font-size: 20px; margin: 0 0 15px 0; color: #1e40af;">
            🚀 Installation en 3 étapes simples
          </h2>
          <ol style="margin: 0; padding-left: 20px; color: #374151;">
            <li style="margin-bottom: 12px; line-height: 1.5;">
              <strong>Scannez le code QR</strong> avec l'appareil photo de votre téléphone
            </li>
            <li style="margin-bottom: 12px; line-height: 1.5;">
              <strong>Suivez les instructions</strong> pour ajouter l'eSIM à votre appareil
            </li>
            <li style="margin-bottom: 12px; line-height: 1.5;">
              <strong>Activez votre eSIM</strong> dans les paramètres "Données cellulaires"
            </li>
          </ol>
        </div>

        <!-- Important Notice -->
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong>⚠️ Important:</strong> Gardez ce code QR en sécurité. Vous en aurez besoin pour installer votre eSIM.
          </p>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #6b7280; text-align: center;">
          <p style="margin: 0 0 10px 0;">
            Cet email contient votre eSIM personnalisée. Ne le partagez avec personne.
          </p>
          <p style="margin: 0;">
            Pour toute question, contactez notre support à <strong>sav@fenuasim.com</strong>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
