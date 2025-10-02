import type { IncidentListResponse } from '@/types/incidents';

const DEFAULT_PAGE_SIZE = 100;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const buildUrl = (path: string, params?: Record<string, string | number | undefined>) => {
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

export interface FetchIncidentsOptions {
  signal?: AbortSignal;
  page?: number;
  pageSize?: number;
}

export const fetchIncidents = async ({
  signal,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
}: FetchIncidentsOptions = {}): Promise<IncidentListResponse> => {
  const url = buildUrl('/incidents', {
    page,
    pageSize,
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
    throw new Error(message || `Failed to fetch incidents (status ${response.status})`);
  }

  const json = (await response.json()) as IncidentListResponse;
  return json;
};
