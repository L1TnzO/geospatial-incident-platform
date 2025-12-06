import { useQuery } from '@tanstack/react-query';
import { fetchDistrictFrequentIncidents } from '../services/strategic-service';
import { queryKeys } from '../services/query-keys';
import type { DashboardFilterParams } from '../types/api/dashboard';
import type { StrategicDistrictFrequentIncidentsResponse } from '../types/api/strategic';

export function useStrategicDistrictFrequentIncidents(
    filters: DashboardFilterParams,
    options?: { enabled?: boolean },
) {
    const queryKey = queryKeys.strategic.districtFrequentIncidents(filters);

    const query = useQuery<StrategicDistrictFrequentIncidentsResponse, Error>({
        queryKey,
        queryFn: ({ signal }) => fetchDistrictFrequentIncidents(filters, signal),
        enabled: options?.enabled,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    return {
        ...query,
        refresh: () => query.refetch(),
    };
}
