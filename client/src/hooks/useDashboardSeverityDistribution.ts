import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { fetchSeverityDistribution } from '../services/dashboard-service';
import { queryKeys } from '../services/query-keys';
import type { DashboardFilterParams, SeverityDistributionResponse } from '../types/api/dashboard';

export interface UseDashboardSeverityDistributionResult
  extends Omit<UseQueryResult<SeverityDistributionResponse, Error>, 'refetch'> {
  refresh: (bypassCache?: boolean) => Promise<void>;
  lastUpdated: number | null;
}

export type DashboardSeverityDistributionOptions = Omit<
  UseQueryOptions<SeverityDistributionResponse, Error, SeverityDistributionResponse>,
  'queryKey' | 'queryFn'
>;

export const useDashboardSeverityDistribution = (
  filters: DashboardFilterParams = {},
  options?: DashboardSeverityDistributionOptions,
): UseDashboardSeverityDistributionResult => {
  const { refresh: filterRefresh, ...queryParams } = filters;

  const query = useQuery<SeverityDistributionResponse, Error>({
    queryKey: queryKeys.dashboard.severityDistribution(queryParams),
    queryFn: ({ signal }) =>
      fetchSeverityDistribution({ ...queryParams, refresh: filterRefresh }, signal),
    ...options,
  });

  const refresh = async (bypassCache = false) => {
    await query.refetch({
      cancelRefetch: true,
    });
    if (bypassCache) {
      await fetchSeverityDistribution({ ...queryParams, refresh: true }, undefined);
      await query.refetch({ cancelRefetch: true });
    }
  };

  return {
    ...query,
    refresh,
    lastUpdated: query.dataUpdatedAt,
  };
};
