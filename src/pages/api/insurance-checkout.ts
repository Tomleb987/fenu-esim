// src/pages/api/insurance-checkout.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createAvaAdhesion } from "@/lib/ava";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

type CheckoutSuccess = {
  url: string | null;
};

type CheckoutError = {
  error: string;
  details?: unknown;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CheckoutSuccess | CheckoutError>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { quoteData, userEmail, amount } = req.body;

    if (!quoteData || !userEmail || typeof amount !== "number") {
      return res.status(400).json({
        error: "quoteData, userEmail ou amount manquant",
        details: { quoteData: !!quoteData, userEmail, amount },
      });
    }

    // 🇵🇫 Blocage : réservé aux résidents de Polynésie française
    if (quoteData.subscriberCountry !== "PF") {
      return res.status(403).json({
        error: "Cette assurance est réservée aux résidents de Polynésie française.",
      });
    }

    const internalRef = `CMD-${Date.now()}`;

    // 1️⃣ Création contrat AVA (brouillon, en attente de paiement)
    const avaResult = await createAvaAdhesion({
      ...quoteData,
      internalReference: internalRef,
    });

    console.log("✅ Réponse createAvaAdhesion :", avaResult);

    const adhesionNumber = avaResult.adhesion_number;
    const contractNumber = avaResult.contract_number || null;
    const contractLink = avaResult.contract_link || null;

    if (!adhesionNumber) {
      return res.status(400).json({
        error: "Numéro d'adhésion manquant dans la réponse AVA",
        details: avaResult.raw ?? avaResult,
      });
    }

    // 2️⃣ Montant : priorité à ce que renvoie AVA, sinon fallback sur `amount` du front
    let price = typeof avaResult.montant_total === "number"
      ? avaResult.montant_total
      : amount;

    price = Number(price);

    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({
        error: "Montant de prime invalide",
        details: { montant_total: avaResult.montant_total, amount },
      });
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
        contract_number: contractNumber,
        total_amount: price,
        contract_link: contractLink,
        status: "pending_payment",
        start_date: quoteData.startDate ?? null,
        end_date: quoteData.endDate ?? null,
        ava_raw: avaResult.raw ?? null, // optionnel si tu as une colonne JSON
      })
      .select()
      .single();

    if (supaError) {
      console.error("❌ Supabase insert error:", supaError);
      return res
        .status(500)
        .json({ error: "Erreur enregistrement Supabase", details: supaError });
    }

    // 4️⃣ Création session Stripe Checkout
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      return res.status(500).json({
        error: "NEXT_PUBLIC_BASE_URL manquant dans les variables d'environnement",
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Assurance AVA – ${adhesionNumber}`,
              description: contractNumber
                ? `Contrat ${contractNumber}`
                : undefined,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/assurance/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/assurance`,
      customer_email: userEmail,
      metadata: {
        type: "insurance_ava",
        adhesion_number: adhesionNumber,
        contract_number: contractNumber || "",
        insurance_id: insertData?.id?.toString() ?? "",
        internal_ref: internalRef,
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error("❌ API insurance-checkout error:", error);
    return res.status(500).json({
      error: "Erreur serveur lors de la création du paiement",
      details: error?.message ?? error,
    });
  }
}
