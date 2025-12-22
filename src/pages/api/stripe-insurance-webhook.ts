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
      // 1. Mettre à jour la base de données (Passage en 'paid')
      await supabaseAdmin
        .from("insurances")
        .update({ 
            status: "paid", 
            stripe_payment_intent: session.payment_intent as string 
        })
        .eq("adhesion_number", adhesionNumber);

      // 2. Valider le contrat chez l'assureur (AVA)
      // C'est ici que le "brouillon" devient un vrai contrat
      await validateAvaAdhesion(adhesionNumber);
      
      // 3. Envoyer l'email de confirmation (Via le canal dédié Assurance)
      if (userEmail) {
          await sendInsuranceEmail({
            to: userEmail,
            subject: "Confirmation de votre Assurance Voyage FENUASIM",
            html: `
              <div style="font-family: sans-serif; color: #333;">
                <h1 style="color: #A020F0;">Merci pour votre confiance !</h1>
                <p>Votre souscription est confirmée.</p>
                <p><strong>Numéro d'adhésion :</strong> ${adhesionNumber}</p>
                <p>Vous êtes désormais couvert par AVA Assurances via FENUASIM.</p>
                <p><em>Conservez cet email comme preuve de paiement.</em></p>
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
