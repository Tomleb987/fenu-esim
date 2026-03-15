// src/pages/api/assurance/get-documents.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end('Method not allowed');

  const { adhesion_number } = req.query;

  if (!adhesion_number || typeof adhesion_number !== 'string') {
    return res.status(400).json({ error: 'adhesion_number manquant' });
  }

  const { data, error } = await supabaseAdmin
    .from('insurances')
    .select('contract_link, attestation_url, status')
    .eq('adhesion_number', adhesion_number)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Contrat introuvable' });
  }

  return res.status(200).json({
    contract_link: data.contract_link || null,
    attestation_url: data.attestation_url || null,
    status: data.status,
  });
}
