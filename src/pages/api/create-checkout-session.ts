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
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { first_name, last_name, cartItems, customer_email } = req.body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: "Invalid cart items" });
    }


    // This prevents creating Stripe sessions with undefined packageId which causes webhook failures
    const packageId = cartItems[0].id;
    if (!packageId) {
      console.error("Missing packageId in cartItems[0].id - this would cause webhook failure", {
        cartItems: JSON.stringify(cartItems),
        timestamp: new Date().toISOString(),
      });
      return res.status(400).json({ 
        message: "Package ID is required. Please refresh the page and try again.",
        error: "MISSING_PACKAGE_ID"
      });
    }

    // Valid currency codes for Stripe
    const validCurrencies = ['eur', 'usd', 'xpf'];
    
    // Create checkout session with all necessary metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: cartItems.map((item: any) => {
        // Normalize currency to lowercase for Stripe (required format)
        // Ensure currency is valid, default to 'eur' if invalid
        let normalizedCurrency = (item.currency || 'eur').toLowerCase();
        if (!validCurrencies.includes(normalizedCurrency)) {
          console.warn(`Invalid currency "${item.currency}", defaulting to "eur"`);
          normalizedCurrency = 'eur';
        }
        
        // Use the price in the selected currency, or fallback to EUR
        let unitAmount = item.price || item.final_price_eur;
        if (normalizedCurrency === 'xpf') {
          // XPF doesn't need multiplication (already in smallest unit)
          unitAmount = Math.round(unitAmount);
        } else {
          // EUR and USD need to be multiplied by 100 (cents)
          unitAmount = Math.round(unitAmount * 100);
        }
        
        return {
          price_data: {
            currency: normalizedCurrency,
            product_data: {
              name: item.name,
              description: item.description || "No description provided",
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        };
      }),
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/cancel`,
      customer_email: customer_email,
      metadata: {
        packageId: cartItems[0].id,
        firstName: first_name,
        lastName: last_name,
        email: customer_email,
        // Store cart items as JSON string to access in webhook
        cartItems: JSON.stringify(cartItems),
        promo_code: cartItems[0].promo_code || "",
        partner_code: cartItems[0].partner_code || "",
      },
    });

    // DO NOT create the order here - wait for payment confirmation in webhook
    // The webhook will handle order creation after successful payment

    res.status(200).json({ sessionId: session.id });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ message: error.message });
  }
}
