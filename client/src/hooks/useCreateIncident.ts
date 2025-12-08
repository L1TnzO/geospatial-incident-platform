import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';
import { mapIncidentDetailToUi } from '../services/incidents';
import { queryKeys } from '../services/query-keys';
import { useIncidentDetailStore } from '../store/incident-detail-store';
import { incidentRepository } from '../services/IncidentRepository';
import type { IncidentCreateRequest } from '../types/api/incidents';

export const useCreateIncident = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: IncidentCreateRequest) => apiClient.incidents.create(payload),
    onSuccess: (detail) => {
      const mapped = mapIncidentDetailToUi(detail);
      if (mapped) {
        const store = useIncidentDetailStore.getState();
        store.cacheIncidentDetail(mapped.id, mapped);
        store.openIncident(mapped);
      }

      // Sync the repository to fetch the new incident (likely via Delta)
      void incidentRepository.sync();

      void queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.incidents.metadata });
    },
  });
};
