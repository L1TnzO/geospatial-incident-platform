import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { get, set } from 'idb-keyval';
import { mapIncidentToUi } from '../services/incidents';
import { apiClient, type FetchIncidentsParams } from '../services/api-client';
import {
  ACTIVE_RENDER_LIMIT_MAX,
  DEFAULT_ACTIVE_RENDER_LIMIT,
  DEFAULT_HISTORICAL_RENDER_LIMIT,
  HISTORICAL_RENDER_LIMIT_MAX,
  MIN_RENDER_LIMIT,
} from '../store/incident-filters-store';
import type { LiteIncident } from '../types';
import type { IncidentListResponse, PaginationMeta } from '../types/api/incidents';
import { useIncidentsQuery } from './useIncidentsQuery';

const INCIDENT_FETCH_PAGE_SIZE = 1_000;
const AGGREGATION_LOG_SCOPE = '[IncidentsAggregator]';
// eslint-disable-next-line no-console
const logAggregation = (...args: unknown[]) => console.log(AGGREGATION_LOG_SCOPE, ...args);

export interface IncidentsDataResult {
  incidents: LiteIncident[];
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
  incidents: LiteIncident[];
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
  priorityComplete: boolean;
}

interface AggregatedIncidentResult {
  incidents: LiteIncident[];
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
    return {
      ...state,
      priorityComplete: state.priorityComplete ?? false,
    };
  }
  return {
    nextPage: initialPage,
    hasMore: true,
    hasFetched: false,
    priorityComplete: false,
  };
};

const clonePhase = (state: PhaseState): PhaseState => ({
  ...state,
  priorityComplete: state.priorityComplete ?? false,
});

const fetchIncidentsAggregated = async (
  params: FetchIncidentsParams,
  viewportParams: FetchIncidentsParams | undefined,
  signal: AbortSignal,
  targetLimit: number,
  pageSize: number,
  existing?: AggregatedIncidentResult,
  onPartialUpdate?: (data: AggregatedIncidentResult) => void,
): Promise<AggregatedIncidentResult> => {
  logAggregation('fetch:start', {
    targetLimit,
    pageSize,
    existingSize: existing?.incidents.length ?? 0,
    hasViewportPhase: Boolean(viewportParams),
  });
  const backlog = existing ? [...existing.incidents] : [];
  const aggregatedOrder = backlog.map((incident) => incident.id);
  const aggregatedOrderSet = new Set<string>(aggregatedOrder);
  const aggregatedById = new Map<string, LiteIncident>(
    backlog.map((incident) => [incident.id, incident] as const),
  );
  const viewportPriority = new Set<string>();

  const ensureOrder = (id: string) => {
    if (aggregatedOrderSet.has(id)) {
      return;
    }
    aggregatedOrderSet.add(id);
    aggregatedOrder.push(id);
  };
  let totalCount = existing?.totalCount ?? aggregatedById.size;

  const viewportState = viewportParams
    ? clonePhaseState(existing?.viewport, viewportParams.page ?? params.page ?? 1)
    : null;
  const globalState = clonePhaseState(existing?.global, params.page ?? 1);

  const buildSnapshotIncidents = (): LiteIncident[] => {
    const prioritizeViewport = viewportPriority.size > 0;
    const prioritized: string[] = [];
    const fallback: string[] = [];

    for (const id of aggregatedOrder) {
      const incident = aggregatedById.get(id);
      if (!incident) {
        continue;
      }
      if (prioritizeViewport && viewportPriority.has(id)) {
        prioritized.push(id);
      } else {
        fallback.push(id);
      }
    }

    const orderedIds: string[] = [];

    for (const id of prioritized) {
      if (orderedIds.length >= targetLimit) {
        break;
      }
      orderedIds.push(id);
    }

    for (const id of fallback) {
      if (orderedIds.length >= targetLimit) {
        break;
      }
      orderedIds.push(id);
    }

    return orderedIds.map((id) => aggregatedById.get(id)!).filter(Boolean);
  };

  const emitPartial = () => {
    if (!onPartialUpdate) {
      return;
    }
    const incidents = buildSnapshotIncidents();
    const normalizedTotal = Math.max(totalCount, incidents.length, aggregatedById.size);
    const snapshot: AggregatedIncidentResult = {
      incidents,
      totalCount: normalizedTotal,
      pageSize,
      viewport: viewportState ? clonePhase(viewportState) : null,
      global: clonePhase(globalState),
    };
    logAggregation('emitPartial', {
      incidents: snapshot.incidents.length,
      totalCount: snapshot.totalCount,
      viewport: snapshot.viewport,
      global: snapshot.global,
    });
    onPartialUpdate(snapshot);
  };

  const registerIncident = (incident: LiteIncident, prioritize: boolean) => {
    aggregatedById.set(incident.id, incident);
    ensureOrder(incident.id);
    if (prioritize) {
      viewportPriority.add(incident.id);
    }
  };

  const runPhase = async (
    phaseParams: FetchIncidentsParams,
    state: PhaseState,
    { isViewport }: { isViewport: boolean },
  ): Promise<boolean> => {
    logAggregation('phase:start', {
      phase: isViewport ? 'viewport' : 'global',
      nextPage: state.nextPage,
      hasMore: state.hasMore,
      hasFetched: state.hasFetched,
      priorityComplete: state.priorityComplete,
    });
    const shouldFetch = !state.hasFetched || state.hasMore;

    if (!shouldFetch) {
      logAggregation('phase:skip', {
        phase: isViewport ? 'viewport' : 'global',
      });
      return false;
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

    if (!response || !response.data) {
      logAggregation('phase:error', {
        phase: isViewport ? 'viewport' : 'global',
        error: 'Invalid response format: missing data',
        response,
      });
      throw new Error('Invalid response from server');
    }

    logAggregation('phase:response', {
      phase: isViewport ? 'viewport' : 'global',
      page: state.nextPage,
      received: response.data.length,
      pagination: response.pagination,
    });

    state.hasFetched = true;

    const mapped = response.data
      .map(mapIncidentToUi)
      .filter((incident): incident is LiteIncident => incident !== null);

    for (const incident of mapped) {
      registerIncident(incident, isViewport);
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
      totalCount = Math.max(totalCount, aggregatedById.size);
      state.nextPage += 1;
    }

    let newlyCompleted = false;
    if (!isViewport && !state.priorityComplete && aggregatedById.size >= targetLimit) {
      state.priorityComplete = true;
      newlyCompleted = true;
      logAggregation('phase:priorityComplete', {
        aggregated: aggregatedById.size,
        targetLimit,
      });
    }

    if (mapped.length > 0 || isViewport || newlyCompleted) {
      logAggregation('phase:emitPartialTrigger', {
        phase: isViewport ? 'viewport' : 'global',
        mapped: mapped.length,
        newlyCompleted,
      });
      emitPartial();
    }

    if (!isViewport && newlyCompleted) {
      logAggregation('phase:haltAfterPriorityComplete');
      return false;
    }

    const continuePhase = state.hasMore;
    logAggregation('phase:complete', {
      phase: isViewport ? 'viewport' : 'global',
      continuePhase,
      nextPage: state.nextPage,
    });
    return continuePhase;
  };

  if (viewportParams && viewportState) {
    logAggregation('viewportPhase:init', {
      nextPage: viewportState.nextPage,
      hasMore: viewportState.hasMore,
    });
    while (viewportState.hasMore || !viewportState.hasFetched) {
      const shouldContinue = await runPhase(viewportParams, viewportState, { isViewport: true });
      if (!shouldContinue) {
        logAggregation('viewportPhase:break', {
          hasMore: viewportState.hasMore,
        });
        break;
      }
    }
  }

  const shouldFetchGlobal =
    aggregatedById.size < targetLimit ||
    !globalState.hasFetched ||
    totalCount === 0 ||
    (!globalState.priorityComplete && globalState.hasMore);
  const needsBackgroundGlobal = globalState.priorityComplete && globalState.hasMore;
  logAggregation('globalPhase:decision', {
    aggregatedSize: aggregatedById.size,
    targetLimit,
    totalCount,
    globalState,
    shouldFetchGlobal,
    needsBackgroundGlobal,
  });

  if (shouldFetchGlobal || needsBackgroundGlobal) {
    logAggregation('globalPhase:init', {
      shouldFetchGlobal,
      needsBackgroundGlobal,
    });
    while (globalState.hasMore || !globalState.hasFetched) {
      const shouldContinue = await runPhase(params, globalState, { isViewport: false });
      if (!shouldContinue) {
        logAggregation('globalPhase:break', {
          hasMore: globalState.hasMore,
          priorityComplete: globalState.priorityComplete,
        });
        break;
      }
    }
  }

  const snapshot = buildSnapshotIncidents();
  const normalizedTotal = Math.max(totalCount, snapshot.length, aggregatedById.size);

  return {
    incidents: snapshot,
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
  const { viewportBounds, priorityCenter } = params;

  const targetLimit = resolveRenderCap(params);
  const fetchPageSize = Math.min(targetLimit, INCIDENT_FETCH_PAGE_SIZE);

  const normalizedParams: FetchIncidentsParams = {
    ...params,
    viewportBounds: undefined,
    priorityCenter: priorityCenter ?? null,
    isActive: params.isActive ?? true,
    renderLimit: undefined,
    page: 1,
    pageSize: fetchPageSize,
  };

  const viewportQuery = viewportBounds
    ? {
      ...normalizedParams,
      viewportBounds,
    }
    : undefined;

  const queryKey = buildAggregatedQueryKey({
    ...normalizedParams,
    viewportBounds: viewportBounds ?? null,
    priorityCenter: priorityCenter ?? null,
    renderLimit: undefined,
    signal: undefined,
  });

  const filterSignaturePayload = {
    ...normalizedParams,
    viewportBounds: null,
    priorityCenter: null,
  };
  const viewportSignaturePayload = {
    bounds: viewportBounds ?? null,
    priorityCenter: priorityCenter ?? null,
  };

  const filterSignature = JSON.stringify(filterSignaturePayload);
  const viewportSignature = JSON.stringify(viewportSignaturePayload);

  const cachedResultRef = useRef<AggregatedIncidentResult | undefined>(undefined);
  const previousDataRef = useRef<AggregatedIncidentResult | undefined>(undefined);
  const filterSignatureRef = useRef<string>(filterSignature);
  const viewportSignatureRef = useRef<string>(viewportSignature);
  const persistedResultsRef = useRef<Map<string, AggregatedIncidentResult>>(new Map());

  if (filterSignatureRef.current !== filterSignature) {
    const previousSignature = filterSignatureRef.current;
    if (previousSignature) {
      const snapshotToPersist =
        cachedResultRef.current ??
        previousDataRef.current ??
        persistedResultsRef.current.get(previousSignature);
      if (snapshotToPersist) {
        persistedResultsRef.current.set(previousSignature, snapshotToPersist);
        logAggregation('cache:persistPrevious', {
          signature: previousSignature,
          incidents: snapshotToPersist.incidents.length,
        });
      }
    }
    cachedResultRef.current = undefined;
    previousDataRef.current = undefined;
    filterSignatureRef.current = filterSignature;
    viewportSignatureRef.current = viewportSignature;
    const restored = persistedResultsRef.current.get(filterSignature);
    if (restored) {
      cachedResultRef.current = restored;
      previousDataRef.current = restored;
      logAggregation('cache:restorePersisted', {
        signature: filterSignature,
        incidents: restored.incidents.length,
      });
    }
  } else if (viewportSignatureRef.current !== viewportSignature) {
    if (cachedResultRef.current) {
      cachedResultRef.current = {
        ...cachedResultRef.current,
        viewport: null,
      };
    }
    if (previousDataRef.current) {
      previousDataRef.current = {
        ...previousDataRef.current,
        viewport: null,
      };
    }
    viewportSignatureRef.current = viewportSignature;
  }

  const query: UseQueryResult<AggregatedIncidentResult, Error> = useQuery<
    AggregatedIncidentResult,
    Error
  >({
    queryKey,
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const restored = persistedResultsRef.current.get(filterSignature);
      const existing =
        queryClient.getQueryData<AggregatedIncidentResult>(queryKey) ??
        cachedResultRef.current ??
        restored;
      logAggregation('queryFn:start', {
        signature: filterSignature,
        hasExisting: Boolean(existing),
        incidents: existing?.incidents.length ?? 0,
      });

      // Try to load from IDB if we have no existing data and this is the first load
      let initialData = existing;
      if (!initialData) {
        try {
          const idbData = await get<AggregatedIncidentResult>(`incidents-cache-${filterSignature}`);
          if (idbData) {
            // Basic validity check - could be improved with versioning/timestamps
            if (Array.isArray(idbData.incidents)) {
              initialData = idbData;
              logAggregation('queryFn:loadedFromIDB', {
                signature: filterSignature,
                incidents: idbData.incidents.length
              });
              // Seed the cache immediately
              queryClient.setQueryData(queryKey, idbData);
            }
          }
        } catch (err) {
          console.warn('Failed to load from IDB', err);
        }
      }

      let lastEmit = 0;
      const EMIT_THROTTLE_MS = 500;

      return fetchIncidentsAggregated(
        normalizedParams,
        viewportQuery,
        signal,
        targetLimit,
        fetchPageSize,
        initialData,
        (partial) => {
          const now = Date.now();
          const isComplete = !partial.global.hasMore && !partial.viewport?.hasMore;

          // Emit if complete, or if enough time has passed
          if (isComplete || now - lastEmit > EMIT_THROTTLE_MS) {
            queryClient.setQueryData(queryKey, partial);
            cachedResultRef.current = partial;
            persistedResultsRef.current.set(filterSignature, partial);
            lastEmit = now;

            logAggregation('queryFn:updateCache', {
              signature: filterSignature,
              incidents: partial.incidents.length,
              totalCount: partial.totalCount,
              throttled: true
            });

            // Persist to IDB only when we have a significant chunk or are done
            // This prevents spamming IDB on every small update
            if (isComplete || partial.incidents.length % 5000 === 0) {
              set(`incidents-cache-${filterSignature}`, partial).catch(err =>
                console.warn('Failed to save to IDB', err)
              );
            }
          }
        },
      );
    },
    staleTime: 5 * 60_000, // 5 minutes
    // gcTime: default (24h) is fine, no need to override
    placeholderData: (previousData: AggregatedIncidentResult | undefined) => previousData,
  });

  const { data, isFetching: queryIsFetching, refetch } = query;

  useEffect(() => {
    if (data) {
      cachedResultRef.current = data;
      persistedResultsRef.current.set(filterSignature, data);
      logAggregation('query:dataEffect', {
        signature: filterSignature,
        incidents: data.incidents.length,
        totalCount: data.totalCount,
      });
    }
  }, [data, filterSignature]);

  const isInitialLoading = query.isLoading && !query.data;

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
    if (!data || queryIsFetching) {
      return;
    }

    const viewportHasMore = Boolean(data.viewport?.hasMore);
    const needsDisplayFill =
      data.incidents.length < targetLimit && (data.global.hasMore || viewportHasMore);
    const shouldPrefetchRemaining = data.global.priorityComplete && data.global.hasMore;

    if (viewportHasMore || needsDisplayFill || shouldPrefetchRemaining) {
      void refetch();
    }
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

const mapListResponseToIncidents = (response: IncidentListResponse): LiteIncident[] => {
  if (!response || !Array.isArray(response.data)) {
    return [];
  }
  return response.data
    .map(mapIncidentToUi)
    .filter((incident): incident is LiteIncident => incident !== null);
};

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
