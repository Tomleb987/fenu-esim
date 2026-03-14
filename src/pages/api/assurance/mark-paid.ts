// src/pages/api/assurance/mark-paid.ts
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');

  const { session_id } = req.body;

  // 🛡️ SÉCURITÉ : on ne fait confiance qu'au session_id Stripe
  // insurance_id et adhesion_number sont récupérés depuis Stripe, jamais du client
  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({ error: 'session_id manquant' });
  }

  // 1️⃣ Vérification de la session Stripe côté serveur
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(session_id);
  } catch (err) {
    console.error('❌ Stripe session invalide:', err);
    return res.status(400).json({ error: 'Session Stripe invalide' });
  }

  // 2️⃣ Vérifier que le paiement est bien effectué
  if (session.payment_status !== 'paid') {
    return res.status(402).json({ error: 'Paiement non confirmé' });
  }

  // 3️⃣ Vérifier que c'est bien une assurance AVA (pas une eSIM)
  if (session.metadata?.type !== 'insurance_ava') {
    return res.status(400).json({ error: 'Type de session invalide' });
  }

  // 4️⃣ Récupérer les IDs depuis les metadata Stripe (source de vérité)
  const insurance_id = session.metadata.insurance_id;
  const adhesion_number = session.metadata.adhesion_number;

  if (!insurance_id || !adhesion_number) {
    return res.status(400).json({ error: 'Metadata Stripe incomplètes' });
  }

  // 5️⃣ Mise à jour Supabase
  const { error } = await supabaseAdmin
    .from('insurances')
    .update({ 
      status: 'paid',
      stripe_payment_intent: session.payment_intent as string,
    })
    .eq('id', insurance_id)
    .eq('adhesion_number', adhesion_number);

  if (error) {
    console.error('❌ Erreur Supabase update:', error);
    return res.status(500).json({ error: 'Erreur mise à jour Supabase' });
  }

  // 6️⃣ Récupérer les liens documents stockés par le webhook AVA
  const { data } = await supabaseAdmin
    .from('insurances')
    .select('contract_link, attestation_url')
    .eq('id', insurance_id)
    .single();

  return res.status(200).json({ 
    success: true,
    adhesion_number,
    contract_link: data?.contract_link || null,
    attestation_url: data?.attestation_url || null,
  });
}
