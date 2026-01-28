import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface SimCard {
  id: string;
  iccid: string;
  name: string;
  status: string;
  created_at: string;
}

export const useSims = () => {
  const [sims, setSims] = useState<SimCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSims = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Non authentifié');
      }

      const { data, error: fetchError } = await supabase
        .from('user_sims')
        .select('*')
        .eq('user_email', session.user.email)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      console.log('[useSims] Loaded SIMs:', data);
      console.log('[useSims] Number of SIMs:', data?.length || 0);
      
      setSims(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des SIMs');
    } finally {
      setLoading(false);
    }
  }, []);

  const addSim = useCallback(async (iccid: string, name: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Non authentifié');
      }

      const { error: insertError } = await supabase
        .from('user_sims')
        .insert([
          {
            user_id: session.user.id,
            iccid,
            name,
            status: 'active',
          },
        ]);

      if (insertError) throw insertError;

      // Recharger la liste des SIMs
      await fetchSims();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout de la SIM');
    } finally {
      setLoading(false);
    }
  }, [fetchSims]);

  return {
    sims,
    loading,
    error,
    fetchSims,
    addSim,
  };
}; 