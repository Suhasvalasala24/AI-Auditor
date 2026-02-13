// lib/use-metric-data.ts
import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api-client';

const globalCache: Record<string, any> = {};

export function useMetricData<T>(endpoint: string, pollInterval = 5000) {
  const [data, setData] = useState<T | null>(globalCache[endpoint] || null);
  const [loading, setLoading] = useState(!globalCache[endpoint]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const result = await apiGet<T>(endpoint);
      globalCache[endpoint] = result; // Update cache
      setData(result);
      setError(null);
    } catch (err: any) {
      if (!data) setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // Fetch immediately
    const interval = setInterval(fetchData, pollInterval); // Poll
    return () => clearInterval(interval);
  }, [endpoint]);

  return { data, loading, error, refresh: fetchData };
}