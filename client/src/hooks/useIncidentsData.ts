import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { mapIncidentToUi } from '../services/incidents';
import { queryKeys } from '../services/query-keys';
import { apiClient, type FetchIncidentsParams } from '../services/api-client';
import type { Incident } from '../types';

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

export const useIncidentsData = (params: FetchIncidentsParams): IncidentsDataResult => {
  const query: UseQueryResult<AggregatedIncidentResult, Error> = useQuery({
    queryKey: queryKeys.incidents.list({ ...params, signal: undefined }),
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
