import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { session_id } = req.body;
    
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    return res.status(200).json({ 
      paid: session.payment_status === 'paid',
      session_id: session.id,
      amount: session.amount_total 
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
