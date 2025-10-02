import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IncidentListItem, PaginationMeta } from '@/types/incidents';
import { fetchIncidents } from '@/services/incidentsService';

const INCIDENT_RENDER_CAP = 5000;
const INCIDENT_FETCH_PAGE_SIZE = 100;

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
        const aggregated: IncidentListItem[] = [];
        let nextPage = 1;
        let lastResponse: Awaited<ReturnType<typeof fetchIncidents>> | undefined;

        while (aggregated.length < INCIDENT_RENDER_CAP) {
          const response = await fetchIncidents({
            signal: abortController.signal,
            page: nextPage,
            pageSize: INCIDENT_FETCH_PAGE_SIZE,
          });

          if (!isSubscribed) {
            return;
          }

          aggregated.push(...response.data);
          lastResponse = response;

          if (response.data.length === 0) {
            break;
          }

          if (!response.pagination.hasNext || aggregated.length >= INCIDENT_RENDER_CAP) {
            break;
          }

          nextPage += 1;
        }

        const paginationMeta = lastResponse?.pagination;
        const total = paginationMeta?.total ?? aggregated.length;
        const capped = aggregated.slice(0, INCIDENT_RENDER_CAP);

        setIncidents(capped);
        setPagination(paginationMeta);
        setTotalCount(total);
        setRenderedCount(capped.length);
        setRemainder(Math.max(total - capped.length, 0));
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
