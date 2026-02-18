// src/pages/api/assurance/mark-paid.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');

  const { insurance_id, adhesion_number } = req.body;

  if (!insurance_id || !adhesion_number) {
    return res.status(400).json({ error: 'Champs manquants (insurance_id, adhesion_number)' });
  }

  const { error } = await supabaseAdmin
    .from('insurances')
    .update({ status: 'paid' })
    .eq('id', insurance_id)
    .eq('adhesion_number', adhesion_number);

  if (error) {
    console.error('❌ Erreur Supabase update:', error);
    return res.status(500).json({ error: 'Erreur mise à jour Supabase' });
  }

  // Récupère les liens documents stockés par le webhook AVA
  const { data } = await supabaseAdmin
    .from('insurances')
    .select('contract_link, attestation_url')
    .eq('id', insurance_id)
    .single();

  return res.status(200).json({ 
    success: true,
    contract_link: data?.contract_link || null,
    attestation_url: data?.attestation_url || null,
  });
}
