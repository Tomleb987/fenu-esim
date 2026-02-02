import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { safeJsonParse } from "@/lib/apiResilience";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { session_id, packageId, customerId, customerEmail, customerName } = req.body
    if (!session_id || !packageId || !customerId || !customerEmail) {
      return res.status(400).json({ error: 'Données manquantes pour la commande eSIM' })
    }

    // 1. Vérifier la session Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id)
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Paiement non validé' })
    }

    // 2. Appeler la Edge Function Supabase pour créer la commande eSIM
    const edgeRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_EDGE_URL}/create-airalo-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        packageId,
        customerId,
        customerEmail,
        customerName,
        stripeSessionId: session_id
      })
    })

    // Use safe JSON parsing to handle non-JSON responses
    const parseResult = await safeJsonParse<any>(edgeRes);
    
    if (!parseResult.success) {
      console.error('Failed to parse edge function response:', parseResult.error);
      return res.status(502).json({ 
        error: 'Erreur lors de la création de la commande eSIM', 
        details: parseResult.error 
      });
    }
    
    const edgeData = parseResult.data;
    if (!edgeRes.ok) {
      return res.status(500).json({ error: 'Erreur lors de la création de la commande eSIM', details: edgeData })
    }

    // 3. Retourner les infos de la commande pour la page de succès
    return res.status(200).json({
      order: edgeData.order,
      email: customerEmail,
      name: customerName,
      stripeSessionId: session_id
    })
  } catch (error) {
    console.error('Erreur dans stripe-success:', error)
    return res.status(500).json({ error: 'Erreur lors du traitement de la commande eSIM' })
  }
} 