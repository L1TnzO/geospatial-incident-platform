import type { IncidentListItem, IncidentSortField, PaginationMeta } from '@/types/incidents';
import { fetchIncidents } from './incidentsService';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const DEFAULT_SORT_BY: IncidentSortField = 'reportedAt';
const DEFAULT_SORT_DIRECTION: 'asc' | 'desc' = 'desc';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(Math.floor(value), min), max);

const computeRemainder = (pagination: PaginationMeta): number =>
  Math.max(pagination.total - pagination.page * pagination.pageSize, 0);

const resolvePageSize = (pageSize?: number): number => {
  if (pageSize === undefined) {
    return DEFAULT_PAGE_SIZE;
  }

  return clamp(pageSize, 1, MAX_PAGE_SIZE);
};

const resolvePage = (page?: number): number => {
  if (page === undefined) {
    return DEFAULT_PAGE;
  }

  return Math.max(1, Math.floor(page));
};

export interface IncidentTableFilters {
  page?: number;
  pageSize?: number;
  sortBy?: IncidentSortField;
  sortDirection?: 'asc' | 'desc';
  typeCodes?: string[];
  severityCodes?: string[];
  statusCodes?: string[];
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  signal?: AbortSignal;
}

export interface IncidentTablePagination extends PaginationMeta {
  nextPage: number | null;
  previousPage: number | null;
  remainder: number;
}

export interface IncidentTableResult {
  rows: IncidentListItem[];
  pagination: IncidentTablePagination;
}

export const fetchIncidentTableData = async (
  filters: IncidentTableFilters = {}
): Promise<IncidentTableResult> => {
  const {
    signal,
    page,
    pageSize,
    sortBy = DEFAULT_SORT_BY,
    sortDirection = DEFAULT_SORT_DIRECTION,
    typeCodes,
    severityCodes,
    statusCodes,
    startDate,
    endDate,
    isActive,
  } = filters;

  const resolvedPageSize = resolvePageSize(pageSize);
  const resolvedPage = resolvePage(page);

  const response = await fetchIncidents({
    signal,
    page: resolvedPage,
    pageSize: resolvedPageSize,
    sortBy,
    sortDirection,
    typeCodes,
    severityCodes,
    statusCodes,
    startDate,
    endDate,
    isActive,
  });

  const remainder = computeRemainder(response.pagination);

  return {
    rows: response.data,
    pagination: {
      ...response.pagination,
      nextPage: response.pagination.hasNext ? response.pagination.page + 1 : null,
      previousPage: response.pagination.hasPrevious
        ? Math.max(response.pagination.page - 1, 1)
        : null,
      remainder,
    },
  };
};
