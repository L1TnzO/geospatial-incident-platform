import {
  incidentRepository,
  IncidentLookupError,
  type BoundingBox,
  type CreateIncidentInput,
  type IncidentDetail,
  type IncidentMapListItem,
  type IncidentListFilters,
  type IncidentListItem,
  type IncidentMetadata,
  type IncidentSortField,
  type PaginatedResult,
  type PaginationMeta,
  type IncidentSearchResult,
  type IncidentLocationInput,
} from '../db';
import { INCIDENT_MAX_PAGE_SIZE } from '../config/pagination';
import { HttpError } from '../errors/httpError';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_TOTAL_RESULTS = 1_000_000;
const METADATA_CACHE_TTL_MS = 5 * 60 * 1000;
const MIN_LATITUDE = -90;
const MAX_LATITUDE = 90;
const MIN_LONGITUDE = -180;
const MAX_LONGITUDE = 180;
const MIN_BOUND_DELTA = 0.0001;

const SERVICE_LOG_SCOPE = '[IncidentsService]';
// eslint-disable-next-line no-console
const serviceLog = (...args: unknown[]): void => console.log(SERVICE_LOG_SCOPE, ...args);

const SORTABLE_FIELDS: readonly IncidentSortField[] = [
  'reportedAt',
  'occurrenceAt',
  'severityPriority',
];
type SortableField = IncidentSortField;

type QueryValue = string | string[] | undefined;

export interface CreateIncidentRequest {
  incidentNumber?: string | null;
  externalReference?: string | null;
  title?: string | null;
  narrative?: string | null;
  typeCode?: string | null;
  severityCode?: string | null;
  statusCode?: string | null;
  sourceCode?: string | null;
  weatherCode?: string | null;
  primaryStationCode?: string | null;
  occurrenceAt?: string | null;
  reportedAt?: string | null;
  dispatchAt?: string | null;
  arrivalAt?: string | null;
  resolvedAt?: string | null;
  casualtyCount?: number | string | null;
  responderInjuries?: number | string | null;
  estimatedDamageAmount?: number | string | null;
  isActive?: boolean | null;
  metadata?: Record<string, unknown> | null;
  location?: {
    latitude?: number;
    longitude?: number;
  } | null;
}

const INCIDENT_IDENTIFIER_PATTERN = /^[A-Z0-9._:-]+$/i;

const requireString = (value: unknown, field: string): string => {
  if (typeof value !== 'string') {
    throw HttpError.badRequest(`Field '${field}' is required.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw HttpError.badRequest(`Field '${field}' is required.`);
  }
  return trimmed;
};

const sanitizeOptionalString = (value: unknown, field: string): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw HttpError.badRequest(`Field '${field}' must be a string.`);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseDateField = (value: unknown, field: string): Date => {
  const raw = requireString(value, field);
  const timestamp = Date.parse(raw);
  if (Number.isNaN(timestamp)) {
    throw HttpError.badRequest(`Field '${field}' must be a valid ISO-8601 date string.`);
  }
  return new Date(timestamp);
};

const parseOptionalDateField = (value: unknown, field: string): Date | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw HttpError.badRequest(`Field '${field}' must be a valid ISO-8601 date string.`);
    }
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw HttpError.badRequest(`Field '${field}' must be a valid ISO-8601 date string.`);
    }
    const dateFromNumber = new Date(value);
    if (Number.isNaN(dateFromNumber.getTime())) {
      throw HttpError.badRequest(`Field '${field}' must be a valid ISO-8601 date string.`);
    }
    return dateFromNumber;
  }
  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw) {
      return null;
    }
    const timestamp = Date.parse(raw);
    if (Number.isNaN(timestamp)) {
      throw HttpError.badRequest(`Field '${field}' must be a valid ISO-8601 date string.`);
    }
    return new Date(timestamp);
  }
  throw HttpError.badRequest(`Field '${field}' must be a valid ISO-8601 date string.`);
};

const parseNonNegativeInteger = (value: unknown, field: string, defaultValue = 0): number => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw HttpError.badRequest(`Field '${field}' must be a non-negative integer.`);
  }

  return Math.trunc(numeric);
};

const parseEstimatedDamageAmount = (value: unknown): string | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw HttpError.badRequest("Field 'estimatedDamageAmount' must be a non-negative number.");
  }
  return numeric.toFixed(2);
};

const parseMetadata = (value: unknown): Record<string, unknown> => {
  if (value === undefined || value === null) {
    return {};
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw HttpError.badRequest("Field 'metadata' must be an object.");
  }
  return value as Record<string, unknown>;
};

const parseLocation = (value: unknown): IncidentLocationInput => {
  if (!value || typeof value !== 'object') {
    throw HttpError.badRequest(
      "Field 'location' is required and must include latitude and longitude."
    );
  }

  const candidate = value as { latitude?: unknown; longitude?: unknown };
  const latitude =
    typeof candidate.latitude === 'number' ? candidate.latitude : Number(candidate.latitude);
  const longitude =
    typeof candidate.longitude === 'number' ? candidate.longitude : Number(candidate.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw HttpError.badRequest('Location coordinates must be valid latitude/longitude values.');
  }

  return { latitude, longitude };
};

const normalizeCode = (value: string): string => value.trim().toUpperCase();

const normalizeOptionalCode = (value: string | null): string | null =>
  value ? value.trim().toUpperCase() : null;

const isUniqueViolationError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const candidate = error as { code?: string };
  return candidate.code === '23505';
};

export interface IncidentListOptions extends IncidentListFilters {
  page: number;
  pageSize: number;
  sortBy: SortableField;
  sortDirection: 'asc' | 'desc';
}

export type IncidentFilterOptions = IncidentListFilters;

export interface IncidentListResponse<T = IncidentListItem> {
  data: T[];
  pagination: PaginationMeta;
}

export type IncidentMapListResponse = IncidentListResponse<IncidentMapListItem>;

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

const parseFloatInRange = (
  value: QueryValue,
  field: string,
  { min, max }: { min: number; max: number }
): number | undefined => {
  const raw = normalizeValue(value);

  if (raw === undefined) {
    return undefined;
  }

  const parsed = Number.parseFloat(raw.trim());

  if (Number.isNaN(parsed)) {
    throw HttpError.badRequest(`Query parameter '${field}' must be a number.`);
  }

  if (parsed < min || parsed > max) {
    throw HttpError.badRequest(
      `Query parameter '${field}' must be between ${min} and ${max}.`
    );
  }

  return parsed;
};

const parseCoordinateComponent = (
  raw: string,
  field: string,
  { min, max }: { min: number; max: number }
): number => {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw HttpError.badRequest(`Query parameter '${field}' must not be empty.`);
  }

  const parsed = Number.parseFloat(trimmed);
  if (Number.isNaN(parsed)) {
    throw HttpError.badRequest(`Query parameter '${field}' must be a number.`);
  }

  if (parsed < min || parsed > max) {
    throw HttpError.badRequest(
      `Query parameter '${field}' must be between ${min} and ${max}.`
    );
  }

  return parsed;
};

const parseCenterPoint = (
  query: Record<string, QueryValue>
): { latitude: number; longitude: number } | undefined => {
  let latitude = parseFloatInRange(query.centerLat, 'centerLat', {
    min: MIN_LATITUDE,
    max: MAX_LATITUDE,
  });
  let longitude = parseFloatInRange(query.centerLng, 'centerLng', {
    min: MIN_LONGITUDE,
    max: MAX_LONGITUDE,
  });

  const centerRaw = normalizeValue(query.center);
  if (centerRaw) {
    const parts = centerRaw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length !== 2) {
      throw HttpError.badRequest(
        "Query parameter 'center' must specify two comma-separated numeric values: latitude,longitude."
      );
    }

    if (latitude === undefined) {
      latitude = parseCoordinateComponent(parts[0], 'center latitude', {
        min: MIN_LATITUDE,
        max: MAX_LATITUDE,
      });
    }

    if (longitude === undefined) {
      longitude = parseCoordinateComponent(parts[1], 'center longitude', {
        min: MIN_LONGITUDE,
        max: MAX_LONGITUDE,
      });
    }
  }

  if (latitude === undefined && longitude === undefined) {
    return undefined;
  }

  if (latitude === undefined || longitude === undefined) {
    throw HttpError.badRequest(
      "Query parameters 'centerLat' and 'centerLng' must be used together."
    );
  }

  return {
    latitude,
    longitude,
  };
};

const parseBoundingBox = (value: QueryValue, field: string): BoundingBox | undefined => {
  const raw = normalizeValue(value);

  if (raw === undefined) {
    return undefined;
  }

  const parts = raw
    .split(',')
    .map((part) => Number.parseFloat(part.trim()))
    .filter((part) => !Number.isNaN(part));

  if (parts.length !== 4) {
    throw HttpError.badRequest(
      `Query parameter '${field}' must specify four comma-separated numeric values: west,south,east,north.`
    );
  }

  const [west, south, east, north] = parts;

  if (west < MIN_LONGITUDE || west > MAX_LONGITUDE || east < MIN_LONGITUDE || east > MAX_LONGITUDE) {
    throw HttpError.badRequest(
      `Query parameter '${field}' longitude values must be between ${MIN_LONGITUDE} and ${MAX_LONGITUDE}.`
    );
  }

  if (south < MIN_LATITUDE || south > MAX_LATITUDE || north < MIN_LATITUDE || north > MAX_LATITUDE) {
    throw HttpError.badRequest(
      `Query parameter '${field}' latitude values must be between ${MIN_LATITUDE} and ${MAX_LATITUDE}.`
    );
  }

  if (east <= west || north <= south) {
    throw HttpError.badRequest(
      `Query parameter '${field}' must define a valid rectangle where east > west and north > south.`
    );
  }

  if (east - west < MIN_BOUND_DELTA || north - south < MIN_BOUND_DELTA) {
    throw HttpError.badRequest(
      `Query parameter '${field}' defines an area that is too small to query.`
    );
  }

  return { west, south, east, north };
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

const buildPaginationMeta = <T>(
  result: PaginatedResult<T>,
  sortBy: SortableField,
  sortDirection: 'asc' | 'desc'
): IncidentListResponse<T> => {
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
  listIncidentsForMap(filters: IncidentListOptions): Promise<PaginatedResult<IncidentMapListItem>>;
  getIncidentDetail(incidentNumber: string): Promise<IncidentDetail | null>;
  getIncidentMetadata(): Promise<Omit<IncidentMetadata, 'limits'>>;
  findIncidentSummary(incidentNumber: string): Promise<IncidentSearchResult | null>;
  createIncident(input: CreateIncidentInput): Promise<IncidentDetail>;
  getSyncStatus(): Promise<{ lastModified: string; count: number }>;
  getChangesSince(since: string): Promise<IncidentListItem[]>;
}

export class IncidentService {
  private metadataCache: { expiresAt: number; value: IncidentMetadata } | null = null;

  constructor(private readonly repository: IncidentRepositoryLike = incidentRepository) { }

  public clearCaches(): void {
    this.metadataCache = null;
  }

  public buildFilterOptions(query: Record<string, QueryValue>): IncidentFilterOptions {
    const incidentNumberRaw = normalizeValue(query.incidentNumber)?.trim();
    if (incidentNumberRaw && !INCIDENT_IDENTIFIER_PATTERN.test(incidentNumberRaw)) {
      throw HttpError.badRequest(
        "Query parameter 'incidentNumber' must contain only letters, digits, and -._: characters."
      );
    }
    const incidentNumber = incidentNumberRaw ? incidentNumberRaw.toUpperCase() : undefined;

    const typeCodes = parseStringList(query.typeCodes);
    const severityCodes = parseStringList(query.severityCodes);
    const statusCodes = parseStringList(query.statusCodes);
    const startDate = parseIsoDate(query.startDate, 'startDate');
    const endDate = parseIsoDate(query.endDate, 'endDate');
    const bounds = parseBoundingBox(query.bbox, 'bbox');
    const center = parseCenterPoint(query);

    let isActive: boolean | undefined;
    if (query.isActive !== undefined) {
      isActive = parseBoolean(query.isActive, 'isActive');
    }

    const result: IncidentFilterOptions = {
      typeCodes,
      severityCodes,
      statusCodes,
      startDate,
      endDate,
      isActive,
      incidentNumber,
      bounds,
      center,
    };
    serviceLog('buildFilterOptions', {
      incidentNumber,
      typeCount: typeCodes?.length ?? 0,
      severityCount: severityCodes?.length ?? 0,
      statusCount: statusCodes?.length ?? 0,
      hasBounds: Boolean(bounds),
      hasCenter: Boolean(center),
      isActive,
    });
    return result;
  }

  public buildListOptions(query: Record<string, QueryValue>): IncidentListOptions {
    const page = parseInteger(query.page, 'page', { min: 1 }) ?? DEFAULT_PAGE;
    const pageSize =
      parseInteger(query.pageSize, 'pageSize', { min: 1, max: INCIDENT_MAX_PAGE_SIZE }) ??
      DEFAULT_PAGE_SIZE;

    const baseFilters = this.buildFilterOptions(query);

    const resolvedPage = baseFilters.incidentNumber ? DEFAULT_PAGE : page;

    const maxPage = Math.ceil(MAX_TOTAL_RESULTS / pageSize);
    if (resolvedPage > maxPage) {
      throw HttpError.badRequest(
        `The combination of page=${resolvedPage} and pageSize=${pageSize} exceeds the maximum supported range of ${MAX_TOTAL_RESULTS} records.`
      );
    }

    const sortBy = parseSortBy(query.sortBy);
    const sortDirection = parseSortDirection(query.sortDirection);

    const options: IncidentListOptions = {
      ...baseFilters,
      page: resolvedPage,
      pageSize,
      sortBy,
      sortDirection,
    };
    serviceLog('buildListOptions', {
      page: options.page,
      pageSize: options.pageSize,
      sortBy: options.sortBy,
      sortDirection: options.sortDirection,
      hasBounds: Boolean(options.bounds),
      hasCenter: Boolean(options.center),
      incidentNumber: options.incidentNumber ?? null,
    });
    return options;
  }

  public async listIncidents(options: IncidentListOptions): Promise<IncidentListResponse> {
    serviceLog('listIncidents:request', {
      page: options.page,
      pageSize: options.pageSize,
      sortBy: options.sortBy,
      sortDirection: options.sortDirection,
      hasBounds: Boolean(options.bounds),
      hasCenter: Boolean(options.center),
      incidentNumber: options.incidentNumber ?? null,
    });
    const result = await this.repository.listIncidents(options);
    serviceLog('listIncidents:response', {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      returned: result.data.length,
      hasNext: result.hasNext,
    });
    return buildPaginationMeta(result, options.sortBy, options.sortDirection);
  }

  public async listMapIncidents(
    options: IncidentListOptions
  ): Promise<IncidentMapListResponse> {
    serviceLog('listMapIncidents:request', {
      page: options.page,
      pageSize: options.pageSize,
      sortBy: options.sortBy,
      sortDirection: options.sortDirection,
      hasBounds: Boolean(options.bounds),
      hasCenter: Boolean(options.center),
    });
    const result = await this.repository.listIncidentsForMap(options);
    serviceLog('listMapIncidents:response', {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      returned: result.data.length,
      hasNext: result.hasNext,
    });
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

  public async getIncidentMetadata(forceRefresh = false): Promise<IncidentMetadata> {
    const now = Date.now();
    if (!forceRefresh && this.metadataCache && this.metadataCache.expiresAt > now) {
      return this.metadataCache.value;
    }

    const base = await this.repository.getIncidentMetadata();
    const metadata: IncidentMetadata = {
      ...base,
      limits: {
        maxPageSize: INCIDENT_MAX_PAGE_SIZE,
        maxTotalResults: MAX_TOTAL_RESULTS,
      },
    };

    this.metadataCache = {
      value: metadata,
      expiresAt: now + METADATA_CACHE_TTL_MS,
    };

    return metadata;
  }

  public async getSyncStatus(): Promise<{ lastModified: string; count: number }> {
    return this.repository.getSyncStatus();
  }

  public async getDelta(since: string): Promise<IncidentListItem[]> {
    return this.repository.getChangesSince(since);
  }

  public async createIncident(payload: CreateIncidentRequest = {}): Promise<IncidentDetail> {
    const incidentNumberValue = requireString(payload.incidentNumber, 'incidentNumber');
    if (!INCIDENT_IDENTIFIER_PATTERN.test(incidentNumberValue)) {
      throw HttpError.badRequest(
        "Field 'incidentNumber' must contain only letters, digits, and -._: characters."
      );
    }
    const incidentNumber = normalizeCode(incidentNumberValue);

    const title = requireString(payload.title, 'title');
    const typeCode = normalizeCode(requireString(payload.typeCode, 'typeCode'));
    const severityCode = normalizeCode(requireString(payload.severityCode, 'severityCode'));
    const statusCode = normalizeCode(requireString(payload.statusCode, 'statusCode'));
    const sourceCode = normalizeOptionalCode(
      sanitizeOptionalString(payload.sourceCode, 'sourceCode')
    );
    const weatherCode = normalizeOptionalCode(
      sanitizeOptionalString(payload.weatherCode, 'weatherCode')
    );
    const primaryStationCode = normalizeOptionalCode(
      sanitizeOptionalString(payload.primaryStationCode, 'primaryStationCode')
    );
    const externalReference = sanitizeOptionalString(
      payload.externalReference,
      'externalReference'
    );
    const narrative = sanitizeOptionalString(payload.narrative, 'narrative');

    const occurrenceAtDate = parseDateField(payload.occurrenceAt, 'occurrenceAt');
    const reportedAtDate = parseDateField(payload.reportedAt, 'reportedAt');
    const dispatchAtDate = parseOptionalDateField(payload.dispatchAt, 'dispatchAt');
    const arrivalAtDate = parseOptionalDateField(payload.arrivalAt, 'arrivalAt');
    const resolvedAtDate = parseOptionalDateField(payload.resolvedAt, 'resolvedAt');

    if (occurrenceAtDate.getTime() > reportedAtDate.getTime()) {
      throw HttpError.badRequest(
        "Field 'reportedAt' must be greater than or equal to 'occurrenceAt'."
      );
    }
    if (dispatchAtDate && dispatchAtDate.getTime() < reportedAtDate.getTime()) {
      throw HttpError.badRequest(
        "Field 'dispatchAt' must be greater than or equal to 'reportedAt'."
      );
    }
    if (arrivalAtDate && dispatchAtDate && arrivalAtDate.getTime() < dispatchAtDate.getTime()) {
      throw HttpError.badRequest(
        "Field 'arrivalAt' must be greater than or equal to 'dispatchAt'."
      );
    }
    if (resolvedAtDate && arrivalAtDate && resolvedAtDate.getTime() < arrivalAtDate.getTime()) {
      throw HttpError.badRequest(
        "Field 'resolvedAt' must be greater than or equal to 'arrivalAt'."
      );
    }

    const casualtyCount = parseNonNegativeInteger(payload.casualtyCount, 'casualtyCount');
    const responderInjuries = parseNonNegativeInteger(
      payload.responderInjuries,
      'responderInjuries'
    );
    const estimatedDamageAmount = parseEstimatedDamageAmount(payload.estimatedDamageAmount);
    const metadata = parseMetadata(payload.metadata ?? undefined);
    const location = parseLocation(payload.location ?? null);

    const derivedIsActive = !['RESOLVED', 'CANCELLED'].includes(statusCode);
    const isActive = typeof payload.isActive === 'boolean' ? payload.isActive : derivedIsActive;

    const input: CreateIncidentInput = {
      incidentNumber,
      externalReference,
      title,
      narrative,
      typeCode,
      severityCode,
      statusCode,
      sourceCode,
      weatherCode,
      primaryStationCode,
      occurrenceAt: occurrenceAtDate.toISOString(),
      reportedAt: reportedAtDate.toISOString(),
      dispatchAt: dispatchAtDate ? dispatchAtDate.toISOString() : null,
      arrivalAt: arrivalAtDate ? arrivalAtDate.toISOString() : null,
      resolvedAt: resolvedAtDate ? resolvedAtDate.toISOString() : null,
      casualtyCount,
      responderInjuries,
      estimatedDamageAmount,
      isActive,
      metadata,
      location,
    };

    try {
      const detail = await this.repository.createIncident(input);
      this.clearCaches();
      return detail;
    } catch (error) {
      if (isUniqueViolationError(error)) {
        throw HttpError.conflict(`Incident '${incidentNumber}' already exists.`);
      }
      if (error instanceof IncidentLookupError) {
        throw HttpError.badRequest(error.message);
      }
      throw error;
    }
  }

  public async searchIncidentByNumber(
    incidentNumber: string | undefined
  ): Promise<IncidentSearchResult> {
    const normalized = incidentNumber?.trim();
    if (!normalized) {
      throw HttpError.badRequest("Query parameter 'incidentNumber' is required.");
    }

    if (!INCIDENT_IDENTIFIER_PATTERN.test(normalized)) {
      throw HttpError.badRequest(
        "Query parameter 'incidentNumber' must contain only letters, digits, and -._: characters."
      );
    }

    const lookupValue = normalized.toUpperCase();
    const summary = await this.repository.findIncidentSummary(lookupValue);

    if (!summary) {
      throw HttpError.notFound(`Incident '${lookupValue}' was not found.`);
    }

    return summary;
  }
}

export const incidentService = new IncidentService();
