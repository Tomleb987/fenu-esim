import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createAvaAdhesion } from '@/lib/ava';
import Stripe from 'stripe';

// ✅ Correction API Stripe version (évite l'erreur de build)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil' as any,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { quoteData, userEmail } = req.body;

    if (!quoteData || !userEmail) {
      return res.status(400).json({ error: "quoteData ou userEmail manquant" });
    }

    // 🔐 Référence unique pour le contrat AVA
    const internalRef = `CMD-${Date.now()}`;

    // 1️⃣ Création temporaire du contrat AVA (non validé)
    const avaResult = await createAvaAdhesion({
      ...quoteData,
      internalReference: internalRef,
    });

    if (!avaResult) {
      return res.status(400).json({ error: "Réponse AVA invalide ou vide" });
    }

    const adhesionNumber = avaResult.id_adhesion || avaResult.id_contrat;

    if (!adhesionNumber) {
      return res.status(400).json({
        error: "Numéro d'adhésion manquant dans la réponse AVA",
        detail: avaResult,
      });
    }

    // 2️⃣ Conversion du tarif AVA
    let price = avaResult.montant_total;
    if (typeof price === "string") {
      price = parseFloat(price.replace(',', '.'));
    }

    if (isNaN(price)) {
      return res.status(400).json({ error: "Montant AVA invalide", raw: avaResult.montant_total });
    }

    // 3️⃣ Sauvegarde temporaire dans Supabase
    const { data: insertData, error: supaError } = await supabaseAdmin
      .from('insurances')
      .insert({
        user_email: userEmail,
        subscriber_first_name: quoteData.subscriber?.firstName ?? null,
        subscriber_last_name: quoteData.subscriber?.lastName ?? null,
        product_type: quoteData.productType,
        adhesion_number: adhesionNumber,
        total_amount: price,
        status: 'pending_payment',
      })
      .select()
      .single();

    if (supaError) {
      console.error("❌ Supabase insert error:", supaError);
      return res.status(500).json({ error: "Erreur enregistrement Supabase" });
    }

    // 4️⃣ Création de la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Assurance AVA – ${adhesionNumber}`,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/assurance`,
      customer_email: userEmail,
      metadata: {
        type: 'insurance_ava',
        adhesion_number: adhesionNumber,
        insurance_id: insertData?.id ?? "",
      },
    });

    // ✅ Retourner l’URL Stripe au frontend
    return res.status(200).json({ url: session.url });

  } catch (error: any) {
    console.error("❌ API insurance-checkout error:", error);
    return res.status(500).json({ error: error.message ?? "Erreur serveur" });
  }
}
