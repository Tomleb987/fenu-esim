import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// -------------------- CONFIG --------------------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

// -------------------- DESTINATIONS --------------------
const destinationMap: Record<string, string> = {
  france: "france",
  "united states": "united-states",
  usa: "united-states",
  us: "united-states",
  fiji: "fiji",
  fidji: "fiji",
  australie: "australia",
  australia: "australia",
  japon: "japan",
  japan: "japan",
  mexique: "mexico",
  mexico: "mexico",
  europe: "europe",
  asie: "asia",
  asia: "asia",
  monde: "discover-global",
  global: "discover-global"
};

function normalizeDestination(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// -------------------- SYSTEM PROMPT --------------------
const systemPrompt: ChatCompletionMessageParam = {
  role: "system",
  content: `
Tu es l’assistant officiel de FENUA SIM, un service de vente de cartes eSIM pour les voyageurs.

Tu aides les utilisateurs à :
- Comprendre les forfaits disponibles selon la destination et la durée du séjour
- Vérifier que leur commande a bien été reçue
- Expliquer comment activer leur eSIM après l’achat (QR code, paramètres mobiles)
- Expliquer comment recharger une eSIM déjà achetée
- Proposer des options adaptées si le client n’a plus de données

Règles :
- Demande toujours la destination et la durée du séjour pour proposer un forfait
- Ne donne pas d’informations inventées
- Si la question n’est pas liée aux eSIM, essaie d’aider tout de même
- Reste professionnel, clair, direct et courtois
- Si tu ne sais pas, propose de contacter le support via contact@fenuasim.com
`
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
    const { messages } = req.body as { messages: ChatCompletionMessageParam[] };

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array required" });
    }

    const lastUserMessage = messages[messages.length - 1]?.content;

    // --- 🔁 Réponse directe pour destination seule ---
    if (typeof lastUserMessage === "string") {
      const normalized = normalizeDestination(lastUserMessage);
      const destinationSlug = destinationMap[normalized];
      if (destinationSlug) {
        const reply = `D'accord, vous pouvez consulter les offres eSIM pour ${normalized} ici : https://www.fenuasim.com/shop/${destinationSlug}`;
        return res.status(200).json({ reply });
      }
    }

    // --- Sinon, GPT prend le relais ---
    const fullMessages: ChatCompletionMessageParam[] = [systemPrompt, ...messages];

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

      let functionResponse;

      switch (name) {
        case "getPlans":
          functionResponse = await getPlans(parsedArgs.country);
          break;
        case "getPlanById":
          functionResponse = await getPlanById(parsedArgs.planId);
          break;
        case "createPayment":
          if (!parsedArgs.email) {
            return res.status(400).json({ error: "Email is required for payment" });
          }
          functionResponse = await createPayment(parsedArgs.planId, parsedArgs.email);
          break;
        default:
          return res.status(400).json({ error: "Invalid function call" });
      }

      const followUp = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          ...fullMessages,
          response,
          {
            role: "function",
            name,
            content: JSON.stringify(functionResponse),
          },
        ],
      });

      const finalReply = followUp.choices[0].message.content;
      return res.status(200).json({ reply: finalReply });
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
