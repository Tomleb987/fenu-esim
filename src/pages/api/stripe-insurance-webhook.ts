import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { validateAvaAdhesion } from "@/lib/ava";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20", // ✔️ Version stable Stripe
});

// Next.js doit désactiver le bodyParser → obligatoire pour les webhooks Stripe
export const config = { api: { bodyParser: false } };

// Reconstituer le buffer brut
async function buffer(readable: any) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  const buf = await buffer(req);
  const signature = req.headers["stripe-signature"];
  let event: Stripe.Event;

  // ----------------------------
  //  ✔️ Vérification Stripe
  // ----------------------------
  try {
    event = stripe.webhooks.constructEvent(
      buf,
      signature!,
      process.env.STRIPE_INSURANCE_WEBHOOK_SECRET! // ✔️ Clé de ce webhook assurance uniquement
    );
  } catch (err: any) {
    console.error("❌ Erreur signature webhook:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ----------------------------
  //  ✔️ Traitement de l'assurance AVA
  // ----------------------------
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    if (metadata.type === "insurance_ava" && metadata.adhesion_number) {
      console.log(
        `🚑 Webhook Assurance → Validation du contrat AVA #${metadata.adhesion_number}`
      );

      try {
        // 1) Vérification AVA
        await validateAvaAdhesion(metadata.adhesion_number);

        // 2) Mise à jour Supabase
        const { error: supaError } = await supabaseAdmin
          .from("insurances")
          .update({
            status: "validated",
            stripe_session_id: session.id,
          })
          .eq("adhesion_number", metadata.adhesion_number);

        if (supaError) {
          console.error("❌ Erreur Supabase:", supaError);
          return res.status(500).json({ error: "Erreur Supabase" });
        }

        console.log("✔️ Assurance validée et mise à jour Supabase.");
        return res.status(200).json({ received: true, processed: true });
      } catch (error) {
        console.error("❌ Erreur validation Assurance AVA:", error);
        return res.status(500).json({ error: "Erreur validation AVA" });
      }
    }
  }

  // ----------------------------
  //  ✔️ On ignore poliment si ce n'est pas une assurance AVA
  // ----------------------------
  return res.status(200).json({ received: true, ignored: true });
}
