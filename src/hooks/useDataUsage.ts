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
    console.log('[useDataUsage] Fetching usage for ICCID:', simIccid);
    
    const response = await fetchAPI<DataUsage>(`/sims/${simIccid}/usage`);
    
    console.log('[useDataUsage] API Response:', response);
    console.log('[useDataUsage] Response data:', response.data);
    console.log('[useDataUsage] Response error:', response.error);
    
    if (response.data) {
      console.log('[useDataUsage] Setting usage data:', {
        total: response.data.total,
        remaining: response.data.remaining,
        status: response.data.status,
        calculatedUsed: response.data.total - response.data.remaining
      });
      setUsage(response.data);
    } else if (response.error) {
      console.error('[useDataUsage] Error fetching usage:', response.error);
    } else {
      console.warn('[useDataUsage] No data and no error - response might be empty');
    }
    
    return response;
  }, [fetchAPI]);

  const formatDataUsage = useCallback((usage: DataUsage | null) => {
    if (!usage) {
      console.log('[formatDataUsage] No usage data available');
      return 'N/A';
    }
    
    // Ensure total and remaining are numbers
    const total = typeof usage.total === 'number' ? usage.total : 0;
    const remaining = typeof usage.remaining === 'number' ? usage.remaining : 0;
    const used = total - remaining;
    
    console.log('[formatDataUsage] Calculation:', {
      total,
      remaining,
      used,
      totalType: typeof usage.total,
      remainingType: typeof usage.remaining
    });
    
    // If used is 0 or negative, it might be because:
    // 1. No data has been used (total === remaining)
    // 2. API returned wrong values
    // 3. Data hasn't been synced yet
    if (used < 0) {
      console.warn('[formatDataUsage] Negative usage detected - possible data issue');
      return '0 Mbs';
    }
    
    const unit = 'Mbs';
    return `${used} ${unit}`;
  }, []);

  const formatRemainingData = useCallback((usage: DataUsage | null) => {
    if (!usage) return 'N/A';
    const remaining = usage.remaining;
    const unit = 'Mbs';
    return `${remaining} ${unit}`;
  }, []);

  return {
    usage,
    loading,
    error,
    fetchUsage,
    formatDataUsage,
    formatRemainingData,
  };
}; 