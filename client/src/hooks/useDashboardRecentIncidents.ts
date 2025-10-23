import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { fetchRecentIncidents } from '../services/dashboard-service';
import { queryKeys } from '../services/query-keys';
import type {
  DashboardRecentIncidentsParams,
  RecentIncidentsResponse,
} from '../types/api/dashboard';

export interface UseDashboardRecentIncidentsResult
  extends Omit<UseQueryResult<RecentIncidentsResponse, Error>, 'refetch'> {
  refresh: (bypassCache?: boolean) => Promise<void>;
  lastUpdated: number | null;
}

export type DashboardRecentIncidentsOptions = Omit<
  UseQueryOptions<RecentIncidentsResponse, Error, RecentIncidentsResponse>,
  'queryKey' | 'queryFn'
>;

export const useDashboardRecentIncidents = (
  filters: DashboardRecentIncidentsParams = {},
  options?: DashboardRecentIncidentsOptions,
): UseDashboardRecentIncidentsResult => {
  const { refresh: filterRefresh, limit = 10, ...queryParams } = filters;

  const query = useQuery<RecentIncidentsResponse, Error>({
    queryKey: queryKeys.dashboard.recentIncidents({ ...queryParams, limit }),
    queryFn: ({ signal }) =>
      fetchRecentIncidents({ ...queryParams, limit, refresh: filterRefresh }, signal),
    ...options,
  });

  const refresh = async (bypassCache = false) => {
    await query.refetch({
      cancelRefetch: true,
    });
    if (bypassCache) {
      await fetchRecentIncidents({ ...queryParams, limit, refresh: true }, undefined);
      await query.refetch({ cancelRefetch: true });
    }
  };

  return {
    ...query,
    refresh,
    lastUpdated: query.dataUpdatedAt,
  };
};
