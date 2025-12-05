import type { NextApiRequest, NextApiResponse } from 'next';
import { demandeTarifComplexe } from '@/lib/ava';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // CORRECTION ICI : On extrait quoteData du body
    const { quoteData } = req.body; 

    if (!quoteData) throw new Error("Données manquantes (quoteData)");

    const quote = await demandeTarifComplexe(quoteData);

    return res.status(200).json({ ok: true, quote });
  } catch (err: any) {
    console.error('Erreur get-quote:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
