import { http, type RequestOptions, request } from '../lib/http';
import type { MapBounds, MapCenter } from '../store/map-store';
import type {
  IncidentCreateRequest,
  IncidentDetail,
  IncidentListResponse,
  IncidentMapListResponse,
  IncidentMetadata,
  IncidentSearchResult,
  IncidentSyncStatus,
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
import type {
  MonthlyTrendsParams,
  QuarterlyTrendsParams,
  TypeTimelinesParams,
  HotspotsParams,
  CoverageBuffersParams,
  ResponseMetricsParams,
  PriorityScoresParams,
  StrategicMonthlyTrendResponse,
  StrategicQuarterlyTrendResponse,
  StrategicTypeTimelineResponse,
  StrategicHotspotResponse,
  StrategicCoverageResponse,
  StrategicResponseMetricsResponse,
  StrategicPriorityScoreResponse,
} from '../types/api/strategic';

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
  renderLimit?: number;
  signal?: AbortSignal;
  viewportBounds?: MapBounds | null;
  priorityCenter?: MapCenter | null;
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
    mapList: (params: FetchIncidentsParams = {}) =>
      http.get<IncidentMapListResponse>('/incidents/map', {
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
          centerLat: params.priorityCenter?.[0],
          centerLng: params.priorityCenter?.[1],
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
    syncStatus: (options?: Omit<RequestOptions, 'method' | 'body' | 'query'>) =>
      http.get<IncidentSyncStatus>('/incidents/sync-status', options),
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
  strategic: {
    monthlyTrends: (
      params: MonthlyTrendsParams = {},
      options?: ApiClientOptions,
    ): Promise<StrategicMonthlyTrendResponse> => {
      const { raw, ...requestOptions } = options || {};
      if (raw) {
        return request<StrategicMonthlyTrendResponse>('/strategic/trends/monthly', {
          ...requestOptions,
          query: params as Record<
            string,
            string | number | boolean | Array<string | number> | undefined
          >,
        }) as Promise<StrategicMonthlyTrendResponse>;
      }
      return http.get<StrategicMonthlyTrendResponse>('/strategic/trends/monthly', {
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
        return request<DailyTrendResponse>('/strategic/trends/daily', {
          ...requestOptions,
          query: params as Record<
            string,
            string | number | boolean | Array<string | number> | undefined
          >,
        }) as Promise<DailyTrendResponse>;
      }
      return http.get<DailyTrendResponse>('/strategic/trends/daily', {
        ...requestOptions,
        query: params as Record<
          string,
          string | number | boolean | Array<string | number> | undefined
        >,
      });
    },
    quarterlyTrends: (
      params: QuarterlyTrendsParams = {},
      options?: ApiClientOptions,
    ): Promise<StrategicQuarterlyTrendResponse> => {
      const { raw, ...requestOptions } = options || {};
      if (raw) {
        return request<StrategicQuarterlyTrendResponse>('/strategic/trends/quarters', {
          ...requestOptions,
          query: params as Record<
            string,
            string | number | boolean | Array<string | number> | undefined
          >,
        }) as Promise<StrategicQuarterlyTrendResponse>;
      }
      return http.get<StrategicQuarterlyTrendResponse>('/strategic/trends/quarters', {
        ...requestOptions,
        query: params as Record<
          string,
          string | number | boolean | Array<string | number> | undefined
        >,
      });
    },
    typeTimelines: (
      params: TypeTimelinesParams = {},
      options?: ApiClientOptions,
    ): Promise<StrategicTypeTimelineResponse> => {
      const { raw, ...requestOptions } = options || {};
      if (raw) {
        return request<StrategicTypeTimelineResponse>('/strategic/trends/types', {
          ...requestOptions,
          query: params as Record<
            string,
            string | number | boolean | Array<string | number> | undefined
          >,
        }) as Promise<StrategicTypeTimelineResponse>;
      }
      return http.get<StrategicTypeTimelineResponse>('/strategic/trends/types', {
        ...requestOptions,
        query: params as Record<
          string,
          string | number | boolean | Array<string | number> | undefined
        >,
      });
    },
    hotspots: (
      params: HotspotsParams = {},
      options?: ApiClientOptions,
    ): Promise<StrategicHotspotResponse> => {
      const { raw, ...requestOptions } = options || {};
      if (raw) {
        return request<StrategicHotspotResponse>('/strategic/hotspots', {
          ...requestOptions,
          query: params as Record<
            string,
            string | number | boolean | Array<string | number> | undefined
          >,
        }) as Promise<StrategicHotspotResponse>;
      }
      return http.get<StrategicHotspotResponse>('/strategic/hotspots', {
        ...requestOptions,
        query: params as Record<
          string,
          string | number | boolean | Array<string | number> | undefined
        >,
      });
    },
    coverageBuffers: (
      params: CoverageBuffersParams = {},
      options?: ApiClientOptions,
    ): Promise<StrategicCoverageResponse> => {
      const { raw, ...requestOptions } = options || {};
      if (raw) {
        return request<StrategicCoverageResponse>('/strategic/coverage-buffers', {
          ...requestOptions,
          query: params as Record<
            string,
            string | number | boolean | Array<string | number> | undefined
          >,
        }) as Promise<StrategicCoverageResponse>;
      }
      return http.get<StrategicCoverageResponse>('/strategic/coverage-buffers', {
        ...requestOptions,
        query: params as Record<
          string,
          string | number | boolean | Array<string | number> | undefined
        >,
      });
    },
    responseMetrics: (
      params: ResponseMetricsParams = {},
      options?: ApiClientOptions,
    ): Promise<StrategicResponseMetricsResponse> => {
      const { raw, ...requestOptions } = options || {};
      if (raw) {
        return request<StrategicResponseMetricsResponse>('/strategic/response-metrics', {
          ...requestOptions,
          query: params as Record<
            string,
            string | number | boolean | Array<string | number> | undefined
          >,
        }) as Promise<StrategicResponseMetricsResponse>;
      }
      return http.get<StrategicResponseMetricsResponse>('/strategic/response-metrics', {
        ...requestOptions,
        query: params as Record<
          string,
          string | number | boolean | Array<string | number> | undefined
        >,
      });
    },
    priorityScores: (
      params: PriorityScoresParams = {},
      options?: ApiClientOptions,
    ): Promise<StrategicPriorityScoreResponse> => {
      const { raw, ...requestOptions } = options || {};
      if (raw) {
        return request<StrategicPriorityScoreResponse>('/strategic/priority-scores', {
          ...requestOptions,
          query: params as Record<
            string,
            string | number | boolean | Array<string | number> | undefined
          >,
        }) as Promise<StrategicPriorityScoreResponse>;
      }
      return http.get<StrategicPriorityScoreResponse>('/strategic/priority-scores', {
        ...requestOptions,
        query: params as Record<
          string,
          string | number | boolean | Array<string | number> | undefined
        >,
      });
    },
  },
};
