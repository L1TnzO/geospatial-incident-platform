import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { mapStationToUi } from '../services/stations';
import { queryKeys } from '../services/query-keys';
import { apiClient, type FetchStationsParams } from '../services/api-client';
import type { FireStation } from '../types';

interface StationsDataResult {
  stations: FireStation[];
  isLoading: boolean;
  isError: boolean;
  error?: string;
  refresh: () => void;
  lastUpdated?: Date;
}

export const useStationsData = (
  params: FetchStationsParams = { isActive: true },
): StationsDataResult => {
  const query: UseQueryResult<FireStation[], Error> = useQuery({
    queryKey: [...queryKeys.stations.all, params.isActive ?? 'all'],
    queryFn: async ({ signal }) => {
      const response = await apiClient.stations.list({ ...params, signal });
      return response.data
        .map(mapStationToUi)
        .filter((station): station is FireStation => station !== null);
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

  return {
    stations: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error?.message,
    refresh: () => {
      void query.refetch({ cancelRefetch: false });
    },
    lastUpdated: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : undefined,
  };
};
