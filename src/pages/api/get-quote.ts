import type { NextApiRequest, NextApiResponse } from 'next';
import { getAvaPrice } from '@/lib/ava'; // On utilise la fonction intelligente

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    // CORRECTION : On extrait "quoteData" du body
    const { quoteData } = req.body; 

    if (!quoteData) {
        return res.status(400).json({ error: "Données manquantes" });
    }
    
    console.log("💰 [API] Calcul tarif pour:", quoteData.productType);

    // Appel à la fonction qui traduit et interroge AVA
    const avaResult = await getAvaPrice(quoteData);

    if (!avaResult || avaResult.error) {
      console.error("❌ Erreur Devis AVA:", avaResult);
      if (avaResult && avaResult["200 OK"]) {
          return res.status(400).json({ error: avaResult["200 OK"] });
      }
      return res.status(400).json({ error: "Impossible de calculer le tarif", details: avaResult });
    }

    // Récupération du prix (champs variables selon AVA)
    const price = avaResult.montant_total || avaResult.prime_totale || 0;

    // On renvoie le prix
    return res.status(200).json({ price, currency: "EUR" });

  } catch (error: any) {
    console.error("💥 Erreur Serveur:", error);
    return res.status(500).json({ error: error.message });
  }
}
