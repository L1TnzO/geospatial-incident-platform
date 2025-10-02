import { incidentRepository } from '../db';
import type {
  IncidentDetail,
  IncidentListFilters,
  IncidentListItem,
  IncidentSortField,
  PaginatedResult,
  PaginationMeta,
} from '../db';
import { HttpError } from '../errors/httpError';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const MAX_TOTAL_RESULTS = 5000;

const SORTABLE_FIELDS: readonly IncidentSortField[] = [
  'reportedAt',
  'occurrenceAt',
  'severityPriority',
];
type SortableField = IncidentSortField;

type QueryValue = string | string[] | undefined;

export interface IncidentListOptions extends IncidentListFilters {
  page: number;
  pageSize: number;
  sortBy: SortableField;
  sortDirection: 'asc' | 'desc';
}

export interface IncidentListResponse {
  data: IncidentListItem[];
  pagination: PaginationMeta;
}

const normalizeValue = (value: QueryValue): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : undefined;
  }

  return value;
};

const parseInteger = (
  value: QueryValue,
  field: string,
  options: { min?: number; max?: number }
): number | undefined => {
  const raw = normalizeValue(value);

  if (raw === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(raw.trim(), 10);

  if (Number.isNaN(parsed)) {
    throw HttpError.badRequest(`Query parameter '${field}' must be an integer.`);
  }

  if (options.min !== undefined && parsed < options.min) {
    throw HttpError.badRequest(
      `Query parameter '${field}' must be greater than or equal to ${options.min}.`
    );
  }

  if (options.max !== undefined && parsed > options.max) {
    throw HttpError.badRequest(
      `Query parameter '${field}' must be less than or equal to ${options.max}.`
    );
  }

  return parsed;
};

const parseBoolean = (value: QueryValue, field: string): boolean => {
  const raw = normalizeValue(value);

  if (raw === undefined) {
    throw HttpError.badRequest(`Query parameter '${field}' must be a boolean.`);
  }

  const lowered = raw.toLowerCase();
  if (['true', '1'].includes(lowered)) {
    return true;
  }
  if (['false', '0'].includes(lowered)) {
    return false;
  }

  throw HttpError.badRequest(`Query parameter '${field}' must be a boolean.`);
};

const parseStringList = (value: QueryValue): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const values = Array.isArray(value) ? value : [value];
  const results: string[] = [];

  for (const entry of values) {
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }

    trimmed
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => results.push(part));
  }

  return results.length ? results : undefined;
};

const parseIsoDate = (value: QueryValue, field: string): string | undefined => {
  const raw = normalizeValue(value);

  if (raw === undefined) {
    return undefined;
  }

  const timestamp = Date.parse(raw);
  if (Number.isNaN(timestamp)) {
    throw HttpError.badRequest(`Query parameter '${field}' must be an ISO-8601 date string.`);
  }

  return new Date(timestamp).toISOString();
};

const parseSortBy = (value: QueryValue): SortableField => {
  const raw = normalizeValue(value);
  if (!raw) {
    return 'reportedAt';
  }

  if ((SORTABLE_FIELDS as readonly string[]).includes(raw)) {
    return raw as SortableField;
  }

  throw HttpError.badRequest(
    "Query parameter 'sortBy' must be one of: reportedAt, occurrenceAt, severityPriority."
  );
};

const parseSortDirection = (value: QueryValue): 'asc' | 'desc' => {
  const raw = normalizeValue(value)?.toLowerCase();
  if (!raw) {
    return 'desc';
  }

  if (raw === 'asc' || raw === 'desc') {
    return raw;
  }

  throw HttpError.badRequest("Query parameter 'sortDirection' must be 'asc' or 'desc'.");
};

const buildPaginationMeta = (
  result: PaginatedResult<IncidentListItem>,
  sortBy: SortableField,
  sortDirection: 'asc' | 'desc'
): IncidentListResponse => {
  const total = Math.min(result.total, MAX_TOTAL_RESULTS);
  const totalPages = total === 0 ? 0 : Math.ceil(total / result.pageSize);
  const hasNext = totalPages > 0 && result.page < totalPages;
  const hasPrevious = result.page > 1;

  return {
    data: result.data,
    pagination: {
      page: result.page,
      pageSize: result.pageSize,
      total,
      totalPages,
      hasNext,
      hasPrevious,
      sortBy,
      sortDirection,
    },
  };
};

interface IncidentRepositoryLike {
  listIncidents(filters: IncidentListOptions): Promise<PaginatedResult<IncidentListItem>>;
  getIncidentDetail(incidentNumber: string): Promise<IncidentDetail | null>;
}

export class IncidentService {
  constructor(private readonly repository: IncidentRepositoryLike = incidentRepository) {}

  public buildListOptions(query: Record<string, QueryValue>): IncidentListOptions {
    const page = parseInteger(query.page, 'page', { min: 1 }) ?? DEFAULT_PAGE;
    const pageSize =
      parseInteger(query.pageSize, 'pageSize', { min: 1, max: MAX_PAGE_SIZE }) ?? DEFAULT_PAGE_SIZE;

    const maxPage = Math.ceil(MAX_TOTAL_RESULTS / pageSize);
    if (page > maxPage) {
      throw HttpError.badRequest(
        `The combination of page=${page} and pageSize=${pageSize} exceeds the maximum supported range of ${MAX_TOTAL_RESULTS} records.`
      );
    }

    const typeCodes = parseStringList(query.typeCodes);
    const severityCodes = parseStringList(query.severityCodes);
    const statusCodes = parseStringList(query.statusCodes);
    const startDate = parseIsoDate(query.startDate, 'startDate');
    const endDate = parseIsoDate(query.endDate, 'endDate');
    const sortBy = parseSortBy(query.sortBy);
    const sortDirection = parseSortDirection(query.sortDirection);

    let isActive: boolean | undefined;
    if (query.isActive !== undefined) {
      isActive = parseBoolean(query.isActive, 'isActive');
    }

    return {
      page,
      pageSize,
      typeCodes,
      severityCodes,
      statusCodes,
      startDate,
      endDate,
      isActive,
      sortBy,
      sortDirection,
    };
  }

  public async listIncidents(options: IncidentListOptions): Promise<IncidentListResponse> {
    const result = await this.repository.listIncidents(options);
    return buildPaginationMeta(result, options.sortBy, options.sortDirection);
  }

  public async getIncidentDetail(incidentNumber: string | undefined): Promise<IncidentDetail> {
    const normalized = incidentNumber?.trim();
    if (!normalized) {
      throw HttpError.badRequest('Incident number is required.');
    }

    const detail = await this.repository.getIncidentDetail(normalized);
    if (!detail) {
      throw HttpError.notFound(`Incident '${normalized}' was not found.`);
    }

    return detail;
  }
}

export const incidentService = new IncidentService();
