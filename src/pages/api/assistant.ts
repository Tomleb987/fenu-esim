import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";
import { systemPrompt } from "../../assistant-config"; // ✅ chemin relatif
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function normalizeDestination(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s-]/gi, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

async function getDestinationInfo(slug: string) {
  const { data, error } = await supabase
    .from("destination_info")
    .select("name, slug")
    .ilike("slug", slug);

  if (error || !data || data.length === 0) return null;
  return data[0];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { messages } = req.body;

  const lastUserMessage = messages[messages.length - 1]?.content || "";
  const lastMessageText = typeof lastUserMessage === "string"
    ? lastUserMessage
    : Array.isArray(lastUserMessage)
    ? lastUserMessage.map(part => typeof part === 'string' ? part : ("text" in part ? part.text : ""))?.join(" ")
    : "";

  const normalized = normalizeDestination(lastMessageText);
  const destinationInfo = await getDestinationInfo(normalized);

  if (destinationInfo) {
    const url = `https://www.fenuasim.com/shop/${destinationInfo.slug.toLowerCase()}`;
    const message = `D'accord, voici le lien vers notre page dédiée aux forfaits eSIM pour <strong>${destinationInfo.name}</strong> : 👉 <a href="${url}" target="_blank">Voir les offres</a>`;

    return res.status(200).json({ reply: message });
  }

  // Si pas de destination trouvée, fallback sur OpenAI
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages as ChatCompletionMessageParam[],
    ],
    temperature: 0.7,
  });

  const reply = completion.choices[0]?.message?.content || "Je n'ai pas compris votre demande.";
  return res.status(200).json({ reply });
}
