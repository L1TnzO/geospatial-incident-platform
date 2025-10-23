import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { fetchLast24HoursKpi } from '../services/dashboard-service';
import { queryKeys } from '../services/query-keys';
import type { DashboardFilterParams, Last24HoursKpiResponse } from '../types/api/dashboard';

export interface UseDashboardLast24HoursKpiResult
  extends Omit<UseQueryResult<Last24HoursKpiResponse, Error>, 'refetch'> {
  refresh: (bypassCache?: boolean) => Promise<void>;
  lastUpdated: number | null;
}

export type DashboardLast24HoursKpiOptions = Omit<
  UseQueryOptions<Last24HoursKpiResponse, Error, Last24HoursKpiResponse>,
  'queryKey' | 'queryFn'
>;

export const useDashboardLast24HoursKpi = (
  filters: DashboardFilterParams = {},
  options?: DashboardLast24HoursKpiOptions,
): UseDashboardLast24HoursKpiResult => {
  const { refresh: filterRefresh, ...queryParams } = filters;

  const query = useQuery<Last24HoursKpiResponse, Error>({
    queryKey: queryKeys.dashboard.kpiLast24Hours(queryParams),
    queryFn: ({ signal }) =>
      fetchLast24HoursKpi({ ...queryParams, refresh: filterRefresh }, signal),
    ...options,
  });

  const refresh = async (bypassCache = false) => {
    await query.refetch({
      cancelRefetch: true,
    });
    if (bypassCache) {
      // Force refetch with refresh=true to bypass backend cache
      await fetchLast24HoursKpi({ ...queryParams, refresh: true }, undefined);
      await query.refetch({ cancelRefetch: true });
    }
  };

  return {
    ...query,
    refresh,
    lastUpdated: query.dataUpdatedAt,
  };
};
