import { useEffect, useRef, useState } from 'react';
import { fetchDashboardRecentIncidents } from '@/services/dashboardService';
import type { DashboardRecentIncident } from '@/types/dashboard';
import { useDashboardFilters } from './useDashboardFilters';

export type DashboardRecentIncidentsStatus = 'idle' | 'loading' | 'success' | 'error';

export interface DashboardRecentIncidentsState {
  status: DashboardRecentIncidentsStatus;
  data: DashboardRecentIncident[];
  error: string | null;
}

const initialState: DashboardRecentIncidentsState = {
  status: 'idle',
  data: [],
  error: null,
};

export const useDashboardRecentIncidents = (): DashboardRecentIncidentsState => {
  const filters = useDashboardFilters();
  const [state, setState] = useState<DashboardRecentIncidentsState>(initialState);
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
        const incidents = await fetchDashboardRecentIncidents({
          ...filters,
          signal: controller.signal,
        });

        if (cancelled || controller.signal.aborted) {
          return;
        }

        setState({
          status: 'success',
          data: incidents,
          error: null,
        });
      } catch (error) {
        if (cancelled || controller.signal.aborted) {
          return;
        }

        setState({
          status: 'error',
          data: [],
          error:
            error instanceof Error
              ? error.message
              : 'Failed to load recent incidents for dashboard',
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
