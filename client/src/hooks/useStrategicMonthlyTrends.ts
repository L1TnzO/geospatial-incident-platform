import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardFilterParams } from '@/types/dashboard';
import type { StrategicMonthlyTrendResponse } from '@/types/strategic';
import { fetchMonthlyTrends } from '@/services/strategicAnalyticsService';
import { useStrategicFilters } from './useStrategicFilters';

type StrategicQueryStatus = 'idle' | 'loading' | 'success' | 'error';

export interface StrategicMonthlyTrendsOptions {
  months?: number;
  filters?: Partial<DashboardFilterParams>;
  autoRefreshMs?: number | null;
  availableTimeframes?: number[];
}

export interface StrategicMonthlyTrendsState {
  timeframe: number;
  setTimeframe: (months: number) => void;
  availableTimeframes: number[];
  status: StrategicQueryStatus;
  data: StrategicMonthlyTrendResponse | null;
  error: string | null;
  lastUpdated: string | null;
  refresh: () => void;
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_TIMEFRAMES = [6, 12, 24];

type CacheEntry = {
  data: StrategicMonthlyTrendResponse;
  lastUpdated: string;
  timestamp: number;
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
      (merged as Record<string, unknown>)[key as string] = value as unknown;
    }
  });
  return merged;
};

export const useStrategicMonthlyTrends = (
  options: StrategicMonthlyTrendsOptions = {}
): StrategicMonthlyTrendsState => {
  const { months, filters: filterOverrides, autoRefreshMs = DEFAULT_TTL_MS } = options;
  const baseFilters = useStrategicFilters();

  const overridesKey = useMemo(() => JSON.stringify(filterOverrides ?? {}), [filterOverrides]);

  const effectiveFilters = useMemo(
    () => mergeFilters(baseFilters, filterOverrides),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseFilters, overridesKey]
  );

  const filtersKey = useMemo(() => JSON.stringify(effectiveFilters), [effectiveFilters]);

  const availableTimeframes = useMemo(() => {
    const configured = options.availableTimeframes ?? DEFAULT_TIMEFRAMES;
    const unique = Array.from(new Set(configured.filter((value) => value > 0)));
    if (months && !unique.includes(months)) {
      unique.push(months);
    }
    if (unique.length === 0) {
      unique.push(12);
    }
    return unique.sort((a, b) => a - b);
  }, [options.availableTimeframes, months]);

  const initialTimeframe = useMemo(() => {
    if (months && months > 0) {
      return months;
    }
    return availableTimeframes.includes(12) ? 12 : availableTimeframes[0];
  }, [months, availableTimeframes]);

  const [timeframe, setTimeframeState] = useState<number>(initialTimeframe);
  const timeframeRef = useRef(initialTimeframe);
  const [status, setStatus] = useState<StrategicQueryStatus>('idle');
  const [data, setData] = useState<StrategicMonthlyTrendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshModeRef = useRef(false);
  const filtersKeyRef = useRef(filtersKey);

  useEffect(() => {
    if (filtersKeyRef.current !== filtersKey) {
      cacheRef.current.clear();
      filtersKeyRef.current = filtersKey;
    }
  }, [filtersKey]);

  const updateTimeframe = useCallback((next: number) => {
    timeframeRef.current = next;
    setTimeframeState(next);
  }, []);

  useEffect(() => {
    if (months && months !== timeframeRef.current) {
      updateTimeframe(months);
    }
  }, [months, updateTimeframe]);

  const setTimeframe = useCallback(
    (next: number) => {
      if (next === timeframeRef.current) {
        return;
      }
      updateTimeframe(next);
    },
    [updateTimeframe]
  );

  const refresh = useCallback(() => {
    const key = `${filtersKey}|${timeframe}`;
    cacheRef.current.delete(key);
    refreshModeRef.current = true;
    setRefreshCounter((previous) => previous + 1);
  }, [filtersKey, timeframe]);

  useEffect(() => {
    const key = `${filtersKey}|${timeframe}`;
    const cached = cacheRef.current.get(key);
    const ttlMs = autoRefreshMs === null ? null : autoRefreshMs;
    const now = Date.now();
    const shouldForceRefresh = refreshModeRef.current;
    const cacheValid =
      !!cached && (ttlMs === null || now - cached.timestamp < ttlMs) && !shouldForceRefresh;

    if (cacheValid) {
      setStatus('success');
      setData(cached.data);
      setError(null);
      setLastUpdated(cached.lastUpdated);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;

    setStatus(cached && !shouldForceRefresh ? 'success' : 'loading');
    if (cached) {
      setData(cached.data);
      setLastUpdated(cached.lastUpdated);
    }
    if (!cached || shouldForceRefresh) {
      setError(null);
    }

    const load = async () => {
      try {
        const response = await fetchMonthlyTrends({
          ...effectiveFilters,
          months: timeframe,
          signal: controller.signal,
          refresh: shouldForceRefresh,
        });

        if (controller.signal.aborted) {
          return;
        }

        const generatedAt = new Date().toISOString();
        const entry: CacheEntry = {
          data: response,
          lastUpdated: generatedAt,
          timestamp: Date.now(),
        };
        cacheRef.current.set(key, entry);
        setData(response);
        setStatus('success');
        setError(null);
        setLastUpdated(generatedAt);
      } catch (caught) {
        if (controller.signal.aborted) {
          return;
        }
        setStatus('error');
        setData(null);
        setError(
          caught instanceof Error ? caught.message : 'Failed to load strategic monthly trends'
        );
      } finally {
        if (!controller.signal.aborted) {
          refreshModeRef.current = false;
        }
      }
    };

    void load();

    return () => {
      controller.abort();
    };
  }, [autoRefreshMs, effectiveFilters, filtersKey, timeframe, refreshCounter]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!autoRefreshMs || autoRefreshMs <= 0 || status !== 'success' || !lastUpdated) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      refreshModeRef.current = true;
      setRefreshCounter((previous) => previous + 1);
    }, autoRefreshMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [autoRefreshMs, status, lastUpdated]);

  return {
    timeframe,
    setTimeframe,
    availableTimeframes,
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
