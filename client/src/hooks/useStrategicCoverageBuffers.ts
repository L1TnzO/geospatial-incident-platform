import type { DashboardFilterParams } from '@/types/dashboard';
import type { StrategicCoverageResponse } from '@/types/strategic';
import { fetchCoverageBuffers } from '@/services/strategicAnalyticsService';
import { useStrategicQuery, type StrategicQueryState } from './useStrategicQuery';

export interface StrategicCoverageBuffersOptions {
  filters?: Partial<DashboardFilterParams>;
  autoRefreshMs?: number | null;
}

export const useStrategicCoverageBuffers = (
  options: StrategicCoverageBuffersOptions = {}
): StrategicQueryState<StrategicCoverageResponse> => {
  const { filters, autoRefreshMs } = options;
  return useStrategicQuery(fetchCoverageBuffers, {
    filterOverrides: filters,
    ttlMs: autoRefreshMs,
    errorMessage: 'Failed to load strategic station coverage buffers',
  });
};
