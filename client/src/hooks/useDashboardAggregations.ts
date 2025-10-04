import { useEffect, useRef, useState } from 'react';
import { fetchDashboardSummary } from '@/services/dashboardService';
import type { DashboardSummary } from '@/types/dashboard';
import { useDashboardFilters } from './useDashboardFilters';

export type DashboardAggregationsStatus = 'idle' | 'loading' | 'success' | 'error';

export interface DashboardAggregationsState {
  status: DashboardAggregationsStatus;
  data: DashboardSummary | null;
  error: string | null;
}

const initialState: DashboardAggregationsState = {
  status: 'idle',
  data: null,
  error: null,
};

export const useDashboardAggregations = (): DashboardAggregationsState => {
  const filters = useDashboardFilters();
  const [state, setState] = useState<DashboardAggregationsState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;

    let cancelled = false;

    setState((previous) => ({
      ...previous,
      status: 'loading',
      error: null,
    }));

    const load = async () => {
      try {
        const summary = await fetchDashboardSummary({ ...filters, signal: controller.signal });
        if (cancelled || controller.signal.aborted) {
          return;
        }

        setState({
          status: 'success',
          data: summary,
          error: null,
        });
      } catch (error) {
        if (cancelled || controller.signal.aborted) {
          return;
        }

        setState({
          status: 'error',
          data: null,
          error: error instanceof Error ? error.message : 'Failed to load dashboard summary',
        });
      }
    };

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [filters]);

  return state;
};
