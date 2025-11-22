import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // Assurez-vous que ce fichier existe bien
import { validateAvaAdhesion } from "@/lib/ava";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil", 
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
    // ⚠️ CHANGEMENT ICI : Utilisez une nouvelle variable pour ne pas casser l'existant
    event = stripe.webhooks.constructEvent(
      buf, 
      sig!, 
      process.env.STRIPE_INSURANCE_WEBHOOK_SECRET! // <--- Nouvelle variable à ajouter dans .env
    );
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    // On ne traite QUE l'assurance ici
    if (metadata.type === 'insurance_ava' && metadata.adhesion_number) {
      console.log(`🚑 Webhook Assurance : Validation contrat ${metadata.adhesion_number}`);
      
      try {
        // 1. Valider chez AVA
        await validateAvaAdhesion(metadata.adhesion_number);
        
        // 2. Mettre à jour Supabase
        await supabaseAdmin
          .from('insurances')
          .update({ 
            status: 'validated', 
            stripe_session_id: session.id 
          })
          .eq('adhesion_number', metadata.adhesion_number);
          
        return res.status(200).json({ received: true, processed: true });
      } catch (error) {
        console.error("Erreur validation Assurance:", error);
        return res.status(500).json({ error: "Erreur validation" });
      }
    }
  }

  // Si ce n'est pas une assurance, on ignore (200 OK) pour ne pas bloquer Stripe
  return res.status(200).json({ received: true, ignored: true });
}
