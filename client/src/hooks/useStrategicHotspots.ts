import type { DashboardFilterParams } from '@/types/dashboard';
import type { StrategicHotspotResponse } from '@/types/strategic';
import { fetchHotspots } from '@/services/strategicAnalyticsService';
import { useStrategicQuery, type StrategicQueryState } from './useStrategicQuery';

export interface StrategicHotspotsOptions {
  resolution?: number;
  filters?: Partial<DashboardFilterParams>;
  autoRefreshMs?: number | null;
}

export const useStrategicHotspots = (
  options: StrategicHotspotsOptions = {}
): StrategicQueryState<StrategicHotspotResponse> => {
  const { resolution, filters, autoRefreshMs } = options;
  return useStrategicQuery(fetchHotspots, {
    filterOverrides: filters,
    requestParams: resolution ? { resolution } : undefined,
    ttlMs: autoRefreshMs,
    errorMessage: 'Failed to load strategic hotspots',
  });
};
