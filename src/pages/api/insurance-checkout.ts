// src/pages/api/insurance-checkout.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createAvaAdhesion } from "@/lib/ava";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { quoteData, userEmail, amount } = req.body;

    if (!quoteData || !userEmail || typeof amount !== "number") {
      return res
        .status(400)
        .json({ error: "quoteData, userEmail ou amount manquant" });
    }

    const internalRef = `CMD-${Date.now()}`;

    // 1️⃣ Création contrat AVA
    const avaResult = await createAvaAdhesion({
      ...quoteData,
      internalReference: internalRef,
    });

    if (!avaResult) {
      return res
        .status(400)
        .json({ error: "Réponse AVA invalide ou vide" });
    }

    const adhesionNumber =
      avaResult.adhesion_number ||
      avaResult.id_adhesion ||
      avaResult.id_contrat;

    const contractLink = avaResult.contract_link ?? null;

    if (!adhesionNumber) {
      return res.status(400).json({
        error: "Numéro d'adhésion manquant dans la réponse AVA",
        detail: avaResult,
      });
    }

    // 2️⃣ Montant : on utilise le montant validé côté front
    const price = amount;
    if (Number.isNaN(price)) {
      return res
        .status(400)
        .json({ error: "Montant invalid", raw: amount });
    }

    // 3️⃣ Enregistrement dans Supabase
    const { data: insertData, error: supaError } = await supabaseAdmin
      .from("insurances")
      .insert({
        user_email: userEmail,
        subscriber_first_name: quoteData.subscriber?.firstName ?? null,
        subscriber_last_name: quoteData.subscriber?.lastName ?? null,
        product_type: quoteData.productType,
        adhesion_number: adhesionNumber,
        total_amount: price,
        contract_link: contractLink,
        status: "pending_payment",
        start_date: quoteData.startDate ?? null,
        end_date: quoteData.endDate ?? null,
      })
      .select()
      .single();

    if (supaError) {
      console.error("❌ Supabase insert error:", supaError);
      return res
        .status(500)
        .json({ error: "Erreur enregistrement Supabase" });
    }

    // 4️⃣ Création session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Assurance AVA – ${adhesionNumber}`,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/assurance/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/assurance`,
      customer_email: userEmail,
      metadata: {
        type: "insurance_ava",
        adhesion_number: adhesionNumber,
        insurance_id: insertData?.id ?? "",
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error("❌ API insurance-checkout error:", error);
    return res
      .status(500)
      .json({ error: error.message ?? "Erreur serveur" });
  }
}
