import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

// --- Dictionnaire de synonymes (FR + EN + abréviations)
const COUNTRY_SYNONYMS: Record<string, string> = {
  "usa": "États-Unis",
  "us": "États-Unis",
  "united states": "États-Unis",
  "etats unis": "États-Unis",
  "etats-unis": "États-Unis",
  "france hexagonale": "France",
  "hexagone": "France",
  "australia": "Australie",
  "japan": "Japon",
  "new zealand": "Nouvelle-Zélande",
  "nz": "Nouvelle-Zélande",
  "fiji": "Fidji",
  "uk": "Royaume-Uni",
  "england": "Royaume-Uni",
  "spain": "Espagne",
  "germany": "Allemagne",
  "canada": "Canada",
  "mexico": "Mexique",
  "brazil": "Brésil",
  "indonesia": "Indonésie",
  "reunion": "La Réunion",
  "martinique": "Martinique",
  "guadeloupe": "Guadeloupe",
  "guyane": "Guyane",
};

// --- Normalisation du pays
function normalizeCountry(country: string): string {
  if (!country) return country;
  const key = country.trim().toLowerCase();
  return COUNTRY_SYNONYMS[key] || country;
}

// --- Prompt amélioré
const systemPrompt = {
  role: "system",
  content: `Tu es l'assistant virtuel officiel de FENUA SIM, spécialisé dans la vente d'eSIM.

Règles :
- Toujours demander le pays de destination et la durée du séjour si ce n’est pas précisé.
- Utiliser les synonymes : si un client dit "USA", tu comprends "États-Unis".
- Répondre dans la langue du client (FR, EN ou ES).
- Mettre en avant les destinations populaires pour les voyageurs venant de Polynésie française, Réunion, Martinique, Guadeloupe, Guyane : France, USA, Japon, Australie, Nouvelle-Zélande.
- Après un achat, rappeler au client qu’il recevra son eSIM par email avec un QR code.
- Être poli, clair et professionnel, avec des phrases concises et utiles.
- Si la question n’est pas liée aux eSIM : répondre brièvement et rediriger vers nos services.
`,
};

// --- Récupérer les forfaits par pays
async function getPlans(country: string) {
  const normalized = normalizeCountry(country);
  const { data, error } = await supabase
    .from("airalo_packages")
    .select("*")
    .ilike("region_fr", `%${normalized}%`)
    .order("final_price_eur", { ascending: true });
  if (error) throw error;
  return data;
}

// --- Récupérer un forfait par ID
async function getPlanById(id: string) {
  const { data, error } = await supabase
    .from("airalo_packages")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

// --- Créer un paiement Stripe
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

// --- Handler principal
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array required" });
    }

    const fullMessages = [systemPrompt, ...messages];

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
      const parsedArgs = JSON.parse(args);

      switch (name) {
        case "getPlans":
          const plans = await getPlans(parsedArgs.country);
          return res.status(200).json({ plans });
        case "getPlanById":
          const plan = await getPlanById(parsedArgs.planId);
          return res.status(200).json({ plan });
        case "createPayment":
          if (!parsedArgs.email) {
            return res.status(400).json({ error: "Email is required for payment" });
          }
          const paymentUrl = await createPayment(parsedArgs.planId, parsedArgs.email);
          return res.status(200).json({ paymentUrl });
        default:
          return res.status(400).json({ error: "Invalid function call" });
      }
    }

    const reply =
      response.content ||
      "Je vais essayer de mieux comprendre votre demande. Pourriez-vous me donner plus de détails ?";
    res.status(200).json({ reply });
  } catch (err) {
    console.error("Erreur assistant GPT:", err);
    res.status(500).json({ error: "Erreur GPT" });
  }
}
