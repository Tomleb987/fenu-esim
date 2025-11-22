import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { validateAvaAdhesion } from "@/lib/ava";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20", // version stable Stripe
});

// Obligatoire : Stripe envoie un buffer brut
export const config = { api: { bodyParser: false } };

// Fonction utilitaire pour récupérer le raw body
async function buffer(stream: any) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const rawBody = await buffer(req);
  const signature = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;

  // Vérification de la signature Stripe
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_INSURANCE_WEBHOOK_SECRET! // DOIT être présent dans Vercel
    );
  } catch (err: any) {
    console.error("❌ Stripe webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // On traite seulement checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    // Assurer qu'on traite bien les assurances AVA uniquement
    if (metadata.type === "insurance_ava" && metadata.adhesion_number) {
      const adhesionNumber = metadata.adhesion_number;

      console.log(`🟦 Insurance webhook: Trying to validate AVA adhesion #${adhesionNumber}`);

      try {
        // Étape 1 : validation via AVA
        await validateAvaAdhesion(adhesionNumber);

        // Étape 2 : mise à jour Supabase
        const { error: supaError } = await supabaseAdmin
          .from("insurances")
          .update({
            status: "validated",
            stripe_session_id: session.id,
          })
          .eq("adhesion_number", adhesionNumber);

        if (supaError) {
          console.error("❌ Supabase update error:", supaError);
          return res.status(500).json({ error: "Supabase update error" });
        }

        console.log("✅ AVA insurance validated successfully.");
        return res.status(200).json({ received: true, processed: true });
      } catch (err) {
        console.error("❌ Error validating AVA insurance:", err);
        return res.status(500).json({ error: "AVA validation error" });
      }
    }
  }

  // Tout autre événement est ignoré volontairement
  return res.status(200).json({ received: true, ignored: true });
}
