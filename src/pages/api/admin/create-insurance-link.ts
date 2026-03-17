// src/pages/api/admin/create-insurance-link.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createAvaAdhesion } from "@/lib/ava";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });
const FRAIS_DISTRIBUTION = 10;
const ADMIN_EMAIL = "admin@fenuasim.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Auth check
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Non authentifie" });
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user || user.email !== ADMIN_EMAIL) return res.status(403).json({ error: "Acces refuse" });

  const { quoteData, clientEmail, clientNote } = req.body;
  if (!quoteData || !clientEmail) return res.status(400).json({ error: "quoteData et clientEmail requis" });

  try {
    const internalRef = `ADMIN-${Date.now()}`;

    // 1. Creer adhesion AVA
    const avaResult = await createAvaAdhesion({ ...quoteData, internalReference: internalRef });
    console.log("AVA result:", JSON.stringify(avaResult));

    const adhesionNumber = avaResult.adhesion_number;
    if (!adhesionNumber) return res.status(400).json({ error: "Numero adhesion manquant", details: avaResult });

    const contractNumber = avaResult.contract_number || null;
    const contractLink = avaResult.contract_link || null;

    let premiumAva = typeof avaResult.montant_total === "number" ? avaResult.montant_total : quoteData.manualAmount || 0;
    premiumAva = Number(premiumAva);
    if (!Number.isFinite(premiumAva) || premiumAva <= 0) return res.status(400).json({ error: "Montant invalide", details: avaResult.montant_total });

    const totalTtc = premiumAva + FRAIS_DISTRIBUTION;

    // 2. Sauvegarder dans Supabase
    const { data: insertData, error: supaError } = await supabaseAdmin
      .from("insurances")
      .insert({
        user_email: clientEmail,
        subscriber_first_name: quoteData.subscriber?.firstName ?? null,
        subscriber_last_name: quoteData.subscriber?.lastName ?? null,
        product_type: quoteData.productType,
        adhesion_number: adhesionNumber,
        contract_number: contractNumber,
        premium_ava: premiumAva,
        frais_distribution: FRAIS_DISTRIBUTION,
        total_amount: totalTtc,
        contract_link: contractLink,
        status: "pending_payment",
        start_date: quoteData.startDate ?? null,
        end_date: quoteData.endDate ?? null,
        ava_raw: avaResult.raw ?? null,
      })
      .select()
      .single();

    if (supaError) return res.status(500).json({ error: "Erreur Supabase", details: supaError });

    // 3. Creer session Stripe
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: clientEmail,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: `Assurance AVA - ${adhesionNumber}`, description: contractNumber ? `Contrat ${contractNumber}` : undefined },
            unit_amount: Math.round(premiumAva * 100),
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: "eur",
            product_data: { name: "Frais de distribution FENUASIM" },
            unit_amount: Math.round(FRAIS_DISTRIBUTION * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/assurance/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/assurance`,
      metadata: {
        type: "insurance_ava",
        adhesion_number: adhesionNumber,
        contract_number: contractNumber || "",
        insurance_id: insertData?.id?.toString() ?? "",
        internal_ref: internalRef,
        origin: "admin_manual",
        note: clientNote || "",
      },
    });

    return res.status(200).json({
      paymentUrl: session.url,
      sessionId: session.id,
      adhesionNumber,
      premiumAva,
      totalTtc,
    });
  } catch (error: any) {
    console.error("Admin insurance error:", error);
    return res.status(500).json({ error: "Erreur serveur", details: error?.message });
  }
}
