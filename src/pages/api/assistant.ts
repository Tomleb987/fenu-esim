// /pages/api/assistant.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";
import type {
  ChatCompletionMessageParam,
  ChatCompletionContentPart,
} from "openai/resources/chat/completions";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Normalisation de la destination utilisateur (via la table Supabase)
async function getDestinationInfo(destination: string) {
  const { data, error } = await supabase
    .from("destination_info")
    .select("name, slug, alias")
    .contains("alias", [destination.toLowerCase()])
    .single();

  if (error || !data) return null;
  return data;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { messages } = req.body as { messages: ChatCompletionMessageParam[] };

    // Récupérer le dernier message utilisateur
    const lastUserMessage = messages[messages.length - 1]?.content;
    let lastMessageText = "";

    if (typeof lastUserMessage === "string") {
      lastMessageText = lastUserMessage;
    } else if (Array.isArray(lastUserMessage)) {
      lastMessageText = lastUserMessage
        .map(part => (typeof part === "string" ? part : (part as ChatCompletionContentPart & { text?: string }).text || ""))
        .join(" ");
    }

    // Vérifie si la requête contient une destination connue
    const destinationInfo = await getDestinationInfo(lastMessageText);

    if (destinationInfo) {
      const link = `https://www.fenuasim.com/shop/${destinationInfo.slug}`;
      return res.status(200).json({
        reply: `D'accord, voici le lien vers notre page dédiée aux forfaits eSIM pour **${destinationInfo.name}** :\n👉 [Voir les offres](${link})`,
      });
    }

    // Sinon, faire appel à l'agent GPT pour gérer normalement
    const systemPrompt: ChatCompletionMessageParam = {
      role: "system",
      content: `Tu es l'assistant eSIM de FENUA SIM. Aide l'utilisateur à trouver un forfait adapté à sa destination.`,
    };

    const fullMessages: ChatCompletionMessageParam[] = [systemPrompt, ...messages];

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: fullMessages,
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content;
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Erreur dans /api/assistant:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}
