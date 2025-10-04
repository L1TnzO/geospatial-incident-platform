import { useMemo } from 'react';
import { useDashboardQuery } from './useDashboardQuery';
import { fetchRecentIncidents } from '@/services/dashboardService';
import type { DashboardRecentIncident } from '@/types/dashboard';

export interface DashboardRecentIncidentsState {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: DashboardRecentIncident[];
  error: string | null;
  lastUpdated: string | null;
  refresh: () => void;
}

export const useDashboardRecentIncidents = (limit = 10): DashboardRecentIncidentsState => {
  const requestParams = useMemo(() => ({ limit }), [limit]);

  const state = useDashboardQuery<DashboardRecentIncident[]>(fetchRecentIncidents, {
    requestParams,
    errorMessage: 'Failed to load recent incidents for dashboard',
  });

  return {
    status: state.status,
    data: state.data ?? [],
    error: state.error,
    lastUpdated: state.lastUpdated,
    refresh: state.refresh,
  };
};
