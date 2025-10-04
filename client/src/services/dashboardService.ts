import type {
  DashboardDailyTrend,
  DashboardFilterParams,
  DashboardLast24HoursKpi,
  DashboardRecentIncident,
  DashboardSeverityDistribution,
  DashboardTypeDistribution,
} from '@/types/dashboard';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

type QueryValue = string | number | boolean | string[] | undefined;

const resolveBaseUrl = (): string => {
  const normalized = API_BASE_URL.replace(/\/$/, '');
  if (normalized.startsWith('http')) {
    return normalized;
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (normalized.startsWith('/')) {
    return `${origin}${normalized}`;
  }
  return `${origin}/${normalized}`;
};

const buildUrl = (path: string, params: Record<string, QueryValue> = {}) => {
  const base = resolveBaseUrl();
  const normalizedPath = path.replace(/^\//, '');
  const url = new URL(`${base}/${normalizedPath}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      if (value.length > 0) {
        url.searchParams.set(key, value.join(','));
      }
      return;
    }

    if (typeof value === 'boolean') {
      url.searchParams.set(key, value ? 'true' : 'false');
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url;
};

interface RequestOptions extends DashboardFilterParams {
  signal?: AbortSignal;
  refresh?: boolean;
}

interface RecentIncidentsOptions extends RequestOptions {
  limit?: number;
}

const buildQueryParams = (
  filters: DashboardFilterParams,
  extra?: { refresh?: boolean; limit?: number }
): Record<string, QueryValue> => {
  const params: Record<string, QueryValue> = {};

  if (filters.typeCodes?.length) {
    params.typeCodes = filters.typeCodes;
  }
  if (filters.severityCodes?.length) {
    params.severityCodes = filters.severityCodes;
  }
  if (filters.statusCodes?.length) {
    params.statusCodes = filters.statusCodes;
  }
  if (filters.startDate) {
    params.startDate = filters.startDate;
  }
  if (filters.endDate) {
    params.endDate = filters.endDate;
  }
  if (filters.incidentNumber) {
    params.incidentNumber = filters.incidentNumber;
  }
  if (typeof filters.isActive === 'boolean') {
    params.isActive = filters.isActive;
  }
  if (extra?.refresh) {
    params.refresh = true;
  }
  if (typeof extra?.limit === 'number') {
    params.limit = extra.limit;
  }

  return params;
};

const buildRequestInit = (signal?: AbortSignal): RequestInit => ({
  method: 'GET',
  headers: {
    Accept: 'application/json',
  },
  credentials: 'same-origin',
  signal,
});

const handleResponse = async <T>(response: Response, errorMessage: string): Promise<T> => {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `${errorMessage} (status ${response.status})`);
  }

  return (await response.json()) as T;
};

export const fetchLast24HoursKpi = async ({
  signal,
  refresh,
  ...filters
}: RequestOptions = {}): Promise<DashboardLast24HoursKpi> => {
  const url = buildUrl('/dashboard/kpi/last-24h', buildQueryParams(filters, { refresh }));
  const response = await fetch(url.toString(), buildRequestInit(signal));
  return handleResponse(response, 'Failed to fetch dashboard last-24-hours KPI');
};

export const fetchIncidentsByType = async ({
  signal,
  refresh,
  ...filters
}: RequestOptions = {}): Promise<DashboardTypeDistribution> => {
  const url = buildUrl('/dashboard/incidents/by-type', buildQueryParams(filters, { refresh }));
  const response = await fetch(url.toString(), buildRequestInit(signal));
  return handleResponse(response, 'Failed to fetch dashboard incidents by type');
};

export const fetchDailyTrend = async ({
  signal,
  refresh,
  ...filters
}: RequestOptions = {}): Promise<DashboardDailyTrend> => {
  const url = buildUrl('/dashboard/incidents/daily-trend', buildQueryParams(filters, { refresh }));
  const response = await fetch(url.toString(), buildRequestInit(signal));
  return handleResponse(response, 'Failed to fetch dashboard daily trend');
};

export const fetchSeverityDistribution = async ({
  signal,
  refresh,
  ...filters
}: RequestOptions = {}): Promise<DashboardSeverityDistribution> => {
  const url = buildUrl(
    '/dashboard/incidents/severity-distribution',
    buildQueryParams(filters, { refresh })
  );
  const response = await fetch(url.toString(), buildRequestInit(signal));
  return handleResponse(response, 'Failed to fetch dashboard severity distribution');
};

export const fetchRecentIncidents = async ({
  signal,
  refresh,
  limit,
  ...filters
}: RecentIncidentsOptions = {}): Promise<DashboardRecentIncident[]> => {
  const url = buildUrl(
    '/dashboard/incidents/recent',
    buildQueryParams(filters, { refresh, limit })
  );
  const response = await fetch(url.toString(), buildRequestInit(signal));
  return handleResponse(response, 'Failed to fetch dashboard recent incidents');
};
