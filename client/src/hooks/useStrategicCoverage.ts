import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { fetchCoverageAnalysis } from '../services/strategic-service';
import { queryKeys } from '../services/query-keys';
import type { CoverageBuffersParams, StrategicCoverageResponse } from '../types/api/strategic';

export interface UseStrategicCoverageResult
  extends Omit<UseQueryResult<StrategicCoverageResponse, Error>, 'refetch'> {
  refresh: (bypassCache?: boolean) => Promise<void>;
  lastUpdated: number | null;
}

export type StrategicCoverageOptions = Omit<
  UseQueryOptions<StrategicCoverageResponse, Error, StrategicCoverageResponse>,
  'queryKey' | 'queryFn'
>;

export const useStrategicCoverage = (
  params: CoverageBuffersParams = {},
  options?: StrategicCoverageOptions,
): UseStrategicCoverageResult => {
  const { refresh: filterRefresh, ...queryParams } = params;

  const query = useQuery<StrategicCoverageResponse, Error>({
    queryKey: queryKeys.strategic.coverageBuffers(queryParams),
    queryFn: ({ signal }) =>
      fetchCoverageAnalysis({ ...queryParams, refresh: filterRefresh }, signal),
    staleTime: 5 * 60 * 1000, // 5 minutes (matches backend cache)
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });

  const refresh = async (bypassCache = false) => {
    if (bypassCache) {
      // Force refetch with refresh=true to bypass backend cache
      await fetchCoverageAnalysis({ ...queryParams, refresh: true }, undefined);
    }
    await query.refetch({ cancelRefetch: true });
  };

  return {
    ...query,
    refresh,
    lastUpdated: query.dataUpdatedAt,
  };
};
