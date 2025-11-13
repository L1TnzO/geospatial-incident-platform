import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { apiClient, type FetchIncidentsParams } from '../services/api-client';
import { queryKeys } from '../services/query-keys';
import type { IncidentListResponse } from '../types/api/incidents';

export type IncidentsQueryOptions = Omit<
  UseQueryOptions<IncidentListResponse, Error, IncidentListResponse>,
  'queryKey' | 'queryFn'
>;

export const useIncidentsQuery = (
  params: FetchIncidentsParams = {},
  options?: IncidentsQueryOptions,
): UseQueryResult<IncidentListResponse, Error> => {
  const { signal: userSignal, renderLimit, ...queryParams } = params;

  return useQuery<IncidentListResponse, Error>({
    queryKey: queryKeys.incidents.list(queryParams),
    queryFn: ({ signal }) => apiClient.incidents.list({ ...params, signal: userSignal ?? signal }),
    ...options,
  });
};
