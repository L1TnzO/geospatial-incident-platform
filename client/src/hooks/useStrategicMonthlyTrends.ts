import type { DashboardFilterParams } from '@/types/dashboard';
import type { StrategicMonthlyTrendResponse } from '@/types/strategic';
import { fetchMonthlyTrends } from '@/services/strategicAnalyticsService';
import { useStrategicQuery, type StrategicQueryState } from './useStrategicQuery';

export interface StrategicMonthlyTrendsOptions {
  months?: number;
  filters?: Partial<DashboardFilterParams>;
  autoRefreshMs?: number | null;
}

export const useStrategicMonthlyTrends = (
  options: StrategicMonthlyTrendsOptions = {}
): StrategicQueryState<StrategicMonthlyTrendResponse> => {
  const { months, filters, autoRefreshMs } = options;
  return useStrategicQuery(fetchMonthlyTrends, {
    filterOverrides: filters,
    requestParams: months ? { months } : undefined,
    ttlMs: autoRefreshMs,
    errorMessage: 'Failed to load strategic monthly trends',
  });
};
