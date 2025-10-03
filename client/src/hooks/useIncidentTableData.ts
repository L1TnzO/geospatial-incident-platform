import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IncidentListItem, IncidentSortField } from '@/types/incidents';
import {
  fetchIncidentTableData,
  type IncidentTableFilters,
  type IncidentTablePagination,
  type IncidentTableResult,
} from '@/services/incidentsTableService';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_SORT_BY: IncidentSortField = 'reportedAt';
const DEFAULT_SORT_DIRECTION: 'asc' | 'desc' = 'desc';
const MAX_PAGE_SIZE = 100;
const FILTERS_STORAGE_VERSION = 1;
const FILTERS_STORAGE_KEY = 'gip::incidentTableFilters::v1';

export const INCIDENT_TABLE_FILTERS_STORAGE_KEY = FILTERS_STORAGE_KEY;

const safeGetStorage = (): Storage | null => {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.warn('[useIncidentTableData] localStorage unavailable:', error);
    return null;
  }
};

const sanitizeStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const filtered = value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());

  if (filtered.length === 0) {
    return undefined;
  }

  return Array.from(new Set(filtered));
};

const sanitizeSortBy = (value: unknown): IncidentSortField => {
  const allowed: IncidentSortField[] = ['reportedAt', 'occurrenceAt', 'severityPriority'];
  if (typeof value === 'string' && (allowed as string[]).includes(value)) {
    return value as IncidentSortField;
  }
  return DEFAULT_SORT_BY;
};

const sanitizeSortDirection = (value: unknown): 'asc' | 'desc' =>
  value === 'asc' || value === 'desc' ? value : DEFAULT_SORT_DIRECTION;

const sanitizeBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const sanitizeDateString = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || !value) {
    return undefined;
  }
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
};

const sanitizeStoredFilters = (value: unknown): TableFiltersState => {
  const base = buildInitialFilters();
  if (!value || typeof value !== 'object') {
    return base;
  }

  const raw = value as Partial<Record<keyof TableFiltersState, unknown>>;
  const next: TableFiltersState = {
    ...base,
    page: sanitizePage(Number(raw.page ?? base.page)),
    pageSize: clampPageSize(Number(raw.pageSize ?? base.pageSize)),
    sortBy: sanitizeSortBy(raw.sortBy),
    sortDirection: sanitizeSortDirection(raw.sortDirection),
    isActive: sanitizeBoolean(raw.isActive, base.isActive ?? true),
  };

  const typeCodes = sanitizeStringArray(raw.typeCodes);
  const severityCodes = sanitizeStringArray(raw.severityCodes);
  const statusCodes = sanitizeStringArray(raw.statusCodes);

  if (typeCodes) {
    next.typeCodes = typeCodes;
  }
  if (severityCodes) {
    next.severityCodes = severityCodes;
  }
  if (statusCodes) {
    next.statusCodes = statusCodes;
  }

  const startDate = sanitizeDateString(raw.startDate);
  const endDate = sanitizeDateString(raw.endDate);
  if (startDate) {
    next.startDate = startDate;
  }
  if (endDate) {
    next.endDate = endDate;
  }

  return next;
};

const loadFiltersFromStorage = (): TableFiltersState | null => {
  const storage = safeGetStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as {
      version?: number;
      filters?: unknown;
    } | null;

    if (!parsed || parsed.version !== FILTERS_STORAGE_VERSION) {
      return null;
    }

    return sanitizeStoredFilters(parsed.filters);
  } catch (error) {
    console.warn('[useIncidentTableData] Failed to parse filters from storage:', error);
    return null;
  }
};

const persistFiltersToStorage = (filters: TableFiltersState): void => {
  const storage = safeGetStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      FILTERS_STORAGE_KEY,
      JSON.stringify({
        version: FILTERS_STORAGE_VERSION,
        filters,
      })
    );
  } catch (error) {
    console.warn('[useIncidentTableData] Failed to persist filters to storage:', error);
  }
};

type TableFiltersState = Omit<IncidentTableFilters, 'signal'>;

export interface UseIncidentTableDataState {
  rows: IncidentListItem[];
  pagination?: IncidentTablePagination;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  filters: TableFiltersState;
  remainder: number;
  nextPage: number | null;
  previousPage: number | null;
  totalPages: number;
  total: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setFilters: (filters: Partial<TableFiltersState>) => void;
  refresh: () => void;
  lastUpdated?: Date;
}

const clampPageSize = (value: number): number => {
  if (Number.isNaN(value)) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(Math.max(Math.floor(value), 1), MAX_PAGE_SIZE);
};

const sanitizePage = (value: number): number => {
  if (Number.isNaN(value)) {
    return DEFAULT_PAGE;
  }
  return Math.max(Math.floor(value), 1);
};

const buildInitialFilters = (): TableFiltersState => ({
  page: DEFAULT_PAGE,
  pageSize: DEFAULT_PAGE_SIZE,
  sortBy: DEFAULT_SORT_BY,
  sortDirection: DEFAULT_SORT_DIRECTION,
  isActive: true,
});

export const useIncidentTableData = (): UseIncidentTableDataState => {
  const [filters, setFiltersState] = useState<TableFiltersState>(() => {
    const stored = loadFiltersFromStorage();
    return stored ?? buildInitialFilters();
  });
  const [rows, setRows] = useState<IncidentListItem[]>([]);
  const [pagination, setPagination] = useState<IncidentTablePagination | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [refreshToken, setRefreshToken] = useState<number>(0);
  const lastUpdatedRef = useRef<Date | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);

  const load = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setIsLoading(true);
    setError(undefined);

    try {
      const result: IncidentTableResult = await fetchIncidentTableData({
        ...filters,
        signal: controller.signal,
      });

      if (controller.signal.aborted || requestIdRef.current !== requestId) {
        return;
      }

      setRows(result.rows);
      setPagination(result.pagination);
      lastUpdatedRef.current = new Date();
    } catch (err) {
      if (controller.signal.aborted || requestIdRef.current !== requestId) {
        return;
      }

      setRows([]);
      setPagination(undefined);
      setError(err instanceof Error ? err.message : 'Failed to load incidents');
    } finally {
      if (!controller.signal.aborted && requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [filters]);

  useEffect(() => {
    void load();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [load, refreshToken]);

  const setPage = useCallback((page: number) => {
    setFiltersState((current) => ({
      ...current,
      page: sanitizePage(page),
    }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setFiltersState((current) => ({
      ...current,
      pageSize: clampPageSize(pageSize),
      page: DEFAULT_PAGE,
    }));
  }, []);

  const setFilters = useCallback((partial: Partial<TableFiltersState>) => {
    setFiltersState((current) => {
      const next: TableFiltersState = {
        ...current,
        ...partial,
      };

      if (partial.pageSize !== undefined) {
        next.pageSize = clampPageSize(partial.pageSize);
      }

      if (partial.page !== undefined) {
        next.page = sanitizePage(partial.page);
      }

      if (
        partial.page === undefined &&
        (partial.typeCodes !== undefined ||
          partial.severityCodes !== undefined ||
          partial.statusCodes !== undefined ||
          partial.startDate !== undefined ||
          partial.endDate !== undefined ||
          partial.sortBy !== undefined ||
          partial.sortDirection !== undefined ||
          partial.isActive !== undefined)
      ) {
        next.page = DEFAULT_PAGE;
      }

      return next;
    });
  }, []);

  const refresh = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  useEffect(() => {
    persistFiltersToStorage(filters);
  }, [filters]);

  const remainder = pagination?.remainder ?? 0;
  const nextPage = pagination?.nextPage ?? null;
  const previousPage = pagination?.previousPage ?? null;
  const totalPages = pagination?.totalPages ?? 0;
  const total = pagination?.total ?? 0;

  return useMemo(
    () => ({
      rows,
      pagination,
      isLoading,
      isError: Boolean(error),
      error,
      filters,
      remainder,
      nextPage,
      previousPage,
      totalPages,
      total,
      setPage,
      setPageSize,
      setFilters,
      refresh,
      lastUpdated: lastUpdatedRef.current,
    }),
    [
      rows,
      pagination,
      isLoading,
      error,
      filters,
      remainder,
      nextPage,
      previousPage,
      totalPages,
      total,
      setPage,
      setPageSize,
      setFilters,
      refresh,
    ]
  );
};
