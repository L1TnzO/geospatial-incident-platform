import type { DashboardFilterParams } from '@/types/dashboard';
import type { StrategicResponseMetricsResponse, StrategicGroupBy } from '@/types/strategic';
import { fetchResponseMetrics } from '@/services/strategicAnalyticsService';
import { useStrategicQuery, type StrategicQueryState } from './useStrategicQuery';

export interface StrategicResponseMetricsOptions {
  groupBy?: StrategicGroupBy;
  resolution?: number;
  filters?: Partial<DashboardFilterParams>;
  autoRefreshMs?: number | null;
}

export const useStrategicResponseMetrics = (
  options: StrategicResponseMetricsOptions = {}
): StrategicQueryState<StrategicResponseMetricsResponse> => {
  const { groupBy, resolution, filters, autoRefreshMs } = options;
  const requestParams: Record<string, unknown> = {};
  if (groupBy) {
    requestParams.groupBy = groupBy;
  }
  if (resolution !== undefined) {
    requestParams.resolution = resolution;
  }

  return useStrategicQuery(fetchResponseMetrics, {
    filterOverrides: filters,
    requestParams: Object.keys(requestParams).length ? requestParams : undefined,
    ttlMs: autoRefreshMs,
    errorMessage: 'Failed to load strategic response metrics',
  });
};
