import { http, type RequestOptions, request } from '../lib/http';
import type {
  IncidentCreateRequest,
  IncidentDetail,
  IncidentListResponse,
  IncidentMetadata,
  IncidentSearchResult,
} from '../types/api/incidents';
import type { StationListResponse } from '../types/api/stations';
import type {
  DashboardExportParams,
  DashboardFilterParams,
  DashboardRecentIncidentsParams,
  Last24HoursKpiResponse,
  TypeDistributionResponse,
  SeverityDistributionResponse,
  DailyTrendResponse,
  RecentIncidentsResponse,
} from '../types/api/dashboard';

export interface FetchIncidentsParams extends Record<string, unknown> {
  page?: number;
  pageSize?: number;
  typeCodes?: string[];
  severityCodes?: string[];
  statusCodes?: string[];
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  incidentNumber?: string;
  signal?: AbortSignal;
}

export interface IncidentSearchParams {
  incidentNumber: string;
  signal?: AbortSignal;
}

export interface FetchStationsParams {
  signal?: AbortSignal;
  isActive?: boolean;
}

export interface ApiClientOptions extends Omit<RequestOptions, 'method' | 'body' | 'query'> {
  raw?: boolean;
}

export const apiClient = {
  incidents: {
    list: (params: FetchIncidentsParams = {}) =>
      http.get<IncidentListResponse>('/incidents', {
        signal: params.signal,
        query: {
          page: params.page,
          pageSize: params.pageSize,
          typeCodes: params.typeCodes,
          severityCodes: params.severityCodes,
          statusCodes: params.statusCodes,
          startDate: params.startDate,
          endDate: params.endDate,
          isActive: params.isActive,
          sortBy: params.sortBy,
          sortDirection: params.sortDirection,
          incidentNumber: params.incidentNumber,
        },
      }),
    metadata: (options?: Omit<RequestOptions, 'method' | 'body' | 'query'>) =>
      http.get<IncidentMetadata>('/incidents/meta', options),
    search: ({ incidentNumber, signal }: IncidentSearchParams) =>
      http.get<IncidentSearchResult>('/incidents/search', {
        signal,
        query: { incidentNumber },
      }),
    detail: (incidentNumber: string, options?: Omit<RequestOptions, 'method' | 'body' | 'query'>) =>
      http.get<IncidentDetail>(`/incidents/${encodeURIComponent(incidentNumber)}`, options),
    create: (
      payload: IncidentCreateRequest,
      options?: Omit<RequestOptions, 'method' | 'body' | 'query'>,
    ) => http.post<IncidentDetail>('/incidents', payload, options),
  },
  stations: {
    list: ({ signal, isActive }: FetchStationsParams = {}) =>
      http.get<StationListResponse>('/stations', {
        signal,
        query: {
          isActive,
        },
      }),
  },
  dashboard: {
    kpiLast24Hours: (
      params: DashboardFilterParams = {},
      options?: ApiClientOptions,
    ): Promise<Last24HoursKpiResponse> => {
      const { raw, ...requestOptions } = options || {};
      if (raw) {
        return request<Last24HoursKpiResponse>('/dashboard/kpi/last-24h', {
          ...requestOptions,
          query: params as Record<
            string,
            string | number | boolean | Array<string | number> | undefined
          >,
        }) as Promise<Last24HoursKpiResponse>;
      }
      return http.get<Last24HoursKpiResponse>('/dashboard/kpi/last-24h', {
        ...requestOptions,
        query: params as Record<
          string,
          string | number | boolean | Array<string | number> | undefined
        >,
      });
    },
    typeDistribution: (
      params: DashboardFilterParams = {},
      options?: ApiClientOptions,
    ): Promise<TypeDistributionResponse> => {
      const { raw, ...requestOptions } = options || {};
      if (raw) {
        return request<TypeDistributionResponse>('/dashboard/incidents/by-type', {
          ...requestOptions,
          query: params as Record<
            string,
            string | number | boolean | Array<string | number> | undefined
          >,
        }) as Promise<TypeDistributionResponse>;
      }
      return http.get<TypeDistributionResponse>('/dashboard/incidents/by-type', {
        ...requestOptions,
        query: params as Record<
          string,
          string | number | boolean | Array<string | number> | undefined
        >,
      });
    },
    severityDistribution: (
      params: DashboardFilterParams = {},
      options?: ApiClientOptions,
    ): Promise<SeverityDistributionResponse> => {
      const { raw, ...requestOptions } = options || {};
      if (raw) {
        return request<SeverityDistributionResponse>('/dashboard/incidents/severity-distribution', {
          ...requestOptions,
          query: params as Record<
            string,
            string | number | boolean | Array<string | number> | undefined
          >,
        }) as Promise<SeverityDistributionResponse>;
      }
      return http.get<SeverityDistributionResponse>('/dashboard/incidents/severity-distribution', {
        ...requestOptions,
        query: params as Record<
          string,
          string | number | boolean | Array<string | number> | undefined
        >,
      });
    },
    dailyTrend: (
      params: DashboardFilterParams = {},
      options?: ApiClientOptions,
    ): Promise<DailyTrendResponse> => {
      const { raw, ...requestOptions } = options || {};
      if (raw) {
        return request<DailyTrendResponse>('/dashboard/incidents/daily-trend', {
          ...requestOptions,
          query: params as Record<
            string,
            string | number | boolean | Array<string | number> | undefined
          >,
        }) as Promise<DailyTrendResponse>;
      }
      return http.get<DailyTrendResponse>('/dashboard/incidents/daily-trend', {
        ...requestOptions,
        query: params as Record<
          string,
          string | number | boolean | Array<string | number> | undefined
        >,
      });
    },
    recentIncidents: (
      params: DashboardRecentIncidentsParams = {},
      options?: ApiClientOptions,
    ): Promise<RecentIncidentsResponse> => {
      const { raw, ...requestOptions } = options || {};
      if (raw) {
        return request<RecentIncidentsResponse>('/dashboard/incidents/recent', {
          ...requestOptions,
          query: params as Record<
            string,
            string | number | boolean | Array<string | number> | undefined
          >,
        }) as Promise<RecentIncidentsResponse>;
      }
      return http.get<RecentIncidentsResponse>('/dashboard/incidents/recent', {
        ...requestOptions,
        query: params as Record<
          string,
          string | number | boolean | Array<string | number> | undefined
        >,
      });
    },
    export: (params: DashboardExportParams = {}, options?: ApiClientOptions): Promise<Response> => {
      return request('/dashboard/export', {
        ...options,
        query: params as Record<
          string,
          string | number | boolean | Array<string | number> | undefined
        >,
      }) as Promise<Response>;
    },
  },
};
