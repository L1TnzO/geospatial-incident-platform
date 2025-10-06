import type { DashboardFilterParams } from '@/types/dashboard';
import type { StrategicTypeTimelineResponse } from '@/types/strategic';
import { fetchTypeTimelines } from '@/services/strategicAnalyticsService';
import { useStrategicQuery, type StrategicQueryState } from './useStrategicQuery';

export interface StrategicTypeTimelineOptions {
  months?: number;
  filters?: Partial<DashboardFilterParams>;
  autoRefreshMs?: number | null;
}

export const useStrategicTypeTimelines = (
  options: StrategicTypeTimelineOptions = {}
): StrategicQueryState<StrategicTypeTimelineResponse> => {
  const { months, filters, autoRefreshMs } = options;
  return useStrategicQuery(fetchTypeTimelines, {
    filterOverrides: filters,
    requestParams: months ? { months } : undefined,
    ttlMs: autoRefreshMs,
    errorMessage: 'Failed to load strategic incident type timelines',
  });
};
