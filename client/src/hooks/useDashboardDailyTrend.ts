import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { fetchDailyTrend } from '../services/dashboard-service';
import { queryKeys } from '../services/query-keys';
import type { DashboardFilterParams, DailyTrendResponse } from '../types/api/dashboard';

export interface UseDashboardDailyTrendResult
  extends Omit<UseQueryResult<DailyTrendResponse, Error>, 'refetch'> {
  refresh: (bypassCache?: boolean) => Promise<void>;
  lastUpdated: number | null;
}

export type DashboardDailyTrendOptions = Omit<
  UseQueryOptions<DailyTrendResponse, Error, DailyTrendResponse>,
  'queryKey' | 'queryFn'
>;

export const useDashboardDailyTrend = (
  filters: DashboardFilterParams = {},
  options?: DashboardDailyTrendOptions,
): UseDashboardDailyTrendResult => {
  const { refresh: filterRefresh, ...queryParams } = filters;

  const query = useQuery<DailyTrendResponse, Error>({
    queryKey: queryKeys.dashboard.dailyTrend(queryParams),
    queryFn: ({ signal }) => fetchDailyTrend({ ...queryParams, refresh: filterRefresh }, signal),
    ...options,
  });

  const refresh = async (bypassCache = false) => {
    await query.refetch({
      cancelRefetch: true,
    });
    if (bypassCache) {
      await fetchDailyTrend({ ...queryParams, refresh: true }, undefined);
      await query.refetch({ cancelRefetch: true });
    }
  };

  return {
    ...query,
    refresh,
    lastUpdated: query.dataUpdatedAt,
  };
};
