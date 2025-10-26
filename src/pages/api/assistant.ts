// /pages/api/assistant.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";
import { systemPrompt } from "@/assistant-config";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// --- Normalisation des noms de destinations --- //
const destinationAliases: Record<string, string> = {
  "usa": "etats-unis",
  "us": "etats-unis",
  "états-unis": "etats-unis",
  "états unis": "etats-unis",
  "united states": "etats-unis",
  "new zealand": "nouvelle-zelande",
  "nz": "nouvelle-zelande",
  "south korea": "coree-du-sud",
  "uk": "royaume-uni",
  "england": "royaume-uni",
  "ivory coast": "cote-divoire",
  "côte d’ivoire": "cote-divoire",
  "french polynesia": "polynesie-francaise",
  "vietnam": "vietnam",
  "australia": "australie",
  "france": "france",
  "japan": "japon",
  "mexico": "mexique",
  "fiji": "fidji",
};

function normalizeDestination(input: string): string {
  const cleaned = input.trim().toLowerCase();
  return destinationAliases[cleaned] || cleaned;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getDestinationInfo(slug: string) {
  const { data, error } = await supabase
    .from("destination_info")
    .select("slug, nom_affichage")
    .eq("slug", slug)
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
    const fullMessages: ChatCompletionMessageParam[] = [systemPrompt, ...messages];

    const lastUserMessage = messages[messages.length - 1]?.content || "";

    const lastMessageText = typeof lastUserMessage === "string"
      ? lastUserMessage
      : Array.isArray(lastUserMessage)
        ? lastUserMessage.map(part => typeof part === "string" ? part : (part as any).text || "").join(" ")
        : "";

    const normalized = normalizeDestination(lastMessageText);
    const destinationInfo = await getDestinationInfo(normalized);

    if (destinationInfo) {
      const link = `https://www.fenuasim.com/shop/${destinationInfo.slug}`;
      const reply = `D'accord, voici le lien vers notre page dédiée aux forfaits eSIM pour <strong>${destinationInfo.nom_affichage}</strong> : 👉 <a href="${link}" target="_blank">Voir les offres</a>`;
      return res.status(200).json({ reply });
    }

    // Sinon, traitement via GPT
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: fullMessages,
      temperature: 0.7,
    });

    const response = completion.choices[0].message;
    return res.status(200).json({ reply: response.content });

  } catch (err) {
    console.error("Erreur assistant GPT:", err);
    return res.status(500).json({ error: "Erreur serveur assistant" });
  }
}
