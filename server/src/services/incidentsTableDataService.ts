import type { IncidentListItem, IncidentSortField, PaginationMeta } from '../db';
import {
  incidentService as incidentServiceSingleton,
  type IncidentService,
  type IncidentListOptions,
} from './incidentsService';

const BOOLEAN_TRUE = 'true';
const BOOLEAN_FALSE = 'false';

type QueryValue = string | string[] | undefined;

type IncidentServiceLike = Pick<IncidentService, 'buildListOptions' | 'listIncidents'>;

export interface IncidentTableParams {
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

const joinList = (values?: string[]): string | undefined => {
  if (!values || values.length === 0) {
    return undefined;
  }

  const cleaned = values.map((value) => value.trim()).filter((value) => value.length > 0);

  return cleaned.length > 0 ? cleaned.join(',') : undefined;
};

const normalizeDate = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
};

const toBooleanString = (value?: boolean): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  return value ? BOOLEAN_TRUE : BOOLEAN_FALSE;
};

export const buildIncidentListQuery = (
  params: IncidentTableParams = {}
): Record<string, QueryValue> => {
  const query: Record<string, QueryValue> = {};

  if (params.page !== undefined) {
    query.page = String(params.page);
  }
  if (params.pageSize !== undefined) {
    query.pageSize = String(params.pageSize);
  }
  if (params.sortBy) {
    query.sortBy = params.sortBy;
  }
  if (params.sortDirection) {
    query.sortDirection = params.sortDirection;
  }

  const typeCodes = joinList(params.typeCodes);
  if (typeCodes) {
    query.typeCodes = typeCodes;
  }
  const severityCodes = joinList(params.severityCodes);
  if (severityCodes) {
    query.severityCodes = severityCodes;
  }
  const statusCodes = joinList(params.statusCodes);
  if (statusCodes) {
    query.statusCodes = statusCodes;
  }

  const startDate = normalizeDate(params.startDate);
  if (startDate) {
    query.startDate = startDate;
  }
  const endDate = normalizeDate(params.endDate);
  if (endDate) {
    query.endDate = endDate;
  }

  const isActive = toBooleanString(params.isActive);
  if (isActive) {
    query.isActive = isActive;
  }

  return query;
};

export const buildIncidentTablePagination = (
  pagination: PaginationMeta
): IncidentTablePagination => {
  const remainder = Math.max(pagination.total - pagination.page * pagination.pageSize, 0);

  return {
    ...pagination,
    nextPage: pagination.hasNext ? pagination.page + 1 : null,
    previousPage: pagination.hasPrevious ? Math.max(pagination.page - 1, 1) : null,
    remainder,
  };
};

export class IncidentsTableDataService {
  constructor(private readonly incidentService: IncidentServiceLike = incidentServiceSingleton) {}

  public buildQuery(params: IncidentTableParams = {}): Record<string, QueryValue> {
    return buildIncidentListQuery(params);
  }

  public async fetchTableData(params: IncidentTableParams = {}): Promise<IncidentTableResult> {
    const query = this.buildQuery(params);
    const options: IncidentListOptions = this.incidentService.buildListOptions(query);
    const { data, pagination } = await this.incidentService.listIncidents(options);

    return {
      rows: data,
      pagination: buildIncidentTablePagination(pagination),
    };
  }
}

export const incidentsTableDataService = new IncidentsTableDataService();
