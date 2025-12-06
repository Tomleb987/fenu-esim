// src/pages/api/stripe-insurance-webhook.ts
import type { NextApiRequest, NextApiResponse } from "next"; 
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { validateAvaAdhesion } from "@/lib/ava";

// Stripe avec version imposée
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil" as any,
});

export const config = { api: { bodyParser: false } };

async function buffer(readable: any) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"];
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      buf, 
      sig!, 
      process.env.STRIPE_INSURANCE_WEBHOOK_SECRET! 
    );
  } catch (err: any) {
    console.error(`❌ Stripe signature error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 🎯 Paiement Stripe validé
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    if (metadata.type === "insurance_ava" && metadata.adhesion_number) {
      console.log(`🚑 Webhook Assurance : Validation contrat ${metadata.adhesion_number}`);
      
      try {
        // 1️⃣ Appel AVA et récupération PDF
        const ava = await validateAvaAdhesion(metadata.adhesion_number);
        console.log("📄 Réponse AVA validation :", ava);

        // 2️⃣ Extraction PDF AVA
        const certificateUrl =
          ava?.certificat_de_garantie ||
          ava?.certificat_garantie ||
          ava?.certificate ||
          null;

        const attestationUrl =
          ava?.attestation_assurance ||
          ava?.attestation ||
          null;

        console.log("📎 URLs extraites :", { certificateUrl, attestationUrl });

        // 3️⃣ Mise à jour Supabase
        await supabaseAdmin
          .from("insurances")
          .update({
            status: "validated",
            stripe_session_id: session.id,
            certificate_url: certificateUrl,
            attestation_url: attestationUrl,
          })
          .eq("adhesion_number", metadata.adhesion_number);
          
        return res.status(200).json({ received: true, processed: true });

      } catch (error) {
        console.error("Erreur validation Assurance:", error);
        return res.status(500).json({ error: "Erreur validation" });
      }
    }
  }

  return res.status(200).json({ received: true, ignored: true });
}
