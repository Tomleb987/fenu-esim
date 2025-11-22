import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { validateAvaAdhesion } from "@/lib/ava";

// Stripe avec version imposée par ton compte : 2025-04-30.basil
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

// Stripe a besoin du RAW BODY → bodyParser OFF
export const config = { api: { bodyParser: false } };

// Convertir le stream en buffer brut (obligatoire pour Stripe)
async function buffer(stream: any) {
  const chunks: any[] = [];
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

  // Vérification signature Stripe
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_INSURANCE_WEBHOOK_SECRET! // SECRET DU WEBHOOK AVA
    );
  } catch (err: any) {
    console.error("❌ Stripe signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // On traite uniquement checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    // Assurer que c’est bien une assurance AVA
    if (metadata.type === "insurance_ava" && metadata.adhesion_number) {
      const adhesionNumber = metadata.adhesion_number;

      console.log(`🟦 Webhook AVA → Validation de l'adhésion #${adhesionNumber}`);

      try {
        // Étape 1 : vérification AVA
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

        console.log("✅ Assurance AVA validée avec succès");
        return res.status(200).json({ received: true, processed: true });
      } catch (err) {
        console.error("❌ Erreur validation AVA:", err);
        return res.status(500).json({ error: "AVA validation error" });
      }
    }
  }

  // Tous les autres événements Stripe → on ignore pour éviter les erreurs
  return res.status(200).json({ received: true, ignored: true });
}
