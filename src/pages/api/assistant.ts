// /pages/api/assistant.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

const destinationAliases: Record<string, string> = {
  "usa": "États-Unis",
  "us": "États-Unis",
  "united states": "États-Unis",
  "états unis": "États-Unis",
  "états-unis": "États-Unis",
  "nz": "Nouvelle-Zélande",
  "new zealand": "Nouvelle-Zélande",
};

function normalizeDestination(input: string): string {
  const cleaned = input.trim().toLowerCase();
  return destinationAliases[cleaned] || input;
}

const systemPrompt: ChatCompletionMessageParam = {
  role: "system",
  content: `Tu es l'assistant de FENUA SIM. Normalise toujours les noms de pays : ex. USA = États-Unis. Si une destination est connue, donne le lien de la page correspondante.`,
};

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

async function getDestinationInfo(normalized: string) {
  const { data } = await supabase
    .from("destination_info")
    .select("slug, name")
    .ilike("name", `%${normalized}%`)
    .single();

  return data;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { messages } = req.body as { messages: ChatCompletionMessageParam[] };
    const fullMessages: ChatCompletionMessageParam[] = [systemPrompt, ...messages];

    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const normalized = normalizeDestination(lastUserMessage);
    const destinationInfo = await getDestinationInfo(normalized);

    if (destinationInfo) {
      return res.status(200).json({
        reply: `Oui, nous avons des forfaits pour ${destinationInfo.name}. Voici le lien : https://fenuasim.com/${destinationInfo.slug}`,
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: fullMessages,
      temperature: 0.7,
      function_call: "auto",
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
          description: "Récupère un forfait",
          parameters: {
            type: "object",
            properties: {
              planId: { type: "string" },
            },
            required: ["planId"],
          },
        },
        {
          name: "createPayment",
          description: "Crée un paiement Stripe",
          parameters: {
            type: "object",
            properties: {
              planId: { type: "string" },
              email: { type: "string" },
            },
            required: ["planId", "email"],
          },
        },
      ],
    });

    const response = completion.choices[0].message;

    if (response.function_call) {
      const { name, arguments: args } = response.function_call;
      const parsedArgs = JSON.parse(args || "{}");

      let functionResponse;

      switch (name) {
        case "getPlans":
          const country = normalizeDestination(parsedArgs.country);
          functionResponse = await getPlans(country);
          break;
        case "getPlanById":
          functionResponse = await getPlanById(parsedArgs.planId);
          break;
        case "createPayment":
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

      return res.status(200).json({ reply: followUp.choices[0].message.content });
    }

    return res.status(200).json({ reply: response.content });
  } catch (err) {
    console.error("Erreur assistant GPT:", err);
    res.status(500).json({ error: "Erreur serveur GPT" });
  }
}
