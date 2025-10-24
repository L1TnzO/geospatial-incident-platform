import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { fetchStrategicTrends } from '../services/strategic-service';
import { queryKeys } from '../services/query-keys';
import type { MonthlyTrendsParams, StrategicMonthlyTrendResponse } from '../types/api/strategic';

export interface UseStrategicTrendsResult
  extends Omit<UseQueryResult<StrategicMonthlyTrendResponse, Error>, 'refetch'> {
  refresh: (bypassCache?: boolean) => Promise<void>;
  lastUpdated: number | null;
}

export type StrategicTrendsOptions = Omit<
  UseQueryOptions<StrategicMonthlyTrendResponse, Error, StrategicMonthlyTrendResponse>,
  'queryKey' | 'queryFn'
>;

export const useStrategicTrends = (
  params: MonthlyTrendsParams = {},
  options?: StrategicTrendsOptions,
): UseStrategicTrendsResult => {
  const { refresh: filterRefresh, ...queryParams } = params;

  const query = useQuery<StrategicMonthlyTrendResponse, Error>({
    queryKey: queryKeys.strategic.monthlyTrends(queryParams),
    queryFn: ({ signal }) =>
      fetchStrategicTrends({ ...queryParams, refresh: filterRefresh }, signal),
    staleTime: 5 * 60 * 1000, // 5 minutes (matches backend cache)
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });

  const refresh = async (bypassCache = false) => {
    if (bypassCache) {
      // Force refetch with refresh=true to bypass backend cache
      await fetchStrategicTrends({ ...queryParams, refresh: true }, undefined);
    }
    await query.refetch({ cancelRefetch: true });
  };

  return {
    ...query,
    refresh,
    lastUpdated: query.dataUpdatedAt,
  };
};
