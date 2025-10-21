import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';
import { queryKeys } from '../services/query-keys';
import type { IncidentMetadata } from '../types/api/incidents';

export type IncidentMetadataQueryOptions = Omit<
  UseQueryOptions<IncidentMetadata, Error, IncidentMetadata>,
  'queryKey' | 'queryFn'
>;

export const useIncidentMetadataQuery = (
  options?: IncidentMetadataQueryOptions,
): UseQueryResult<IncidentMetadata, Error> =>
  useQuery<IncidentMetadata, Error>({
    queryKey: queryKeys.incidents.metadata,
    queryFn: ({ signal }) => apiClient.incidents.metadata({ signal }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
