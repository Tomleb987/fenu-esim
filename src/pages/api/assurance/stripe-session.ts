// src/pages/api/assurance/stripe-session.ts
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

// ⚠️ IMPORTANT : garder la même version que dans insurance-checkout.ts
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil' as any,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { session_id } = req.query;

  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({ error: 'Session ID manquant' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    return res.status(200).json({ session });
  } catch (err: any) {
    console.error("❌ Erreur Stripe session:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
