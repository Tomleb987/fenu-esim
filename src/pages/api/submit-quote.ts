// src/pages/api/submit-quote.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createAvaAdhesion } from '@/lib/ava';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { quoteData } = req.body;

    console.log("📨 [API] Création contrat AVA...");

    const result = await createAvaAdhesion(quoteData);

    console.log("[DEBUG] Résultat création AVA :", result);

    if (result.error) {
      return res.status(400).json({
        error: "Échec création du contrat",
        details: result,
      });
    }

    return res.status(200).json({
      message: "Contrat AVA créé avec succès",
      adhesionId: result.id_adhesion,
      contratId: result.id_contrat,
      contractLink: result.contract_link, // s’il existe
      raw: result,
    });
  } catch (error: any) {
    console.error("💥 Erreur Serveur AVA:", error);
    return res.status(500).json({ error: error.message });
  }
}
