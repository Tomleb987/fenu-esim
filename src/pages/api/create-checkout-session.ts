import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { first_name, last_name, cartItems, customer_email } = req.body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: "Invalid cart items" });
    }

    const packageId = cartItems[0].id;
    if (!packageId) {
      return res.status(400).json({
        message: "Package ID is required. Please refresh the page and try again.",
        error: "MISSING_PACKAGE_ID"
      });
    }

    const { data: pkg, error: pkgError } = await supabase
      .from("airalo_packages")
      .select("airalo_id, name, final_price_eur, final_price_usd, final_price_xpf")
      .eq("airalo_id", packageId)
      .single();

    if (pkgError || !pkg) {
      console.error("Package not found in DB:", packageId);
      return res.status(400).json({
        message: "Forfait introuvable. Veuillez rafraichir la page.",
        error: "PACKAGE_NOT_FOUND"
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

    const clientPrice = item.price || item.final_price_eur;
    const clientPriceInCents = normalizedCurrency === 'xpf'
      ? Math.round(clientPrice)
      : Math.round(clientPrice * 100);

    if (Math.abs(clientPriceInCents - serverPrice) > 10) {
      console.warn("PRIX SUSPECT", {
        packageId, clientPriceInCents, serverPrice,
        currency: normalizedCurrency, email: customer_email,
        ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
        timestamp: new Date().toISOString(),
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: normalizedCurrency,
          product_data: {
            name: item.name || pkg.name,
            description: item.description || "eSIM FENUA SIM",
          },
          unit_amount: serverPrice,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/cancel`,
      customer_email: customer_email,
      metadata: {
        packageId: cartItems[0].id,
        firstName: first_name,
        lastName: last_name,
        email: customer_email,
        cartItems: JSON.stringify(cartItems),
        promo_code: cartItems[0].promo_code || "",
        partner_code: cartItems[0].partner_code || "",
      },
    });

    res.status(200).json({ sessionId: session.id });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ message: error.message });
  }
}
