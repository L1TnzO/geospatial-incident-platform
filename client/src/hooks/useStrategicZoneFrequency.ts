import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';
import type { DashboardFilterParams } from '../types/api/dashboard';
import type { StrategicZoneFrequencyResponse } from '../types/api/strategic';

export function useStrategicZoneFrequency(filters: DashboardFilterParams) {
    const queryKey = ['strategic', 'zone-frequency', filters];

    const query = useQuery<StrategicZoneFrequencyResponse>({
        queryKey,
        queryFn: () => apiClient.strategic.zoneFrequency(filters),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    return {
        ...query,
        refresh: () => query.refetch(),
    };
}
