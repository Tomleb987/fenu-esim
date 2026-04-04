import { useState, useCallback } from 'react';
import { useAiraloAPI } from './useAiraloAPI';

interface DataUsage {
  remaining: number;
  total: number;
  status: string;
}

export const useDataUsage = () => {
  const { fetchAPI, loading, error } = useAiraloAPI();
  const [usage, setUsage] = useState<DataUsage | null>(null);

  const fetchUsage = useCallback(async (simIccid: string) => {
    const response = await fetchAPI<DataUsage>(`/sims/${simIccid}/usage`);

    if (response.data) {
      setUsage(response.data);
    } else if (response.error) {
      console.error('[useDataUsage] Error fetching usage:', response.error);
    }

    return response;
  }, [fetchAPI]);

  // FIX 2 : l'API Airalo retourne les données en Mo (ex: 10240 = 10 Go)
  // L'ancien code affichait "10240 Mbs" — on convertit proprement
  const formatMo = (mo: number): string => {
    if (mo <= 0) return '0 Mo';
    if (mo >= 1024) return `${(mo / 1024).toFixed(1).replace('.0', '')} Go`;
    return `${mo} Mo`;
  };

  const formatDataUsage = useCallback((usage: DataUsage | null): string => {
    if (!usage) return 'N/A';
    const total = typeof usage.total === 'number' ? usage.total : 0;
    const remaining = typeof usage.remaining === 'number' ? usage.remaining : 0;
    const used = total - remaining;
    if (used <= 0) return '0 Mo';
    return formatMo(used);
  }, []);

  const formatRemainingData = useCallback((usage: DataUsage | null): string => {
    if (!usage) return 'N/A';
    const remaining = typeof usage.remaining === 'number' ? usage.remaining : 0;
    return formatMo(remaining);
  }, []);

  // Utilitaire exposé pour les barres de progression
  const getUsagePercent = useCallback((usage: DataUsage | null): number => {
    if (!usage || !usage.total || usage.total === 0) return 0;
    const used = usage.total - usage.remaining;
    return Math.min(100, Math.round((used / usage.total) * 100));
  }, []);

  return {
    usage,
    loading,
    error,
    fetchUsage,
    formatDataUsage,
    formatRemainingData,
    getUsagePercent,
  };
};
