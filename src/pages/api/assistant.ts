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
  "spain": "Espagne",
  "italy": "Italie",
  "turkey": "Turquie",
  "united kingdom": "Royaume-Uni",
  "germany": "Allemagne",
  "mexico": "Mexique",
  "thailand": "Thaïlande",
  "hong kong": "Hong Kong",
  "malaysia": "Malaisie",
  "greece": "Grèce",
  "canada": "Canada",
  "south korea": "Corée du Sud",
  "japan": "Japon",
  "singapore": "Singapour",
  "australia": "Australie",
  "austria": "Autriche",
  "argentina": "Argentine",
  "india": "Inde",
  "ireland": "Irlande",
  "morocco": "Maroc",
  "netherlands": "Pays-Bas",
  "portugal": "Portugal",
  "switzerland": "Suisse",
  "sweden": "Suède",
  "norway": "Norvège",
  "finland": "Finlande",
  "belgium": "Belgique",
  "denmark": "Danemark",
  "luxembourg": "Luxembourg",
  "russia": "Russie",
  "china": "Chine",
  "fiji": "Fidji",
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
  content: `Tu es un assistant virtuel pour FENUA SIM, spécialisé dans la vente d'eSIM à l'international.

Voici les règles à suivre pour chaque échange :
- Demande toujours la destination et la durée du séjour.
- Propose des forfaits eSIM adaptés.
- Vérifie que le client a bien reçu son eSIM après le paiement.
- Reste poli, professionnel et concis.

📈 Format de réponse attendu pour les forfaits :
- Présente chaque forfait sur plusieurs lignes pour une bonne lisibilité.
- Pour chaque option, indique :
  • le volume de data
  • la durée de validité
  • le prix en USD + sa conversion en euros (entre parenthèses)
  • le lien image (si fourni) formaté en markdown
- Sépare bien chaque forfait avec une ligne vide.

🔹 Exemple :
1. **1 Go – 7 jours**  
💶 5 USD (**≈ 4,70 €**)  
📱 [Voir le forfait](https://cdn.airalo.com/images/xxxxx.png)

❗ N’utilise pas de bullet points collés, et évite d’empiler toutes les offres en une seule ligne.`
};

// ... (le reste du code reste inchangé)

