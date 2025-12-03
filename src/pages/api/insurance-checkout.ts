import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { creationAdhesion } from '@/lib/ava';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil' as any,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST')
    return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { quoteData, userEmail } = req.body;

    if (!quoteData || !userEmail) {
      return res.status(400).json({ error: "Missing quoteData or userEmail" });
    }

    // 1️⃣ Création du contrat AVA
    const internalRef = `CMD-${Date.now()}`;
    const avaResult = await creationAdhesion({
      ...quoteData,
      internalReference: internalRef
    });

    if (!avaResult) {
      return res.status(400).json({ error: "Réponse AVA invalide" });
    }

    const adhesionNumber =
      avaResult.id_adhesion ||
      avaResult.id_contrat;

    if (!adhesionNumber) {
      return res.status(400).json({
        error: "Numéro d'adhésion manquant dans AVA",
        detail: avaResult
      });
    }

    // Convertir le prix (gérer virgule éventuelle)
    let price = avaResult.montant_total;
    if (typeof price === "string") {
      price = price.replace(',', '.');
      price = parseFloat(price);
    }

    if (isNaN(price)) {
      return res.status(400).json({ error: "Montant AVA invalide" });
    }

    // 2️⃣ Enregistrement Supabase
    const { data: insertData, error: supaError } = await supabaseAdmin
      .from('insurances')
      .insert({
        user_email: userEmail,
        subscriber_first_name: quoteData.subscriber?.firstName,
        subscriber_last_name: quoteData.subscriber?.lastName,
        product_type: quoteData.productType,
        adhesion_number: adhesionNumber,
        total_amount: price,
        status: 'pending_payment',
      })
      .select()
      .single();

    if (supaError) {
      console.error("Supabase insert error:", supaError);
      return res.status(500).json({ error: "Supabase insert error" });
    }

    // 3️⃣ Création session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'], // compatibilité ok
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Assurance AVA (${adhesionNumber})`
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/assurance`,
      customer_email: userEmail,
      metadata: {
        type: 'insurance_ava',
        adhesion_number: adhesionNumber,
        insurance_id: insertData?.id ?? "",
      },
    });

    return res.status(200).json({ url: session.url });

  } catch (error: any) {
    console.error("❌ API insurance error:", error);
    return res.status(500).json({ error: error.message });
  }
}
