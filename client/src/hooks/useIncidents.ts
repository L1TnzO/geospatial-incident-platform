import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IncidentListItem, PaginationMeta } from '@/types/incidents';
import { fetchIncidents } from '@/services/incidentsService';

const INCIDENT_RENDER_CAP = 5000;

export interface UseIncidentsResult {
  incidents: IncidentListItem[];
  isLoading: boolean;
  isError: boolean;
  error?: string;
  refresh: () => void;
  lastUpdated?: Date;
  totalCount: number;
  renderedCount: number;
  remainder: number;
  pagination?: PaginationMeta;
}

export const useIncidents = (): UseIncidentsResult => {
  const [incidents, setIncidents] = useState<IncidentListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pagination, setPagination] = useState<PaginationMeta | undefined>(undefined);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [renderedCount, setRenderedCount] = useState<number>(0);
  const [remainder, setRemainder] = useState<number>(0);
  const [refreshToken, setRefreshToken] = useState<number>(0);
  const lastUpdatedRef = useRef<Date | undefined>(undefined);

  useEffect(() => {
    const abortController = new AbortController();
    let isSubscribed = true;

    const load = async () => {
      setIsLoading(true);
      setError(undefined);

      try {
        const result = await fetchIncidents({
          signal: abortController.signal,
          pageSize: INCIDENT_RENDER_CAP,
        });
        if (!isSubscribed) {
          return;
        }
        const capped = result.data.slice(0, INCIDENT_RENDER_CAP);
        setIncidents(capped);
        setPagination(result.pagination);
        setTotalCount(result.pagination.total);
        setRenderedCount(capped.length);
        setRemainder(Math.max(result.pagination.total - capped.length, 0));
        lastUpdatedRef.current = new Date();
      } catch (err) {
        if (!isSubscribed || abortController.signal.aborted) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load incidents');
        setIncidents([]);
        setPagination(undefined);
        setTotalCount(0);
        setRenderedCount(0);
        setRemainder(0);
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
      pagination,
      totalCount,
      renderedCount,
      remainder,
    }),
    [incidents, isLoading, error, refresh, pagination, totalCount, renderedCount, remainder]
  );
};
