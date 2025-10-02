import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IncidentListItem } from '@/types/incidents';
import { fetchIncidents } from '@/services/incidentsService';

export interface UseIncidentsResult {
  incidents: IncidentListItem[];
  isLoading: boolean;
  isError: boolean;
  error?: string;
  refresh: () => void;
  lastUpdated?: Date;
}

export const useIncidents = (): UseIncidentsResult => {
  const [incidents, setIncidents] = useState<IncidentListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [refreshToken, setRefreshToken] = useState<number>(0);
  const lastUpdatedRef = useRef<Date | undefined>(undefined);

  useEffect(() => {
    const abortController = new AbortController();
    let isSubscribed = true;

    const load = async () => {
      setIsLoading(true);
      setError(undefined);

      try {
        const result = await fetchIncidents({ signal: abortController.signal });
        if (!isSubscribed) {
          return;
        }
        setIncidents(result.data);
        lastUpdatedRef.current = new Date();
      } catch (err) {
        if (!isSubscribed || abortController.signal.aborted) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load incidents');
        setIncidents([]);
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isSubscribed = false;
      abortController.abort();
    };
  }, [refreshToken]);

  const refresh = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  return useMemo(
    () => ({
      incidents,
      isLoading,
      isError: Boolean(error),
      error,
      refresh,
      lastUpdated: lastUpdatedRef.current,
    }),
    [incidents, isLoading, error, refresh]
  );
};
