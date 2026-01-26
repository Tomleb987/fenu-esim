import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface AiraloAPIError {
  code: string;
  message: string;
}

interface AiraloAPIResponse<T> {
  data: T | null;
  error: AiraloAPIError | null;
}

export const useAiraloAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AiraloAPIError | null>(null);

  const fetchAPI = useCallback(async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<AiraloAPIResponse<T>> => {
    setLoading(true);
    setError(null);

    try {
      // Verify Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Unauthorized');
      }

      // Call our server API endpoint
      const response = await fetch('/api/airalo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint,
          method: options.method || 'GET',
          body: options.body,
        }),
      });

      const result = await response.json();

      // Debug logging
      console.log('useAiraloAPI Full API response:', result);
      console.log('useAiraloAPI Endpoint:', endpoint);

      if (!result.success) {
        console.error('[useAiraloAPI] API request failed:', result.error);
        throw new Error(result.error || 'API request failed');
      }

      // Handle different response structures from Airalo API
      // Airalo might return: { data: { data: {...} } } or { data: {...} }
      let extractedData = result.data;
      
      // If result.data has a 'data' property, extract it
      if (result.data && typeof result.data === 'object' && 'data' in result.data) {
        extractedData = result.data.data;
        console.log('[useAiraloAPI] Extracted nested data:', extractedData);
      } else {
        console.log('[useAiraloAPI] Using direct data:', extractedData);
      }

      return { data: extractedData, error: null };
    } catch (err) {
      const apiError: AiraloAPIError = {
        code: 'API_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      };
      setError(apiError);
      return { data: null, error: apiError };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchAPI,
  };
}; 