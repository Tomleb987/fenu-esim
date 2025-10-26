// /pages/api/assistant.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// --- Normalisation des noms de destinations --- //
const destinationAliases: Record<string, string> = {
  "usa": "États-Unis",
  "us": "États-Unis",
  "états-unis": "États-Unis",
  "états unis": "États-Unis",
  "etat unis": "États-Unis",
  "etat-unis": "États-Unis",
  "united states": "États-Unis",
  "nz": "Nouvelle-Zélande",
  "new zealand": "Nouvelle-Zélande",
  "france": "France",
};

const destinationPages: Record<string, string> = {
  "france": "https://fenuasim.com/shop/france",
  "états-unis": "https://fenuasim.com/shop/united-states",
  "etats-unis": "https://fenuasim.com/shop/united-states",
  "usa": "https://fenuasim.com/shop/united-states",
  "us": "https://fenuasim.com/shop/united-states",
};

function normalizeDestination(input: string): string {
  const cleaned = input.trim().toLowerCase();
  return destinationAliases[cleaned] || input;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

const systemPrompt: ChatCompletionMessageParam = {
  role: "system",
  content: `Tu es un assistant virtuel pour FENUA SIM. Quand un utilisateur demande une destination, si c'est France ou États-Unis, donne simplement le lien de la page dédiée. Sinon, poursuis avec les autres règles normales.`
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { messages } = req.body as { messages: ChatCompletionMessageParam[] };
    const fullMessages: ChatCompletionMessageParam[] = [systemPrompt, ...messages];

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
        case "getPlans": {
          if (!parsedArgs.country) {
            return res.status(400).json({ reply: "La destination n’a pas été comprise." });
          }
          const normalizedCountry = normalizeDestination(parsedArgs.country);
          const pageUrl = destinationPages[normalizedCountry.toLowerCase()];

          if (pageUrl) {
            return res.status(200).json({
              reply: `✅ Oui, nous avons des forfaits eSIM pour **${normalizedCountry}**.\n\n🔗 Consultez la page ici : ${pageUrl}`,
            });
          }

          functionResponse = await getPlans(normalizedCountry);

          if (!functionResponse || functionResponse.length === 0) {
            return res.status(200).json({ reply: `Aucun forfait disponible pour ${normalizedCountry} pour le moment.` });
          }

          return res.status(200).json({ reply: JSON.stringify(functionResponse) });
        }

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
  } catch (err: any) {
    console.error("Erreur assistant GPT:", err);
    res.status(500).json({ reply: `Erreur GPT : ${err.message}` });
  }
}
