import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardFilterParams } from '@/types/dashboard';
import { useDashboardFilters } from './useDashboardFilters';

export type DashboardQueryStatus = 'idle' | 'loading' | 'success' | 'error';

export interface DashboardQueryState<T> {
  status: DashboardQueryStatus;
  data: T | null;
  error: string | null;
  lastUpdated: string | null;
  refresh: () => void;
}

type DashboardFetcher<T> = (
  options: DashboardFilterParams & {
    signal?: AbortSignal;
    refresh?: boolean;
  } & Record<string, unknown>
) => Promise<T>;

interface UseDashboardQueryConfig {
  requestParams?: Record<string, unknown>;
  errorMessage?: string;
}

export const useDashboardQuery = <T>(
  fetcher: DashboardFetcher<T>,
  { requestParams, errorMessage = 'Failed to load dashboard data' }: UseDashboardQueryConfig = {}
): DashboardQueryState<T> => {
  const filters = useDashboardFilters();
  const [status, setStatus] = useState<DashboardQueryStatus>('idle');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastAppliedRefreshRef = useRef(0);

  const refresh = useCallback(() => {
    setRefreshCounter((previous) => previous + 1);
  }, []);

  const requestParamsMemo = useMemo(
    () => (requestParams ? { ...requestParams } : {}),
    [requestParams]
  );

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;

    const shouldRefresh = refreshCounter > lastAppliedRefreshRef.current && refreshCounter > 0;

    setStatus('loading');
    setError(null);

    const load = async () => {
      try {
        const response = await fetcher({
          ...filters,
          ...requestParamsMemo,
          ...(shouldRefresh ? { refresh: true } : {}),
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        setStatus('success');
        setData(response);
        setError(null);
        setLastUpdated(new Date().toISOString());
      } catch (caught) {
        if (controller.signal.aborted) {
          return;
        }

        setStatus('error');
        setData(null);
        setError(caught instanceof Error ? caught.message : errorMessage);
      } finally {
        lastAppliedRefreshRef.current = refreshCounter;
      }
    };

    void load();

    return () => {
      controller.abort();
    };
  }, [fetcher, filters, refreshCounter, requestParamsMemo, errorMessage]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    status,
    data,
    error,
    lastUpdated,
    refresh,
  };
};
