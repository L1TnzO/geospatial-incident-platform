import type { DashboardFilterParams } from '@/types/dashboard';
import type {
  StrategicHotspotResponse,
  StrategicMonthlyTrendResponse,
  StrategicQuarterlyTrendResponse,
  StrategicTypeTimelineResponse,
} from '@/types/strategic';

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

const buildQueryParams = (
  filters: DashboardFilterParams,
  extra: Record<string, QueryValue> = {}
): Record<string, QueryValue> => {
  const params: Record<string, QueryValue> = { ...extra };

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

  return params;
};

interface StrategicRequestOptions extends DashboardFilterParams {
  signal?: AbortSignal;
  refresh?: boolean;
}

interface MonthlyTrendOptions extends StrategicRequestOptions {
  months?: number;
}

interface QuarterlyTrendOptions extends StrategicRequestOptions {
  quarters?: number;
}

interface TypeTimelineOptions extends StrategicRequestOptions {
  months?: number;
}

interface HotspotOptions extends StrategicRequestOptions {
  resolution?: number;
}

const appendRefresh = (params: Record<string, QueryValue>, refresh?: boolean) => {
  if (refresh) {
    params.refresh = true;
  }
  return params;
};

export const fetchMonthlyTrends = async ({
  signal,
  refresh,
  months,
  ...filters
}: MonthlyTrendOptions = {}): Promise<StrategicMonthlyTrendResponse> => {
  const params = appendRefresh(buildQueryParams(filters, months ? { months } : {}), refresh);
  const url = buildUrl('/strategic/trends/monthly', params);
  const response = await fetch(url.toString(), buildRequestInit(signal));
  return handleResponse(response, 'Failed to fetch strategic monthly trends');
};

export const fetchQuarterlyTrends = async ({
  signal,
  refresh,
  quarters,
  ...filters
}: QuarterlyTrendOptions = {}): Promise<StrategicQuarterlyTrendResponse> => {
  const params = appendRefresh(buildQueryParams(filters, quarters ? { quarters } : {}), refresh);
  const url = buildUrl('/strategic/trends/quarters', params);
  const response = await fetch(url.toString(), buildRequestInit(signal));
  return handleResponse(response, 'Failed to fetch strategic quarterly trends');
};

export const fetchTypeTimelines = async ({
  signal,
  refresh,
  months,
  ...filters
}: TypeTimelineOptions = {}): Promise<StrategicTypeTimelineResponse> => {
  const params = appendRefresh(buildQueryParams(filters, months ? { months } : {}), refresh);
  const url = buildUrl('/strategic/trends/types', params);
  const response = await fetch(url.toString(), buildRequestInit(signal));
  return handleResponse(response, 'Failed to fetch strategic incident type timelines');
};

export const fetchHotspots = async ({
  signal,
  refresh,
  resolution,
  ...filters
}: HotspotOptions = {}): Promise<StrategicHotspotResponse> => {
  const params = appendRefresh(
    buildQueryParams(filters, resolution ? { resolution } : {}),
    refresh
  );
  const url = buildUrl('/strategic/hotspots', params);
  const response = await fetch(url.toString(), buildRequestInit(signal));
  return handleResponse(response, 'Failed to fetch strategic hotspots');
};
