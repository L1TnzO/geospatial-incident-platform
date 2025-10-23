import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { fetchTypeDistribution } from '../services/dashboard-service';
import { queryKeys } from '../services/query-keys';
import type { DashboardFilterParams, TypeDistributionResponse } from '../types/api/dashboard';

export interface UseDashboardTypeDistributionResult
  extends Omit<UseQueryResult<TypeDistributionResponse, Error>, 'refetch'> {
  refresh: (bypassCache?: boolean) => Promise<void>;
  lastUpdated: number | null;
}

export type DashboardTypeDistributionOptions = Omit<
  UseQueryOptions<TypeDistributionResponse, Error, TypeDistributionResponse>,
  'queryKey' | 'queryFn'
>;

export const useDashboardTypeDistribution = (
  filters: DashboardFilterParams = {},
  options?: DashboardTypeDistributionOptions,
): UseDashboardTypeDistributionResult => {
  const { refresh: filterRefresh, ...queryParams } = filters;

  const query = useQuery<TypeDistributionResponse, Error>({
    queryKey: queryKeys.dashboard.typeDistribution(queryParams),
    queryFn: ({ signal }) =>
      fetchTypeDistribution({ ...queryParams, refresh: filterRefresh }, signal),
    ...options,
  });

  const refresh = async (bypassCache = false) => {
    await query.refetch({
      cancelRefetch: true,
    });
    if (bypassCache) {
      await fetchTypeDistribution({ ...queryParams, refresh: true }, undefined);
      await query.refetch({ cancelRefetch: true });
    }
  };

  return {
    ...query,
    refresh,
    lastUpdated: query.dataUpdatedAt,
  };
};
