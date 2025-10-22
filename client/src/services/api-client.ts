import { http, type RequestOptions } from '../lib/http';
import type {
  IncidentCreateRequest,
  IncidentDetail,
  IncidentListResponse,
  IncidentMetadata,
  IncidentSearchResult,
} from '../types/api/incidents';
import type { StationListResponse } from '../types/api/stations';

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
};
