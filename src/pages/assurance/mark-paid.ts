// src/pages/api/insurance/mark-paid.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');

  const { insuranceId } = req.body;

  if (!insuranceId) {
    return res.status(400).json({ error: 'ID assurance manquant' });
  }

  const { error } = await supabaseAdmin
    .from('insurances')
    .update({ status: 'paid' })
    .eq('id', insuranceId);

  if (error) {
    console.error('❌ Erreur Supabase update:', error);
    return res.status(500).json({ error: 'Erreur mise à jour Supabase' });
  }

  return res.status(200).json({ message: 'Statut mis à jour' });
}
