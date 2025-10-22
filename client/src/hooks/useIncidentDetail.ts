import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';
import { mapIncidentDetailToUi } from '../services/incidents';
import { queryKeys } from '../services/query-keys';
import { useIncidentDetailStore } from '../store/incident-detail-store';
import type { Incident } from '../types';

export const useIncidentDetail = (incidentId?: string) => {
  const cacheEntry = useIncidentDetailStore((state) =>
    incidentId ? state.getIncidentDetail(incidentId) : undefined,
  );
  const cacheDetail = cacheEntry?.detail as Incident | undefined;

  const query = useQuery<Incident | null, Error>({
    queryKey: incidentId ? queryKeys.incidents.detail(incidentId) : queryKeys.incidents.detail(''),
    queryFn: async ({ signal }) => {
      if (!incidentId) {
        return null;
      }
      const detail = await apiClient.incidents.detail(incidentId, { signal });
      const mapped = mapIncidentDetailToUi(detail);
      if (mapped) {
        useIncidentDetailStore.getState().cacheIncidentDetail(incidentId, mapped);
      }
      return mapped;
    },
    enabled: Boolean(incidentId),
    placeholderData: cacheDetail,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
  });

  useEffect(() => {
    const store = useIncidentDetailStore.getState();
    if (query.isLoading && incidentId) {
      store.setPendingIncident(incidentId);
    } else if (!query.isLoading) {
      store.setPendingIncident(null);
    }

    if (query.isError) {
      store.setError(query.error.message);
    } else if (!query.isFetching) {
      store.clearError();
    }
  }, [query.isLoading, query.isError, query.error, query.isFetching, incidentId]);

  return query;
};
