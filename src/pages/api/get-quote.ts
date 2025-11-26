import type { NextApiRequest, NextApiResponse } from 'next';
import { getAvaPrice } from '@/lib/ava';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { quoteData } = req.body;
    
    console.log("💰 Calcul tarif pour :", quoteData.productType);

    const avaResult = await getAvaPrice(quoteData);

    if (!avaResult || avaResult.error) {
      console.error("❌ Erreur Devis AVA:", avaResult);
      // Gestion spéciale de l'erreur produit non autorisé
      if (avaResult && avaResult["200 OK"]) {
          return res.status(400).json({ error: avaResult["200 OK"] });
      }
      return res.status(400).json({ error: "Impossible de calculer le tarif", details: avaResult });
    }

    // AVA renvoie parfois montant_total, parfois prime_totale
    const price = avaResult.montant_total || avaResult.prime_totale || 0;

    return res.status(200).json({ price: price });

  } catch (error: any) {
    console.error("💥 Erreur Serveur:", error);
    return res.status(500).json({ error: error.message });
  }
}
