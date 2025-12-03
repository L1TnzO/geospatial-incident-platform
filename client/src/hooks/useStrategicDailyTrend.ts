import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { fetchStrategicDailyTrend } from '../services/strategic-service';
import { queryKeys } from '../services/query-keys';
import type { DashboardFilterParams, DailyTrendResponse } from '../types/api/dashboard';

export interface UseStrategicDailyTrendResult
    extends Omit<UseQueryResult<DailyTrendResponse, Error>, 'refetch'> {
    refresh: (bypassCache?: boolean) => Promise<void>;
    lastUpdated: number | null;
}

export type StrategicDailyTrendOptions = Omit<
    UseQueryOptions<DailyTrendResponse, Error, DailyTrendResponse>,
    'queryKey' | 'queryFn'
>;

export const useStrategicDailyTrend = (
    filters: DashboardFilterParams = {},
    options?: StrategicDailyTrendOptions,
): UseStrategicDailyTrendResult => {
    const { refresh: filterRefresh, ...queryParams } = filters;

    const query = useQuery<DailyTrendResponse, Error>({
        queryKey: queryKeys.strategic.dailyTrend(queryParams),
        queryFn: ({ signal }) => fetchStrategicDailyTrend({ ...queryParams, refresh: filterRefresh }, signal),
        ...options,
    });

    const refresh = async (bypassCache = false) => {
        await query.refetch({
            cancelRefetch: true,
        });
        if (bypassCache) {
            await fetchStrategicDailyTrend({ ...queryParams, refresh: true }, undefined);
            await query.refetch({ cancelRefetch: true });
        }
    };

    return {
        ...query,
        refresh,
        lastUpdated: query.dataUpdatedAt,
    };
};
