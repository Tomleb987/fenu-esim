// src/pages/api/get-quote.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAvaPrice } from '@/lib/ava'; // On utilise bien la nouvelle fonction

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { quoteData } = req.body;
    console.log("💰 [API] Calcul tarif...");

    // Appel à la fonction de TARIFICATION
    const avaResult = await getAvaPrice(quoteData);

    if (!avaResult || avaResult.error) {
      console.error("❌ Erreur Devis AVA:", avaResult);
      // Gestion erreur "Produit non autorisé"
      if (avaResult && avaResult["200 OK"]) {
          return res.status(400).json({ error: avaResult["200 OK"] });
      }
      return res.status(400).json({ error: "Impossible de calculer le tarif", details: avaResult });
    }

    // Récupération du prix
    const price = avaResult.montant_total || avaResult.prime_totale || 0;

    return res.status(200).json({ price, currency: "EUR" });

  } catch (error: any) {
    console.error("💥 Erreur Serveur:", error);
    return res.status(500).json({ error: error.message });
  }
}
