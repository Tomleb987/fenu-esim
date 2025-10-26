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
  "états-unis": "États-Unis",
  "united states": "États-Unis",
  "nz": "Nouvelle-Zélande",
  "new zealand": "Nouvelle-Zélande",
  "fiji": "Fidji",
  "fidji": "Fidji",
  "uk": "Royaume-Uni",
  "england": "Royaume-Uni",
  "scotland": "Royaume-Uni",
  // ... Ajouter d'autres alias si nécessaire
};

function normalizeDestination(input: string): string {
  const cleaned = input.trim().toLowerCase();
  return destinationAliases[cleaned] || input;
}

async function getDestinationInfo(destination: string) {
  const { data, error } = await supabase
    .from("destination_info")
    .select("name, slug")
    .ilike("name", `%${destination}%`)
    .single();

  if (error || !data) return null;
  return data;
}

const systemPrompt: ChatCompletionMessageParam = {
  role: "system",
  content: `Tu es l'assistant officiel de FENUA SIM.

1. Si l'utilisateur demande **comment recharger une eSIM**, tu dois répondre ceci :

"Pour recharger votre eSIM FENUA SIM :

1. Connectez-vous à votre espace client avec l’adresse email utilisée lors de l’achat.  
2. Sélectionnez l’eSIM que vous souhaitez recharger.  
3. Cliquez sur 'Recharger', choisissez le forfait désiré, puis procédez au paiement.

Si vous avez besoin d’assistance, je suis là pour vous aider."

2. Lorsque l'utilisateur donne une destination, tu dois rechercher dans la table Supabase "destination_info" et, si une entrée est trouvée, répondre :

"D'accord, voici le lien vers notre page dédiée aux forfaits eSIM pour <b>{{nom}}</b> : <a href='https://www.fenuasim.com/shop/{{slug}}' target='_blank'>Voir les offres</a>."

Ne liste aucun forfait ni prix. Ne mentionne pas d'autres étapes.

3. Normalise toujours les noms de pays : "usa" = "États-Unis", "nz" = "Nouvelle-Zélande", etc. Utilise la table d'alias.

Exprime-toi toujours de manière professionnelle, claire et concise.`,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { messages } = req.body as { messages: ChatCompletionMessageParam[] };

    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const lastMessageText = typeof lastUserMessage === "string"
      ? lastUserMessage
      : Array.isArray(lastUserMessage)
      ? lastUserMessage.map(part => typeof part === "string" ? part : ("text" in part ? part.text : "")).join(" ")
      : "";

    const normalized = normalizeDestination(lastMessageText);
    const destinationInfo = await getDestinationInfo(normalized);

    if (destinationInfo) {
      return res.status(200).json({
        reply: `D'accord, voici le lien vers notre page dédiée aux forfaits eSIM pour <b>${destinationInfo.name}</b> : <a href="https://www.fenuasim.com/shop/${destinationInfo.slug}" target="_blank">Voir les offres</a>.`,
      });
    }

    const fullMessages: ChatCompletionMessageParam[] = [systemPrompt, ...messages];
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: fullMessages,
      temperature: 0.7,
    });

    const response = completion.choices[0].message;
    return res.status(200).json({ reply: response.content });
  } catch (err) {
    console.error("Erreur assistant GPT:", err);
    res.status(500).json({ error: "Erreur serveur GPT" });
  }
}
