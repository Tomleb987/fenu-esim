// src/pages/api/get-quote.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { demandeTarifComplexe } from '@/lib/ava';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  }

  try {
    const payload = req.body;

    const quote = await demandeTarifComplexe(payload);

    return res.status(200).json({ ok: true, quote });
  } catch (err: any) {
    console.error('Erreur get-quote:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Erreur serveur' });
  }
}

