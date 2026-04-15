import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  try {
    const { cartItems, customer_email, is_top_up, sim_iccid, promo_code, partner_code, first_name, last_name } = req.body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: { message: 'Invalid cart items' } });
    }

    const packageId = cartItems[0].id;
    if (!packageId) {
      return res.status(400).json({
        error: { message: 'Package ID is required.', code: 'MISSING_PACKAGE_ID' }
      });
    }

    if (is_top_up && !sim_iccid) {
      return res.status(400).json({ error: { message: 'SIM ICCID is required for top-up' } });
    }

    // Prix toujours lu depuis la base
    const { data: pkg, error: pkgError } = await supabase
      .from('airalo_packages')
      .select('airalo_id, name, final_price_eur, final_price_usd, final_price_xpf')
      .eq('airalo_id', packageId)
      .single();

    if (pkgError || !pkg) {
      console.error('Topup package not found:', packageId);
      return res.status(400).json({
        error: { message: 'Forfait introuvable.', code: 'PACKAGE_NOT_FOUND' }
      });
    }

    const validCurrencies = ['eur', 'usd', 'xpf'];
    const item = cartItems[0];
    let normalizedCurrency = (item.currency || 'eur').toLowerCase();
    if (!validCurrencies.includes(normalizedCurrency)) {
      normalizedCurrency = 'eur';
    }

    let serverPrice: number;
    if (normalizedCurrency === 'xpf') {
      serverPrice = Math.round(Number(pkg.final_price_xpf));
    } else if (normalizedCurrency === 'usd') {
      serverPrice = Math.round(Number(pkg.final_price_usd) * 100);
    } else {
      serverPrice = Math.round(Number(pkg.final_price_eur) * 100);
    }

    const clientPrice = item.price || 0;
    const clientPriceInCents = normalizedCurrency === 'xpf' ? Math.round(clientPrice) : Math.round(clientPrice * 100);
    if (Math.abs(clientPriceInCents - serverPrice) > 10) {
      console.warn('TOPUP PRIX SUSPECT', {
        packageId, clientPriceInCents, serverPrice,
        currency: normalizedCurrency, email: customer_email, sim_iccid,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        timestamp: new Date().toISOString(),
      });
    }

    const metadata: Stripe.MetadataParam = {
      email: customer_email,
      packageId,
      cartItems: JSON.stringify(cartItems),
      promo_code: promo_code || '',
      partner_code: partner_code || '',
    };
    if (is_top_up) { metadata.is_top_up = 'true'; metadata.sim_iccid = sim_iccid; }
    if (first_name) metadata.firstName = first_name;
    if (last_name)  metadata.lastName  = last_name;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: normalizedCurrency,
          product_data: {
            name: item.name || pkg.name,
            description: item.description || `Top-up for ${sim_iccid}`,
          },
          unit_amount: serverPrice,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/topup_success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/cancel`,
      customer_email: customer_email,
      metadata,
    });

    res.status(200).json({ sessionId: session.id });
  } catch (error: any) {
    console.error('Error creating top-up checkout session:', error);
    res.status(500).json({ error: { message: error.message || 'Internal server error' } });
  }
}
