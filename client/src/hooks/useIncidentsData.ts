import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { mapIncidentToUi } from '../services/incidents';
import { apiClient, type FetchIncidentsParams } from '../services/api-client';
import {
  ACTIVE_RENDER_LIMIT_MAX,
  DEFAULT_ACTIVE_RENDER_LIMIT,
  DEFAULT_HISTORICAL_RENDER_LIMIT,
  HISTORICAL_RENDER_LIMIT_MAX,
  MIN_RENDER_LIMIT,
} from '../store/incident-filters-store';
import type { Incident } from '../types';
import type { IncidentListResponse, PaginationMeta } from '../types/api/incidents';
import { useIncidentsQuery } from './useIncidentsQuery';

const INCIDENT_FETCH_PAGE_SIZE = 1_000;

export interface IncidentsDataResult {
  incidents: Incident[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error?: string;
  refresh: () => void;
  lastUpdated?: Date;
  totalCount: number;
  renderedCount: number;
  remainder: number;
  targetLimit: number;
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

interface PhaseState {
  nextPage: number;
  hasMore: boolean;
  hasFetched: boolean;
}

interface AggregatedIncidentResult {
  incidents: Incident[];
  totalCount: number;
  pageSize: number;
  viewport: PhaseState | null;
  global: PhaseState;
}

const clampRenderCap = (value: number, isActive: boolean): number => {
  const upperBound = isActive ? ACTIVE_RENDER_LIMIT_MAX : HISTORICAL_RENDER_LIMIT_MAX;
  if (!Number.isFinite(value)) {
    return MIN_RENDER_LIMIT;
  }
  const floored = Math.max(Math.floor(value), MIN_RENDER_LIMIT);
  return Math.min(floored, upperBound);
};

const resolveRenderCap = (params: FetchIncidentsParams): number => {
  const isActive = params.isActive !== false;
  if (typeof params.renderLimit === 'number') {
    return clampRenderCap(params.renderLimit, isActive);
  }
  const fallback = isActive ? DEFAULT_ACTIVE_RENDER_LIMIT : DEFAULT_HISTORICAL_RENDER_LIMIT;
  return clampRenderCap(fallback, isActive);
};

const clonePhaseState = (state: PhaseState | null | undefined, initialPage: number): PhaseState => {
  if (state) {
    return { ...state };
  }
  return {
    nextPage: initialPage,
    hasMore: true,
    hasFetched: false,
  };
};

const clonePhase = (state: PhaseState): PhaseState => ({ ...state });

const fetchIncidentsAggregated = async (
  params: FetchIncidentsParams,
  viewportParams: FetchIncidentsParams | undefined,
  signal: AbortSignal,
  targetLimit: number,
  existing?: AggregatedIncidentResult,
  onPartialUpdate?: (data: AggregatedIncidentResult) => void,
): Promise<AggregatedIncidentResult> => {
  const pageSize = INCIDENT_FETCH_PAGE_SIZE;

  const backlog = existing ? [...existing.incidents] : [];
  const aggregated: Incident[] = [];
  const seen = new Set<string>(backlog.map((incident) => incident.id));
  let totalCount = existing?.totalCount ?? 0;

  const viewportState = viewportParams
    ? clonePhaseState(existing?.viewport, viewportParams.page ?? params.page ?? 1)
    : null;
  const globalState = clonePhaseState(existing?.global, params.page ?? 1);

  const buildSnapshotIncidents = (): Incident[] => {
    const combined = [...aggregated];
    const combinedIds = new Set<string>(combined.map((incident) => incident.id));

    if (combined.length < targetLimit && backlog.length > 0) {
      for (const incident of backlog) {
        if (combinedIds.has(incident.id)) {
          continue;
        }
        combined.push(incident);
        combinedIds.add(incident.id);
        if (combined.length >= targetLimit) {
          break;
        }
      }
    }

    if (combined.length > targetLimit) {
      return combined.slice(0, targetLimit);
    }

    return combined;
  };

  const emitPartial = () => {
    if (!onPartialUpdate) {
      return;
    }
  const normalizedTotal = Math.max(totalCount, aggregated.length, backlog.length);
    onPartialUpdate({
      incidents: buildSnapshotIncidents(),
      totalCount: normalizedTotal,
      pageSize,
      viewport: viewportState ? clonePhase(viewportState) : null,
      global: clonePhase(globalState),
    });
  };

  const appendIncident = (incident: Incident) => {
    if (seen.has(incident.id)) {
      return;
    }
    seen.add(incident.id);
    aggregated.push(incident);
  };

  const runPhase = async (phaseParams: FetchIncidentsParams, state: PhaseState) => {
    const shouldFetch =
      !state.hasFetched || (state.hasMore && aggregated.length < targetLimit);

    if (!shouldFetch) {
      return;
    }

    if (signal.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }

    const response = await apiClient.incidents.mapList({
      ...phaseParams,
      page: state.nextPage,
      pageSize,
      signal,
    });

    state.hasFetched = true;

    const mapped = response.data
      .map(mapIncidentToUi)
      .filter((incident): incident is Incident => incident !== null);

    for (const incident of mapped) {
      appendIncident(incident);
      if (aggregated.length >= targetLimit) {
        break;
      }
    }

    const pagination = response.pagination;
    if (pagination) {
      if (typeof pagination.total === 'number') {
        totalCount = Math.max(totalCount, pagination.total);
      }
      state.hasMore = Boolean(pagination.hasNext);
      const currentPage = pagination.page ?? state.nextPage;
      state.nextPage = currentPage + 1;
    } else {
      state.hasMore = false;
      totalCount = Math.max(totalCount, aggregated.length);
      state.nextPage += 1;
    }
    emitPartial();
  };

  if (viewportParams && viewportState) {
    while (
      aggregated.length < targetLimit &&
      (viewportState.hasMore || !viewportState.hasFetched)
    ) {
      await runPhase(viewportParams, viewportState);
      if (!viewportState.hasMore) {
        break;
      }
    }
  }

  const shouldFetchGlobal =
    aggregated.length < targetLimit || !globalState.hasFetched || totalCount === 0;

  if (shouldFetchGlobal) {
    while (
      aggregated.length < targetLimit &&
      (globalState.hasMore || !globalState.hasFetched)
    ) {
      await runPhase(params, globalState);
      if (!globalState.hasMore) {
        break;
      }
    }
  }
  const normalizedTotal = Math.max(totalCount, aggregated.length, backlog.length);

  return {
    incidents: buildSnapshotIncidents(),
    totalCount: normalizedTotal,
    pageSize,
    viewport: viewportState,
    global: globalState,
  };
};

const buildAggregatedQueryKey = (params: FetchIncidentsParams) =>
  ['incidents', 'list', 'aggregated', JSON.stringify(params)] as const;

export const useIncidentsData = (params: FetchIncidentsParams): IncidentsDataResult => {
  const queryClient = useQueryClient();
  const { viewportBounds } = params;

  const normalizedParams: FetchIncidentsParams = {
    ...params,
    viewportBounds: undefined,
    isActive: params.isActive ?? true,
    renderLimit: undefined,
    page: 1,
    pageSize: INCIDENT_FETCH_PAGE_SIZE,
  };

  const viewportQuery = viewportBounds
    ? {
        ...normalizedParams,
        viewportBounds,
      }
    : undefined;

  const targetLimit = resolveRenderCap(params);

  const queryKey = buildAggregatedQueryKey({
    ...normalizedParams,
    viewportBounds: viewportBounds ?? null,
    renderLimit: undefined,
    signal: undefined,
  });

  const cachedResultRef = useRef<AggregatedIncidentResult | undefined>(undefined);

  const query: UseQueryResult<AggregatedIncidentResult, Error> = useQuery({
    queryKey,
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const existing =
        queryClient.getQueryData<AggregatedIncidentResult>(queryKey) ?? cachedResultRef.current;
      return fetchIncidentsAggregated(
        normalizedParams,
        viewportQuery,
        signal,
        targetLimit,
        existing,
        (partial) => {
          queryClient.setQueryData(queryKey, partial);
          cachedResultRef.current = partial;
        },
      );
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    keepPreviousData: true,
    placeholderData: (previousData: AggregatedIncidentResult | undefined) => previousData,
  });

  const { data, isFetching: queryIsFetching, refetch } = query;

  useEffect(() => {
    if (data) {
      cachedResultRef.current = data;
    }
  }, [data]);

  const isInitialLoading = query.isLoading && !query.data;
  const previousDataRef = useRef<AggregatedIncidentResult | undefined>(undefined);

  useEffect(() => {
    if (!query.data) {
      return;
    }

    const currentSnapshot = query.data;

    const previous = previousDataRef.current;
    if (!previous || currentSnapshot.incidents.length >= previous.incidents.length) {
      previousDataRef.current = currentSnapshot;
    }
  }, [query.data]);

  const effectiveData = useMemo(() => {
    if (query.data && query.data.incidents.length > 0) {
      return query.data;
    }
    if (previousDataRef.current && previousDataRef.current.incidents.length > 0) {
      return previousDataRef.current;
    }
    return query.data ?? previousDataRef.current;
  }, [query.data]);

  useEffect(() => {
    if (!data) {
      return;
    }

    if (targetLimit <= data.incidents.length) {
      return;
    }

    if (
      data.totalCount > 0 &&
      data.totalCount <= data.incidents.length &&
      !data.global.hasMore &&
      (!data.viewport || !data.viewport.hasMore)
    ) {
      return;
    }

    if (queryIsFetching) {
      return;
    }

    void refetch();
  }, [data, queryIsFetching, refetch, targetLimit]);

  const incidents = useMemo(() => {
    const data = effectiveData?.incidents ?? [];
    if (data.length <= targetLimit) {
      return data;
    }
    return data.slice(0, targetLimit);
  }, [effectiveData?.incidents, targetLimit]);

  const totalCount = effectiveData?.totalCount ?? 0;
  const renderedCount = Math.min(incidents.length, targetLimit);
  const remainder = Math.max(totalCount - renderedCount, 0);

  return {
    incidents,
    isLoading: isInitialLoading,
    isFetching: queryIsFetching,
    isError: query.isError,
    error: query.error?.message,
    refresh: () => {
      void query.refetch({ cancelRefetch: false });
    },
    lastUpdated: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : undefined,
    totalCount,
    renderedCount,
    remainder,
    targetLimit,
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
    placeholderData: (previousData: IncidentListResponse | undefined) => previousData,
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
