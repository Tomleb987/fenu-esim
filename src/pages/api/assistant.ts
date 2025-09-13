import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// -------------------- CONFIG --------------------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

// -------------------- TYPES --------------------
type ChatRole = "system" | "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
}

// -------------------- SYSTEM PROMPT --------------------
const systemPrompt: ChatMessage = {
  role: "system",
  content: `Tu es un assistant virtuel spécialisé dans la vente d'eSIM pour FENUA SIM.
  - Demande toujours la destination et la durée du séjour.
  - Propose les forfaits adaptés en fonction des besoins.
  - Vérifie que le client a bien reçu son eSIM par email après le paiement.
  - Reste poli, professionnel et concis.
  
  Si la question n’est pas directement liée aux eSIM :
  1. Essaie de comprendre l’intention
  2. Réponds de manière utile et pertinente
  3. Fais le lien avec nos services eSIM si possible
  4. Si vraiment aucun rapport : explique que tu es spécialisé eSIM mais aide quand même.`
};

// -------------------- SUPABASE HELPERS --------------------
async function getPlans(country: string) {
  const { data, error } = await supabase
    .from("airalo_packages")
    .select("*")
    .ilike("region_fr", `%${country}%`)
    .order("final_price_eur", { ascending: true });

  if (error) throw error;
  return data;
}

async function getPlanById(id: string) {
  const { data, error } = await supabase
    .from("airalo_packages")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

async function createPayment(planId: string, email: string) {
  const plan = await getPlanById(planId);
  if (!plan) throw new Error("Forfait introuvable");

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: plan.name,
            description: plan.description || "",
          },
          unit_amount: Math.round(plan.final_price_eur * 100),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/cancel`,
    customer_email: email,
    metadata: {
      plan_id: planId,
      email: email,
    },
  });

  return session.url;
}

// -------------------- API HANDLER --------------------
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { messages } = req.body as RequestBody;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array required" });
    }

    // Ajout du system prompt
    const fullMessages: ChatMessage[] = [systemPrompt, ...messages];

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: fullMessages,
      temperature: 0.7,
      functions: [
        {
          name: "getPlans",
          description: "Récupère la liste des forfaits eSIM disponibles",
          parameters: {
            type: "object",
            properties: {
              country: { type: "string", description: "Nom du pays" },
            },
            required: ["country"],
          },
        },
        {
          name: "getPlanById",
          description: "Récupère les détails d'un forfait spécifique",
          parameters: {
            type: "object",
            properties: {
              planId: { type: "string", description: "ID du forfait" },
            },
            required: ["planId"],
          },
        },
        {
          name: "createPayment",
          description: "Crée un paiement Stripe pour un forfait",
          parameters: {
            type: "object",
            properties: {
              planId: { type: "string", description: "ID du forfait" },
              email: { type: "string", description: "Email du client" },
            },
            required: ["planId", "email"],
          },
        },
      ],
      function_call: "auto",
    });

    const response = completion.choices[0].message;

    if (response.function_call) {
      const { name, arguments: args } = response.function_call;
      const parsedArgs = JSON.parse(args || "{}");

      switch (name) {
        case "getPlans": {
          const plans = await getPlans(parsedArgs.country);
          return res.status(200).json({ plans });
        }
        case "getPlanById": {
          const plan = await getPlanById(parsedArgs.planId);
          return res.status(200).json({ plan });
        }
        case "createPayment": {
          if (!parsedArgs.email) {
            return res
              .status(400)
              .json({ error: "Email is required for payment" });
          }
          const paymentUrl = await createPayment(
            parsedArgs.planId,
            parsedArgs.email
          );
          return res.status(200).json({ paymentUrl });
        }
        default:
          return res.status(400).json({ error: "Invalid function call" });
      }
    }

    const reply =
      response.content ||
      "Je n’ai pas bien compris votre demande. Pouvez-vous préciser ?";
    res.status(200).json({ reply });
  } catch (err) {
    console.error("Erreur assistant GPT:", err);
    res.status(500).json({ error: "Erreur GPT" });
  }
}
