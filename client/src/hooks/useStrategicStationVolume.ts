import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { http } from '../lib/http';
import type { StrategicStationVolumeResponse, StrategicFilterParams } from '../types/api/strategic';

async function fetchStationVolume(params: StrategicFilterParams): Promise<StrategicStationVolumeResponse> {
    const data = await http.get<StrategicStationVolumeResponse>('/strategic/stations/volume', {
        query: params as Record<string, string | number | boolean | (string | number)[] | undefined>,
    });
    return data;
}

export function useStrategicStationVolume(params: StrategicFilterParams) {
    return useQuery({
        queryKey: ['strategic', 'stations', 'volume', params],
        queryFn: () => fetchStationVolume(params),
        staleTime: 5 * 60 * 1000, // 5 minutes
        placeholderData: keepPreviousData,
    });
}
