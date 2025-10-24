import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { fetchHotspots } from '../services/strategic-service';
import { queryKeys } from '../services/query-keys';
import type { HotspotsParams, StrategicHotspotResponse } from '../types/api/strategic';

export interface UseStrategicHotspotsResult
  extends Omit<UseQueryResult<StrategicHotspotResponse, Error>, 'refetch'> {
  refresh: (bypassCache?: boolean) => Promise<void>;
  lastUpdated: number | null;
}

export type StrategicHotspotsOptions = Omit<
  UseQueryOptions<StrategicHotspotResponse, Error, StrategicHotspotResponse>,
  'queryKey' | 'queryFn'
>;

export const useStrategicHotspots = (
  params: HotspotsParams = {},
  options?: StrategicHotspotsOptions,
): UseStrategicHotspotsResult => {
  const { refresh: filterRefresh, ...queryParams } = params;

  const query = useQuery<StrategicHotspotResponse, Error>({
    queryKey: queryKeys.strategic.hotspots(queryParams),
    queryFn: ({ signal }) => fetchHotspots({ ...queryParams, refresh: filterRefresh }, signal),
    staleTime: 5 * 60 * 1000, // 5 minutes (matches backend cache)
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });

  const refresh = async (bypassCache = false) => {
    if (bypassCache) {
      // Force refetch with refresh=true to bypass backend cache
      await fetchHotspots({ ...queryParams, refresh: true }, undefined);
    }
    await query.refetch({ cancelRefetch: true });
  };

  return {
    ...query,
    refresh,
    lastUpdated: query.dataUpdatedAt,
  };
};
