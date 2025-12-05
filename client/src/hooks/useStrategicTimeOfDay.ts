import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { fetchStrategicTimeOfDay } from '../services/strategic-service';
import { queryKeys } from '../services/query-keys';
import type { DashboardFilterParams } from '../types/api/dashboard';
import type { StrategicTimeOfDayResponse } from '../types/api/strategic';

export interface UseStrategicTimeOfDayResult
    extends Omit<UseQueryResult<StrategicTimeOfDayResponse, Error>, 'refetch'> {
    refresh: (bypassCache?: boolean) => Promise<void>;
    lastUpdated: number | null;
}

export type StrategicTimeOfDayOptions = Omit<
    UseQueryOptions<StrategicTimeOfDayResponse, Error, StrategicTimeOfDayResponse>,
    'queryKey' | 'queryFn'
>;

export const useStrategicTimeOfDay = (
    filters: DashboardFilterParams = {},
    options?: StrategicTimeOfDayOptions,
): UseStrategicTimeOfDayResult => {
    const { refresh: filterRefresh, ...queryParams } = filters;

    const query = useQuery<StrategicTimeOfDayResponse, Error>({
        queryKey: queryKeys.strategic.timeOfDay(queryParams),
        queryFn: ({ signal }) => fetchStrategicTimeOfDay({ ...queryParams, refresh: filterRefresh }, signal),
        ...options,
    });

    const refresh = async (bypassCache = false) => {
        await query.refetch({
            cancelRefetch: true,
        });
        if (bypassCache) {
            await fetchStrategicTimeOfDay({ ...queryParams, refresh: true }, undefined);
            await query.refetch({ cancelRefetch: true });
        }
    };

    return {
        ...query,
        refresh,
        lastUpdated: query.dataUpdatedAt,
    };
};
