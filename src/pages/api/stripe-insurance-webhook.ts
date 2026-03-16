import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { validateAvaAdhesion } from "@/lib/ava";
import { sendInsuranceEmail } from "@/utils/sendInsuranceEmail";
import { insuranceEmailHtml } from "@/utils/insuranceEmailTemplate";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_INSURANCE!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  let event: Stripe.Event;

  try {
    const buf = await buffer(req);
    const sig = req.headers["stripe-signature"]!;
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Erreur Signature Webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // 🛡️ Ignorer les sessions non-assurance
    if (session.metadata?.type !== 'insurance_ava') {
      console.log("Ignoré par le webhook assurance (Type incorrect)");
      return res.json({ received: true, ignored: true });
    }

    const adhesionNumber = session.metadata.adhesion_number;
    const userEmail = session.customer_email || session.metadata.user_email;

    console.log(`💰 Paiement Assurance validé pour ${adhesionNumber}`);

    try {
      // 1. Statut → paid
      await supabaseAdmin
        .from("insurances")
        .update({
          status: "paid",
          stripe_payment_intent: session.payment_intent as string,
        })
        .eq("adhesion_number", adhesionNumber);

      // 2. Validation AVA → récupère certificat + attestation
      const avaValidation = await validateAvaAdhesion(adhesionNumber);
      console.log("📄 Documents AVA reçus:", avaValidation);

      // 3. Statut → active + URLs documents
      if (avaValidation.certificat_url || avaValidation.attestation_url) {
        await supabaseAdmin
          .from("insurances")
          .update({
            contract_link: avaValidation.certificat_url,
            attestation_url: avaValidation.attestation_url,
            status: "active",
          })
          .eq("adhesion_number", adhesionNumber);
      }

      // 4. Email de confirmation
      if (userEmail) {
        await sendInsuranceEmail({
          to: userEmail,
          subject: "✅ Votre Assurance Voyage FENUASIM est active",
          html: insuranceEmailHtml({
            adhesionNumber,
            certificatUrl: avaValidation.certificat_url,
            attestationUrl: avaValidation.attestation_url,
          }),
        });
      }

    } catch (err) {
      console.error("❌ Erreur traitement post-paiement :", err);
      return res.json({ received: true, error: "Processing failed" });
    }
  }

  res.json({ received: true });
}
