import type { NextApiRequest, NextApiResponse } from 'next';
import { createAvaAdhesion } from '@/lib/ava';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { quoteData } = req.body;
    
    // On génère une référence temporaire pour le devis
    const internalRef = `QUOTE-${Date.now()}`;
    
    // On appelle AVA
    const avaResult = await createAvaAdhesion({ 
      ...quoteData, 
      internalReference: internalRef 
    });

    // Vérification d'erreur
    if (!avaResult || avaResult.error) {
      console.error("Erreur Devis AVA:", avaResult);
      return res.status(400).json({ error: avaResult?.error || "Erreur inconnue" });
    }

    // On renvoie juste ce dont le front a besoin : le PRIX
    return res.status(200).json({ 
      price: avaResult.montant_total || avaResult.prime_totale || 0,
      currency: "EUR"
    });

  } catch (error: any) {
    console.error("Erreur Serveur Devis:", error);
    return res.status(500).json({ error: error.message });
  }
}
