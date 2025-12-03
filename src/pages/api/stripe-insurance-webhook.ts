// src/pages/api/stripe-insurance-webhook.ts

import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { validateAvaAdhesion } from "@/lib/ava";

// Stripe v2025-04-30.basil (imposé par ton compte)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

// ⚠️ Stripe requiert le body brut → désactiver le parsing automatique
export const config = { api: { bodyParser: false } };

// 🔄 Convertir le body en Buffer
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

  // 🔐 Lecture & validation de l’événement Stripe
  const rawBody = await buffer(req);
  const signature = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_INSURANCE_WEBHOOK_SECRET! // ➕ Clé secrète du webhook AVA
    );
  } catch (err: any) {
    console.error("❌ Erreur de signature Stripe:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ▶️ On traite uniquement les paiements réussis
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    if (metadata.type === "insurance_ava" && metadata.adhesion_number) {
      const adhesionNumber = metadata.adhesion_number;

      console.log(`🟦 Stripe webhook → Validation AVA pour #${adhesionNumber}`);

      try {
        // 1️⃣ Appel AVA → Validation du contrat
        await validateAvaAdhesion(adhesionNumber, true); // true = prod

        // 2️⃣ Mise à jour Supabase
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

        console.log(`✅ AVA validée pour ${adhesionNumber}`);
        return res.status(200).json({ received: true, processed: true });

      } catch (err) {
        console.error("❌ Erreur lors de la validation AVA:", err);
        return res.status(500).json({ error: "AVA validation error" });
      }
    }
  }

  // Tous les autres événements Stripe sont ignorés
  return res.status(200).json({ received: true, ignored: true });
}
