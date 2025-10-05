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

const buildExportRequestInit = (signal?: AbortSignal): RequestInit => ({
  method: 'GET',
  headers: {
    Accept: 'text/csv',
  },
  credentials: 'same-origin',
  signal,
});

const parseContentDispositionFilename = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch (error) {
      console.warn('[dashboardService] Failed to decode UTF-8 filename:', error);
    }
  }

  const quotedMatch = value.match(/filename="?([^";]+)"?/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  return null;
};

const buildFallbackExportFilename = () => {
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, '0');
  const parts = [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
    '-',
    pad(now.getUTCHours()),
    pad(now.getUTCMinutes()),
  ];
  return `incidents-${parts.join('')}.csv`;
};

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

interface ExportDashboardCsvOptions {
  signal?: AbortSignal;
  refresh?: boolean;
}

export const exportDashboardCsv = async (
  filters: DashboardFilterParams = {},
  { signal, refresh }: ExportDashboardCsvOptions = {}
): Promise<{ blob: Blob; filename: string }> => {
  const url = buildUrl('/dashboard/export', buildQueryParams(filters, { refresh }));
  const response = await fetch(url.toString(), buildExportRequestInit(signal));

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to export dashboard incidents (status ${response.status})`);
  }

  const blob = await response.blob();
  const disposition = response.headers?.get('Content-Disposition');
  const filename = parseContentDispositionFilename(disposition) ?? buildFallbackExportFilename();

  return { blob, filename };
};
