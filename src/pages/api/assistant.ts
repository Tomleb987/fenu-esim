import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// --- Configuration OpenAI ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Configuration Supabase ---
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- Dictionnaire des destinations ---
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

// --- Fonction de normalisation ---
function normalizeDestination(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default async function handler(req: any, res: any) {
  const { messages } = req.body;

  const lastUserMessage = messages[messages.length - 1]?.content ?? "";
  const normalized = normalizeDestination(lastUserMessage);
  const destinationSlug = destinationMap[normalized];

  let assistantReply = "";

  if (destinationSlug) {
    assistantReply = `D'accord, voici le lien vers notre page dédiée aux forfaits eSIM pour ${capitalize(normalized)} :\nhttps://www.fenuasim.com/shop/${destinationSlug}`;
  } else {
    assistantReply = "Désolé, je n’ai pas compris cette destination. Pouvez-vous la reformuler ou vérifier son orthographe ?";
  }

  const responseMessage: ChatCompletionMessageParam = {
    role: "assistant",
    content: assistantReply
  };

  res.status(200).json({ reply: responseMessage });
}
