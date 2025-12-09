import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { validateAvaAdhesion } from "@/lib/ava";
import { sendEmail } from "@/utils/sendEmail"; // Assurez-vous d'avoir une fonction d'envoi d'email

// Important : Stripe a besoin du corps brut pour vérifier la signature
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16', // Utilisez une version stable récente
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_INSURANCE!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"]!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Erreur Webhook Stripe: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // On écoute uniquement le succès du paiement
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Vérifier que c'est bien une vente d'assurance
    if (session.metadata?.type !== 'insurance_ava') {
        return res.json({ received: true, ignored: true });
    }

    const adhesionNumber = session.metadata.adhesion_number;
    const userEmail = session.customer_email || session.metadata.user_email;

    console.log(`💰 Paiement reçu pour l'adhésion AVA n°${adhesionNumber}`);

    try {
      // 1. Mettre à jour Supabase : Statut PAYÉ
      const { error: updateError } = await supabaseAdmin
        .from("insurances")
        .update({ 
            status: "paid", 
            stripe_payment_intent: session.payment_intent as string 
        })
        .eq("adhesion_number", adhesionNumber);

      if (updateError) console.error("Erreur update Supabase:", updateError);

      // 2. Valider le contrat chez AVA (Essentiel !)
      // C'est cette étape qui transforme le devis/brouillon en vrai contrat
      const validationResult = await validateAvaAdhesion(adhesionNumber);
      
      console.log("✅ Contrat AVA validé :", validationResult);

      // 3. Envoyer l'email de confirmation avec le contrat
      // Vous pouvez récupérer le lien du contrat depuis validationResult ou depuis Supabase
      if (userEmail) {
          await sendEmail({
            to: userEmail,
            subject: "Votre Assurance Voyage FENUASIM - Confirmation",
            html: `
              <h1>Merci pour votre souscription !</h1>
              <p>Votre paiement a été validé.</p>
              <p>Votre numéro d'adhésion : <strong>${adhesionNumber}</strong></p>
              <p>Vous recevrez votre certificat d'assurance directement par AVA ou via ce lien si disponible.</p>
            `,
          });
      }

    } catch (err) {
      console.error("❌ Erreur lors de la validation post-paiement :", err);
      // Ne pas renvoyer d'erreur 500 à Stripe sinon il va réessayer en boucle
      // Mieux vaut logger l'erreur et alerter l'admin
    }
  }

  res.json({ received: true });
}
