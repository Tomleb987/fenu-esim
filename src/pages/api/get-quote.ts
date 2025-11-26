// src/pages/api/get-quote.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAvaPrice } from '@/lib/ava';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sécurité : on n'accepte que les requêtes POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { quoteData } = req.body;
    
    console.log("💰 [API] Demande de devis pour :", quoteData.productType);

    // Appel à la fonction de calcul (sans créer de contrat)
    const avaResult = await getAvaPrice(quoteData);

    // Gestion des erreurs
    if (!avaResult || avaResult.error) {
      console.error("❌ [API] Erreur Devis :", avaResult);
      // Si c'est une erreur "Produit non autorisé" (cas fréquent AVA), on l'affiche
      if (avaResult && avaResult["200 OK"]) {
          return res.status(400).json({ error: avaResult["200 OK"] });
      }
      return res.status(400).json({ 
        error: avaResult?.error || "Impossible de calculer le tarif", 
        details: avaResult 
      });
    }

    // Récupération du prix (AVA renvoie parfois des noms de variables différents)
    const price = avaResult.montant_total || avaResult.prime_totale || avaResult.journeyAmount || 0;

    console.log("✅ [API] Prix trouvé :", price, "€");

    return res.status(200).json({ 
      price: price,
      currency: "EUR"
    });

  } catch (error: any) {
    console.error("💥 [API] Erreur Serveur :", error);
    return res.status(500).json({ error: error.message });
  }
}
