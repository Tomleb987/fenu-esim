import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin'; // Assurez-vous d'avoir créé ce fichier
import { createAvaAdhesion } from '@/lib/ava'; // Assurez-vous d'avoir créé ce fichier

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-04-30.basil' as any });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { quoteData, userEmail } = req.body;
    
    // 1. Créer le contrat AVA
    const internalRef = `CMD-${Date.now()}`;
    const avaResult = await createAvaAdhesion({ ...quoteData, internalReference: internalRef });

    if (!avaResult || (!avaResult.id_adhesion && !avaResult.id_contrat)) {
      return res.status(400).json({ error: "Erreur AVA: " + JSON.stringify(avaResult) });
    }
    const adhesionNumber = avaResult.id_adhesion || avaResult.id_contrat;
    const price = parseFloat(avaResult.montant_total);

    // 2. Sauvegarder dans Supabase
    const { data: insertData, error } = await supabaseAdmin
      .from('insurances')
      .insert({
        user_email: userEmail,
        subscriber_first_name: quoteData.subscriber.firstName,
        subscriber_last_name: quoteData.subscriber.lastName,
        product_type: quoteData.productType,
        adhesion_number: adhesionNumber,
        total_amount: price,
        status: 'pending_payment',
      })
      .select().single();

    // 3. Session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `Assurance AVA (${adhesionNumber})` },
          unit_amount: Math.round(price * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/checkout/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/assurance`,
      metadata: {
        type: 'insurance_ava',
        adhesion_number: adhesionNumber,
        insurance_id: insertData?.id
      },
      customer_email: userEmail,
    });

    return res.status(200).json({ url: session.url });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
