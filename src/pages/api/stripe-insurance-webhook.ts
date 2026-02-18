import { buffer } from "micro"; // Nécessaire pour Stripe
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { validateAvaAdhesion } from "@/lib/ava";
// 👇 Import du service dédié (aucun risque de conflit avec eSIM)
import { sendInsuranceEmail } from "@/utils/sendInsuranceEmail"; 

// Configuration Next.js pour ne pas parser le body (Stripe le veut brut)
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_INSURANCE!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  let event: Stripe.Event;

  try {
    const buf = await buffer(req);
    const sig = req.headers["stripe-signature"]!;
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Erreur Signature Webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Filtrage : On ne traite que les succès de paiement
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // 🛡️ SÉCURITÉ : On vérifie que c'est bien une ASSURANCE
    // Si c'est une eSIM, ce code l'ignore totalement -> Pas de conflit.
    if (session.metadata?.type !== 'insurance_ava') {
        console.log("Ignoré par le webhook assurance (Type incorrect)");
        return res.json({ received: true, ignored: true });
    }

    const adhesionNumber = session.metadata.adhesion_number;
    const userEmail = session.customer_email || session.metadata.user_email;

    console.log(`💰 Paiement Assurance validé pour ${adhesionNumber}`);

    try {
      // 1. Mettre à jour le statut dans Supabase (paiement reçu)
      await supabaseAdmin
        .from("insurances")
        .update({ 
            status: "paid", 
            stripe_payment_intent: session.payment_intent as string 
        })
        .eq("adhesion_number", adhesionNumber);

      // 2. Valider le contrat chez l'assureur (AVA) — récupère le certificat et l'attestation
      const avaValidation = await validateAvaAdhesion(adhesionNumber);
      console.log("📄 Documents AVA reçus:", avaValidation);

      // 3. Mettre à jour Supabase avec les URLs des documents
      if (avaValidation.certificat_url || avaValidation.attestation_url) {
          await supabaseAdmin
              .from("insurances")
              .update({
                  contract_link: avaValidation.certificat_url,
                  attestation_url: avaValidation.attestation_url,
                  status: "active",
              })
              .eq("adhesion_number", adhesionNumber);
      }

      // 4. Envoyer l'email de confirmation avec les liens documents
      if (userEmail) {
          const certificatSection = avaValidation.certificat_url
              ? `<p style="margin-top:16px;">
                    <a href="${avaValidation.certificat_url}" 
                       style="background:#A020F0;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
                       📄 Télécharger votre Certificat de Garantie
                    </a>
                 </p>`
              : `<p style="color:#666;font-size:14px;">Votre certificat sera envoyé par AVA Assurances dans les prochaines minutes.</p>`;

          const attestationSection = avaValidation.attestation_url
              ? `<p style="margin-top:12px;">
                    <a href="${avaValidation.attestation_url}"
                       style="color:#A020F0;text-decoration:underline;">
                       📋 Télécharger l'Attestation d'Assurance signée
                    </a>
                 </p>`
              : "";

          await sendInsuranceEmail({
              to: userEmail,
              subject: "✅ Votre Assurance Voyage FENUASIM est active",
              html: `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto;">
                  <div style="background: #A020F0; padding: 24px; border-radius: 12px 12px 0 0; text-align:center;">
                    <h1 style="color: white; margin: 0;">Assurance confirmée !</h1>
                  </div>
                  <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #eee;">
                    <p>Bonjour,</p>
                    <p>Votre paiement a bien été reçu et votre assurance voyage est désormais <strong>active</strong>.</p>
                    <p><strong>Numéro d'adhésion :</strong> <code style="background:#eee;padding:2px 6px;border-radius:4px;">${adhesionNumber}</code></p>
                    ${certificatSection}
                    ${attestationSection}
                    <hr style="margin: 24px 0; border:none; border-top:1px solid #eee;" />
                    <p style="font-size:13px;color:#888;">
                      Conservez cet email comme preuve de souscription.<br/>
                      En cas de sinistre, contactez AVA directement avec votre numéro d'adhésion.
                    </p>
                  </div>
                </div>
              `,
          });
      }

    } catch (err) {
      console.error("❌ Erreur traitement post-paiement :", err);
      // On retourne 200 pour éviter que Stripe ne réessaie en boucle si c'est une erreur logique
      return res.json({ received: true, error: "Processing failed" });
    }
  }

  res.json({ received: true });
}
