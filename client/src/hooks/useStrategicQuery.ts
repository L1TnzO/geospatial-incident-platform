import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardFilterParams } from '@/types/dashboard';
import { useStrategicFilters } from './useStrategicFilters';

type StrategicQueryStatus = 'idle' | 'loading' | 'success' | 'error';

type StrategicFetcher<T> = (
  options: DashboardFilterParams & {
    signal?: AbortSignal;
    refresh?: boolean;
  } & Record<string, unknown>
) => Promise<T>;

export interface StrategicQueryState<T> {
  status: StrategicQueryStatus;
  data: T | null;
  error: string | null;
  lastUpdated: string | null;
  refresh: () => void;
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseStrategicQueryOptions {
  filterOverrides?: Partial<DashboardFilterParams>;
  requestParams?: Record<string, unknown>;
  errorMessage?: string;
  ttlMs?: number | null;
}

const DEFAULT_ERROR_MESSAGE = 'Failed to load strategic analytics data';
const DEFAULT_TTL_MS = 5 * 60 * 1000;

const buildRequestParamsMemo = (input?: Record<string, unknown>) => {
  if (!input) {
    return {} as Record<string, unknown>;
  }
  return { ...input };
};

const mergeFilters = (
  base: DashboardFilterParams,
  overrides?: Partial<DashboardFilterParams>
): DashboardFilterParams => {
  if (!overrides) {
    return base;
  }
  const merged: DashboardFilterParams = { ...base };
  (Object.keys(overrides) as Array<keyof DashboardFilterParams>).forEach((key) => {
    const value = overrides[key];
    if (value !== undefined) {
      (merged as Record<string, unknown>)[key as string] = value;
    }
  });
  return merged;
};

export const useStrategicQuery = <T>(
  fetcher: StrategicFetcher<T>,
  {
    filterOverrides,
    requestParams,
    errorMessage = DEFAULT_ERROR_MESSAGE,
    ttlMs = DEFAULT_TTL_MS,
  }: UseStrategicQueryOptions = {}
): StrategicQueryState<T> => {
  const baseFilters = useStrategicFilters();
  const overridesKey = useMemo(() => JSON.stringify(filterOverrides ?? {}), [filterOverrides]);
  const requestParamsKey = useMemo(() => JSON.stringify(requestParams ?? {}), [requestParams]);

  const effectiveFilters = useMemo(
    () => mergeFilters(baseFilters, filterOverrides),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseFilters, overridesKey]
  );

  const requestParamsMemo = useMemo(
    () => buildRequestParamsMemo(requestParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requestParamsKey]
  );

  const [status, setStatus] = useState<StrategicQueryStatus>('idle');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastAppliedRefreshRef = useRef(0);

  const refresh = useCallback(() => {
    setRefreshCounter((previous) => previous + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;

    const shouldForceRefresh = refreshCounter > lastAppliedRefreshRef.current && refreshCounter > 0;

    setStatus('loading');
    setError(null);

    const load = async () => {
      try {
        const response = await fetcher({
          ...effectiveFilters,
          ...requestParamsMemo,
          ...(shouldForceRefresh ? { refresh: true } : {}),
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        setData(response);
        setStatus('success');
        setLastUpdated(new Date().toISOString());
      } catch (caught) {
        if (controller.signal.aborted) {
          return;
        }

        setData(null);
        setStatus('error');
        setError(caught instanceof Error ? caught.message : errorMessage);
      } finally {
        lastAppliedRefreshRef.current = refreshCounter;
      }
    };

    void load();

    return () => {
      controller.abort();
    };
  }, [fetcher, effectiveFilters, requestParamsMemo, refreshCounter, errorMessage]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!ttlMs || status !== 'success' || !lastUpdated || typeof window === 'undefined') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      refresh();
    }, ttlMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [ttlMs, status, lastUpdated, refresh]);

  return {
    status,
    data,
    error,
    lastUpdated,
    refresh,
    isIdle: status === 'idle',
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
  };
};
