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

    // Récupérer la session avec le payment_intent expandé
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["payment_intent"],
    });

    // Vérification stricte :
    // 1. payment_status doit être 'paid'
    // 2. amount_total doit être > 0
    // 3. payment_intent.status doit être 'succeeded'
    const paymentIntent = session.payment_intent as Stripe.PaymentIntent | null;
    const intentSucceeded = !paymentIntent || paymentIntent.status === "succeeded";

    const isPaid =
      session.payment_status === "paid" &&
      (session.amount_total ?? 0) > 0 &&
      intentSucceeded;

    return res.status(200).json({
      paid: isPaid,
      session_id: session.id,
      amount: session.amount_total,
      payment_status: session.payment_status,
      intent_status: paymentIntent?.status ?? null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
