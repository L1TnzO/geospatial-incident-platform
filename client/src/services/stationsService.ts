import type { StationListResponse } from '@/types/stations';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const buildUrl = (path: string, params?: Record<string, string | number | boolean | undefined>) => {
  const normalizedBase = API_BASE_URL.startsWith('http')
    ? API_BASE_URL.replace(/\/$/, '')
    : `${window.location.origin}${API_BASE_URL.replace(/\/$/, '')}`;

  const normalizedPath = path.replace(/^\//, '');
  const url = new URL(`${normalizedBase}/${normalizedPath}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url;
};

export interface FetchStationsOptions {
  signal?: AbortSignal;
  isActive?: boolean;
}

export const fetchStations = async ({
  signal,
  isActive,
}: FetchStationsOptions = {}): Promise<StationListResponse> => {
  const url = buildUrl('/stations', {
    isActive,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
    credentials: 'same-origin',
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to fetch stations (status ${response.status})`);
  }

  const json = (await response.json()) as StationListResponse;
  return json;
};
