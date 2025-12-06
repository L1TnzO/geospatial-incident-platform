import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { mapInfrastructureToUi, listInfrastructure } from '../services/infrastructure';
import { queryKeys } from '../services/query-keys';
import type { ObsoleteInfrastructure } from '../types';

interface InfrastructureDataResult {
    infrastructure: ObsoleteInfrastructure[];
    isLoading: boolean;
    isError: boolean;
    error?: string;
    refresh: () => void;
}

export const useInfrastructureData = (): InfrastructureDataResult => {
    const query: UseQueryResult<ObsoleteInfrastructure[], Error> = useQuery({
        queryKey: queryKeys.infrastructure.all,
        queryFn: async () => {
            const response = await listInfrastructure();
            return response.data
                .map(mapInfrastructureToUi)
                .filter((infra): infra is ObsoleteInfrastructure => infra !== null);
        },
        staleTime: 60_000,
        gcTime: 10 * 60_000,
    });

    return {
        infrastructure: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error?.message,
        refresh: () => {
            void query.refetch({ cancelRefetch: false });
        },
    };
};
