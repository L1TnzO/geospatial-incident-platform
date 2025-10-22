import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { mapIncidentToUi } from '../services/incidents';
import { apiClient, type FetchIncidentsParams } from '../services/api-client';
import type { Incident } from '../types';
import type { IncidentListResponse, PaginationMeta } from '../types/api/incidents';
import { useIncidentsQuery } from './useIncidentsQuery';

const INCIDENT_RENDER_CAP = 5000;
const INCIDENT_FETCH_PAGE_SIZE = 100;

export interface IncidentsDataResult {
  incidents: Incident[];
  isLoading: boolean;
  isError: boolean;
  error?: string;
  refresh: () => void;
  lastUpdated?: Date;
  totalCount: number;
  renderedCount: number;
  remainder: number;
}

export interface IncidentsTableDataResult {
  incidents: Incident[];
  pagination?: PaginationMeta;
  totalCount: number;
  remainder: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  isFetching: boolean;
  isRefetching: boolean;
  isError: boolean;
  error?: string;
  refresh: () => void;
  lastUpdated?: Date;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface AggregatedIncidentResult {
  incidents: Incident[];
  totalCount: number;
  renderedCount: number;
  remainder: number;
}

const fetchIncidentsAggregated = async (
  params: FetchIncidentsParams,
  signal: AbortSignal,
): Promise<AggregatedIncidentResult> => {
  const aggregated: Incident[] = [];
  let nextPage = params.page ?? 1;
  let lastTotal = 0;

  while (aggregated.length < INCIDENT_RENDER_CAP) {
    if (signal.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }

    const response = await apiClient.incidents.list({
      ...params,
      page: nextPage,
      pageSize: INCIDENT_FETCH_PAGE_SIZE,
      signal,
    });

    const mapped = response.data
      .map(mapIncidentToUi)
      .filter((incident): incident is Incident => incident !== null);

    aggregated.push(...mapped);

    const pagination = response.pagination;
    lastTotal = pagination.total ?? aggregated.length;

    if (!pagination.hasNext || aggregated.length >= INCIDENT_RENDER_CAP) {
      break;
    }

    nextPage += 1;
  }

  if (signal.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }

  const capped = aggregated.slice(0, INCIDENT_RENDER_CAP);
  const remainder = Math.max(lastTotal - capped.length, 0);

  return {
    incidents: capped,
    totalCount: lastTotal,
    renderedCount: capped.length,
    remainder,
  };
};

const buildAggregatedQueryKey = (params: FetchIncidentsParams) =>
  ['incidents', 'list', 'aggregated', JSON.stringify({ ...params, signal: undefined })] as const;

export const useIncidentsData = (params: FetchIncidentsParams): IncidentsDataResult => {
  const query: UseQueryResult<AggregatedIncidentResult, Error> = useQuery({
    queryKey: buildAggregatedQueryKey(params),
    queryFn: ({ signal }) => fetchIncidentsAggregated(params, signal),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const incidents = query.data?.incidents ?? [];
  const totalCount = query.data?.totalCount ?? 0;
  const renderedCount = query.data?.renderedCount ?? 0;
  const remainder = query.data?.remainder ?? 0;

  return {
    incidents,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error?.message,
    refresh: () => {
      void query.refetch({ cancelRefetch: false });
    },
    lastUpdated: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : undefined,
    totalCount,
    renderedCount,
    remainder,
  };
};

const mapListResponseToIncidents = (response: IncidentListResponse): Incident[] =>
  response.data.map(mapIncidentToUi).filter((incident): incident is Incident => incident !== null);

const resolvePaginationRemainder = (pagination?: PaginationMeta): number => {
  if (!pagination) {
    return 0;
  }

  const { total, page, pageSize } = pagination;
  if (typeof total !== 'number' || typeof page !== 'number' || typeof pageSize !== 'number') {
    return 0;
  }

  return Math.max(total - page * pageSize, 0);
};

export const useIncidentsTableData = (params: FetchIncidentsParams): IncidentsTableDataResult => {
  const query = useIncidentsQuery(params, {
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  });

  const incidents = useMemo(() => {
    if (!query.data) {
      return [];
    }
    return mapListResponseToIncidents(query.data);
  }, [query.data]);

  const pagination = query.data?.pagination;

  const page = pagination?.page ?? (typeof params.page === 'number' ? params.page : 1);
  const pageSize =
    pagination?.pageSize ?? (typeof params.pageSize === 'number' ? params.pageSize : 25);
  const totalCount = pagination?.total ?? incidents.length;
  const remainder = resolvePaginationRemainder(pagination);

  return {
    incidents,
    pagination,
    totalCount,
    remainder,
    page,
    pageSize,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isRefetching: query.isRefetching,
    isError: query.isError,
    error: query.error?.message,
    refresh: () => {
      void query.refetch({ cancelRefetch: false });
    },
    lastUpdated: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : undefined,
    hasNext: pagination?.hasNext ?? false,
    hasPrevious: pagination?.hasPrevious ?? false,
  };
};
