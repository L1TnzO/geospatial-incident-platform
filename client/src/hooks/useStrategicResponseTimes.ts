import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { fetchResponseTimePatterns } from '../services/strategic-service';
import { queryKeys } from '../services/query-keys';
import type {
  ResponseMetricsParams,
  StrategicResponseMetricsResponse,
} from '../types/api/strategic';

export interface UseStrategicResponseTimesResult
  extends Omit<UseQueryResult<StrategicResponseMetricsResponse, Error>, 'refetch'> {
  refresh: (bypassCache?: boolean) => Promise<void>;
  lastUpdated: number | null;
}

export type StrategicResponseTimesOptions = Omit<
  UseQueryOptions<StrategicResponseMetricsResponse, Error, StrategicResponseMetricsResponse>,
  'queryKey' | 'queryFn'
>;

export const useStrategicResponseTimes = (
  params: ResponseMetricsParams = {},
  options?: StrategicResponseTimesOptions,
): UseStrategicResponseTimesResult => {
  const { refresh: filterRefresh, ...queryParams } = params;

  const query = useQuery<StrategicResponseMetricsResponse, Error>({
    queryKey: queryKeys.strategic.responseMetrics(queryParams),
    queryFn: ({ signal }) =>
      fetchResponseTimePatterns({ ...queryParams, refresh: filterRefresh }, signal),
    staleTime: 5 * 60 * 1000, // 5 minutes (matches backend cache)
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });

  const refresh = async (bypassCache = false) => {
    if (bypassCache) {
      // Force refetch with refresh=true to bypass backend cache
      await fetchResponseTimePatterns({ ...queryParams, refresh: true }, undefined);
    }
    await query.refetch({ cancelRefetch: true });
  };

  return {
    ...query,
    refresh,
    lastUpdated: query.dataUpdatedAt,
  };
};
