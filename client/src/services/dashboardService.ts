import type {
  DashboardFilterParams,
  DashboardRecentIncident,
  DashboardSummary,
} from '@/types/dashboard';

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

interface RequestOptions extends DashboardFilterParams {
  signal?: AbortSignal;
}

const buildRequestInit = (signal?: AbortSignal): RequestInit => ({
  method: 'GET',
  headers: {
    Accept: 'application/json',
  },
  credentials: 'same-origin',
  signal,
});

export const fetchDashboardSummary = async ({
  signal,
  ...filters
}: RequestOptions = {}): Promise<DashboardSummary> => {
  const url = buildUrl('/dashboard/summary', filters);

  const response = await fetch(url.toString(), buildRequestInit(signal));

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to fetch dashboard summary (status ${response.status})`);
  }

  return (await response.json()) as DashboardSummary;
};

export const fetchDashboardRecentIncidents = async ({
  signal,
  ...filters
}: RequestOptions = {}): Promise<DashboardRecentIncident[]> => {
  const url = buildUrl('/dashboard/recent-incidents', filters);

  const response = await fetch(url.toString(), buildRequestInit(signal));

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message || `Failed to fetch dashboard recent incidents (status ${response.status})`
    );
  }

  return (await response.json()) as DashboardRecentIncident[];
};
