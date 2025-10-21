import { http, type RequestOptions } from '../lib/http';
import type { IncidentListResponse, IncidentMetadata } from '../types/api/incidents';
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
