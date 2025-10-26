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

// Normalisation manuelle
function normalizeDestination(input: string): string {
  const cleaned = input.trim().toLowerCase();
  const map: Record<string, string> = {
    "usa": "united states",
    "us": "united states",
    "états-unis": "united states",
    "état unis": "united states",
    "etat-unis": "united states",
    "united states": "united states",
    "nz": "new zealand",
    "australie": "australia",
    "fidji": "fiji",
    "royaume-uni": "united kingdom",
    "grande bretagne": "united kingdom",
    "coree du sud": "south korea",
    "coree": "south korea",
    "japon": "japan",
    "espagne": "spain",
    "allemagne": "germany",
    "europe": "europe",
    "asie": "asia",
    "afrique": "africa",
    "france": "france",
    "mexique": "mexico"
  };

  return map[cleaned] || cleaned;
}

// Récupère les infos destination depuis Supabase
async function getDestinationInfo(normalized: string) {
  const { data, error } = await supabase
    .from("destination_info")
    .select("normalized_name, url")
    .ilike("normalized_name", normalized);

  if (error) {
    console.error("Erreur Supabase:", error);
    return null;
  }

  return data && data.length > 0 ? data[0] : null;
}

// Instance OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { messages } = req.body as { messages: ChatCompletionMessageParam[] };

    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const lastMessageText =
      typeof lastUserMessage === "string"
        ? lastUserMessage
        : Array.isArray(lastUserMessage)
        ? lastUserMessage
            .map(part => (typeof part === "string" ? part : (part as any)?.text || ""))
            .join(" ")
        : "";

    const normalized = normalizeDestination(lastMessageText);
    const destinationInfo = await getDestinationInfo(normalized);

    // 🔁 Cas spécifique destination
    if (destinationInfo) {
      return res.status(200).json({
        reply: `<p>D'accord, voici le lien vers notre page dédiée aux forfaits eSIM pour <strong>${capitalize(normalized)}</strong> :</p><p>👉 <a href="${destinationInfo.url}" target="_blank" style="color: #0070f3;">Voir les offres</a></p>`,
      });
    }

    // 🔁 Cas spécifique : recharge
    if (lastMessageText.toLowerCase().includes("recharge")) {
      return res.status(200).json({
        reply:
          "Pour recharger votre eSIM, connectez-vous à votre espace client avec l'adresse e-mail utilisée lors de l'achat. Sélectionnez la eSIM dans vos forfaits, cliquez sur <strong>« Recharger »</strong>, choisissez le forfait souhaité et procédez au paiement.",
      });
    }

    // 🔁 Cas spécifique : support
    if (
      lastMessageText.toLowerCase().includes("support") ||
      lastMessageText.toLowerCase().includes("assistance") ||
      lastMessageText.toLowerCase().includes("aide") ||
      lastMessageText.toLowerCase().includes("contacter")
    ) {
      return res.status(200).json({
        reply: `Vous pouvez contacter notre support :<ul>
        <li>📧 par email : <a href="mailto:contact@fenuasim.com">contact@fenuasim.com</a> ou <a href="mailto:sav@fenuasim.com">sav@fenuasim.com</a></li>
        <li>💬 par WhatsApp : <a href="https://wa.me/33749782101" target="_blank">+33 7 49 78 21 01</a></li>
        <li>📨 via le <a href="https://www.fenuasim.com/contact" target="_blank">formulaire de contact</a></li>
      </ul>`,
      });
    }

    // Si pas de cas spéciaux → appel GPT
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [systemPrompt, ...messages],
      temperature: 0.7,
    });

    return res.status(200).json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error("Erreur GPT:", error);
    return res.status(500).json({ error: "Erreur serveur assistant IA" });
  }
}

// Capitalize 1ère lettre
function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
