import type { NextApiRequest, NextApiResponse } from "next";
import { getAvaPrice } from "@/lib/ava";

type Data =
  | { price: number; currency: string }
  | { error: string; details?: unknown };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { quoteData } = req.body;

    if (!quoteData) {
      return res.status(400).json({ error: "Missing quoteData" });
    }

    console.log("💰 [API] Calcul Tarif AVA avec :", quoteData);

    // getAvaPrice utilise maintenant la tarification complexe AVA
    const price = await getAvaPrice(quoteData);

    if (typeof price !== "number" || Number.isNaN(price)) {
      return res.status(500).json({
        error: "Tarif AVA invalide",
        details: price,
      });
    }

    console.log("[DEBUG] Prix final renvoyé au front :", price);

    return res.status(200).json({
      price,
      currency: "EUR",
    });
  } catch (error: any) {
    console.error("💥 Erreur Serveur /api/get-quote:", error);
    return res.status(500).json({
      error: "Erreur lors du calcul de tarif",
      details: error?.message ?? error,
    });
  }
}
