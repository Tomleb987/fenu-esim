// src/pages/api/get-quote.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAvaPrice } from '@/lib/ava';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { quoteData } = req.body;

    // 1. On appelle la fonction (qui renvoie maintenant un chiffre ou 0)
    const price = await getAvaPrice(quoteData);

    console.log("💰 Tarif final reçu dans API:", price);

    // 2. On vérifie juste si c'est un nombre positif
    if (typeof price === 'number' && price > 0) {
      return res.status(200).json({
        price: price,
        currency: "EUR",
      });
    } else {
      // Si 0, c'est une erreur
      return res.status(400).json({
        error: "Tarif non disponible (Vérifiez les dates et âges)",
        price: 0
      });
    }

  } catch (error: any) {
    console.error("💥 Crash API:", error.message);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
