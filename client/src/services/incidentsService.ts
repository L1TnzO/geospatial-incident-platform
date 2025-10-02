import type { IncidentListResponse, IncidentSortField } from '@/types/incidents';

const DEFAULT_PAGE_SIZE = 100;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

type QueryValue = string | number | boolean | string[] | undefined;

const buildUrl = (path: string, params?: Record<string, QueryValue>) => {
  const normalizedBase = API_BASE_URL.startsWith('http')
    ? API_BASE_URL.replace(/\/$/, '')
    : `${window.location.origin}${API_BASE_URL.replace(/\/$/, '')}`;

  const normalizedPath = path.replace(/^\//, '');
  const url = new URL(`${normalizedBase}/${normalizedPath}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            url.searchParams.set(key, value.join(','));
          }
        } else if (typeof value === 'boolean') {
          url.searchParams.set(key, value ? 'true' : 'false');
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    });
  }

  return url;
};

export interface FetchIncidentsOptions {
  signal?: AbortSignal;
  page?: number;
  pageSize?: number;
  typeCodes?: string[];
  severityCodes?: string[];
  statusCodes?: string[];
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  sortBy?: IncidentSortField;
  sortDirection?: 'asc' | 'desc';
}

export const fetchIncidents = async ({
  signal,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  typeCodes,
  severityCodes,
  statusCodes,
  startDate,
  endDate,
  isActive,
  sortBy,
  sortDirection,
}: FetchIncidentsOptions = {}): Promise<IncidentListResponse> => {
  const normalizedPageSize = Math.min(Math.max(pageSize, 1), DEFAULT_PAGE_SIZE);

  const url = buildUrl('/incidents', {
    page,
    pageSize: normalizedPageSize,
    typeCodes,
    severityCodes,
    statusCodes,
    startDate,
    endDate,
    isActive,
    sortBy,
    sortDirection,
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
