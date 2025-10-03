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
  const [filters, setFiltersState] = useState<TableFiltersState>(buildInitialFilters);
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
