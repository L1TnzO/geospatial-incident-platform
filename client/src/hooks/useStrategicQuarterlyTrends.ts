import type { DashboardFilterParams } from '@/types/dashboard';
import type { StrategicQuarterlyTrendResponse } from '@/types/strategic';
import { fetchQuarterlyTrends } from '@/services/strategicAnalyticsService';
import { useStrategicQuery, type StrategicQueryState } from './useStrategicQuery';

export interface StrategicQuarterlyTrendsOptions {
  quarters?: number;
  filters?: Partial<DashboardFilterParams>;
  autoRefreshMs?: number | null;
}

export const useStrategicQuarterlyTrends = (
  options: StrategicQuarterlyTrendsOptions = {}
): StrategicQueryState<StrategicQuarterlyTrendResponse> => {
  const { quarters, filters, autoRefreshMs } = options;
  return useStrategicQuery(fetchQuarterlyTrends, {
    filterOverrides: filters,
    requestParams: quarters ? { quarters } : undefined,
    ttlMs: autoRefreshMs,
    errorMessage: 'Failed to load strategic quarterly trends',
  });
};
