import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StationSummary } from '@/types/stations';
import { fetchStations } from '@/services/stationsService';

export interface UseStationsOptions {
  isActive?: boolean;
}

export interface UseStationsResult {
  stations: StationSummary[];
  isLoading: boolean;
  isError: boolean;
  error?: string;
  refresh: () => void;
  lastUpdated?: Date;
}

type CacheKey = string;

export const useStations = ({ isActive }: UseStationsOptions = {}): UseStationsResult => {
  const [stations, setStations] = useState<StationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [refreshToken, setRefreshToken] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);
  const cacheRef = useRef<Map<CacheKey, StationSummary[]>>(new Map());

  const resolvedIsActive = isActive ?? true;
  const cacheKey = useMemo<CacheKey>(
    () => JSON.stringify({ isActive: resolvedIsActive }),
    [resolvedIsActive]
  );

  useEffect(() => {
    let isSubscribed = true;
    const abortController = new AbortController();

    const run = async () => {
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setStations(cached);
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const result = await fetchStations({
          signal: abortController.signal,
          isActive: resolvedIsActive,
        });
        if (!isSubscribed) {
          return;
        }

        cacheRef.current.set(cacheKey, result.data);
        setStations(result.data);
        setLastUpdated(new Date());
      } catch (err) {
        if (!isSubscribed || abortController.signal.aborted) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load stations');
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      isSubscribed = false;
      abortController.abort();
    };
  }, [cacheKey, refreshToken, resolvedIsActive]);

  const refresh = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  return {
    stations,
    isLoading,
    isError: Boolean(error),
    error,
    refresh,
    lastUpdated,
  };
};
