import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// --- Normalisation des noms de destinations --- //
function normalizeDestination(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // suppression des accents
    .replace(/[^\w\s-]/gi, "") // caractères spéciaux
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-"); // espaces → tirets
}

// --- Supabase client --- //
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- OpenAI client --- //
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: any, res: any) {
  const { messages } = req.body;

  const lastMessageRaw = messages[messages.length - 1]?.content || "";
  const lastMessageText = Array.isArray(lastMessageRaw)
    ? lastMessageRaw.map(part =>
        typeof part === "string" ? part : "text" in part ? part.text : ""
      ).join(" ")
    : typeof lastMessageRaw === "string"
    ? lastMessageRaw
    : "";

  const normalized = normalizeDestination(lastMessageText);

  // 🔍 Requête vers Supabase : table "destination_info"
  const { data, error } = await supabase
    .from("destination_info")
    .select("name, url")
    .ilike("normalized_name", normalized);

  if (error) {
    console.error("Supabase error:", error);
    return res.status(500).json({ error: "Erreur lors de la recherche de la destination." });
  }

  if (data && data.length > 0) {
    const destination = data[0];
    const responseMessage = `D'accord, voici le lien vers notre page dédiée aux forfaits eSIM pour ${destination.name} : ${destination.url}`;

    return res.status(200).json({
      reply: responseMessage,
    });
  }

  // 🤖 Si aucune correspondance trouvée
  const fallback = `Je suis désolé, je n’ai pas trouvé de forfait pour cette destination. Pouvez-vous reformuler ou essayer une autre ?`;

  return res.status(200).json({ reply: fallback });
}
