
import { useQuery } from '@tanstack/react-query';
import { fetchIncidentProjections } from '../services/strategic-service';
import { useDashboard } from '../providers/dashboard-provider';
import type { DashboardFilterParams } from '../types/api/dashboard';

export const useStrategicProjections = (filters: DashboardFilterParams = {}) => {
    const { isYoY } = useDashboard();

    // Create a stable key for the cache based on filters
    const queryKey = ['strategic', 'projections', filters, isYoY];

    const query = useQuery({
        queryKey,
        queryFn: ({ signal }) => fetchIncidentProjections(filters, signal),
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
    });

    return {
        ...query,
        refresh: () => query.refetch(),
    };
};
