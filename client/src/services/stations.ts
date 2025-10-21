import type { StationListResponse, StationSummary } from '../types/api/stations';
import type { FireStation } from '../types';
import { apiClient, type FetchStationsParams } from './api-client';

export const listStations = async (options?: FetchStationsParams): Promise<StationListResponse> =>
  apiClient.stations.list(options);

export const mapStationToUi = (station: StationSummary): FireStation | null => {
  const coordinates = station.location.geometry?.coordinates;
  if (!coordinates || coordinates.length < 2) {
    return null;
  }

  const [lng, lat] = coordinates;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  return {
    id: station.stationCode,
    name: station.name,
    location: {
      lat,
      lng,
    },
  };
};
