import { useState, useEffect, useCallback } from 'react';

export function useRealtimeData(fetcherFn, pollIntervalMs = 8000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const result = await fetcherFn();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetcherFn]);

  // Initial fetch and real-time polling interval
  useEffect(() => {
    void loadData();

    const timer = setInterval(() => {
      void loadData(true); // Silent re-fetch in background
    }, pollIntervalMs);

    return () => clearInterval(timer);
  }, [loadData, pollIntervalMs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData(true);
  }, [loadData]);

  return { data, setData, loading, refreshing, error, onRefresh, refetch: loadData };
}