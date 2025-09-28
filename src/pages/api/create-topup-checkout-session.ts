import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { cartItems, customer_email, is_top_up, sim_iccid, promo_code, partner_code } = req.body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: { message: 'Invalid cart items' } });
    }

    if (is_top_up && !sim_iccid) {
      return res.status(400).json({ error: { message: 'SIM ICCID is required for top-up' } });
    }

    const lineItems = cartItems.map((item: any) => ({
      price_data: {
        currency: item.currency || 'eur',
        product_data: {
          name: item.name,
          description: item.description || `Top-up for ${sim_iccid}`,
        },
        unit_amount: item.currency.toLowerCase() === 'xpf' ? item.price : Math.round(item.price * 100),
      },
      quantity: 1,
    }));

    const metadata: Stripe.MetadataParam = {
      email: customer_email,
      packageId: cartItems[0].id,
      cartItems: JSON.stringify(cartItems),
      promo_code: promo_code || '',
      partner_code: partner_code || '',
    };

    if (is_top_up) {
      metadata.is_top_up = 'true';
      metadata.sim_iccid = sim_iccid;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/topup_success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/cancel`,
      customer_email: customer_email,
      metadata: metadata,
    });

    res.status(200).json({ sessionId: session.id });
  } catch (error: any) {
    console.error('Error creating top-up checkout session:', error);
    res.status(500).json({ error: { message: error.message || 'Internal server error' } });
  }
}