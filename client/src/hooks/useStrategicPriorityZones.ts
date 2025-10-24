import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { fetchPriorityZones } from '../services/strategic-service';
import { queryKeys } from '../services/query-keys';
import type { PriorityScoresParams, StrategicPriorityScoreResponse } from '../types/api/strategic';

export interface UseStrategicPriorityZonesResult
  extends Omit<UseQueryResult<StrategicPriorityScoreResponse, Error>, 'refetch'> {
  refresh: (bypassCache?: boolean) => Promise<void>;
  lastUpdated: number | null;
}

export type StrategicPriorityZonesOptions = Omit<
  UseQueryOptions<StrategicPriorityScoreResponse, Error, StrategicPriorityScoreResponse>,
  'queryKey' | 'queryFn'
>;

export const useStrategicPriorityZones = (
  params: PriorityScoresParams = {},
  options?: StrategicPriorityZonesOptions,
): UseStrategicPriorityZonesResult => {
  const { refresh: filterRefresh, ...queryParams } = params;

  const query = useQuery<StrategicPriorityScoreResponse, Error>({
    queryKey: queryKeys.strategic.priorityScores(queryParams),
    queryFn: ({ signal }) => fetchPriorityZones({ ...queryParams, refresh: filterRefresh }, signal),
    staleTime: 5 * 60 * 1000, // 5 minutes (matches backend cache)
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });

  const refresh = async (bypassCache = false) => {
    if (bypassCache) {
      // Force refetch with refresh=true to bypass backend cache
      await fetchPriorityZones({ ...queryParams, refresh: true }, undefined);
    }
    await query.refetch({ cancelRefetch: true });
  };

  return {
    ...query,
    refresh,
    lastUpdated: query.dataUpdatedAt,
  };
};
