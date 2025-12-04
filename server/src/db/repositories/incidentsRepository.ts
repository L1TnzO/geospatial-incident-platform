import type { Knex } from 'knex';
import { Readable, Transform, type TransformCallback } from 'stream';
import { getDb } from '../client';
import { INCIDENT_MAX_PAGE_SIZE } from '../../config/pagination';
import {
  type GeoJsonPoint,
  type GeoJsonPolygon,
  type IncidentDailyCount,
  type IncidentDetail,
  type IncidentMapListItem,
  type IncidentListItem,
  type IncidentLookupValue,
  type IncidentMetadata,
  type IncidentSearchResult,
  type IncidentSeverity,
  type IncidentSeverityBucket,
  type IncidentSortField,
  type IncidentStatus,
  type IncidentSource,
  type IncidentTypeBucket,
  type IncidentWeather,
  type PaginatedResult,
  type RecentIncidentSummary,
  type StationCoverageBuffer,
} from '../types';
import { geometryToFeature, parseGeometry, parseJsonColumn } from '../utils';

export interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface IncidentListFilters {
  page?: number;
  pageSize?: number;
  typeCodes?: string[];
  severityCodes?: string[];
  statusCodes?: string[];
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  sortBy?: 'reportedAt' | 'occurrenceAt' | 'severityPriority';
  sortDirection?: 'asc' | 'desc';
  incidentNumber?: string;
  bounds?: BoundingBox;
  center?: {
    latitude: number;
    longitude: number;
  } | null;
}

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = INCIDENT_MAX_PAGE_SIZE;
const DEFAULT_STATION_COVERAGE_RADIUS_METERS = 5000;
const REPO_LOG_SCOPE = '[IncidentsRepository]';
// eslint-disable-next-line no-console
const repoLog = (...args: unknown[]): void => console.log(REPO_LOG_SCOPE, ...args);

interface IncidentRowBase {
  incidentId: number | string;
  incidentNumber: string;
  externalReference: string | null;
  title: string;
  occurrenceAt: string;
  reportedAt: string;
  dispatchAt: string | null;
  arrivalAt: string | null;
  resolvedAt: string | null;
  isActive: boolean;
  casualtyCount: number | string | null;
  responderInjuries: number | string | null;
  estimatedDamageAmount: string | null;
  locationGeohash: string | null;
  locationGeoJson: unknown;
  typeCode: string | null;
  typeName: string | null;
  typeDescription: string | null;
  severityCode: string | null;
  severityName: string | null;
  severityDescription: string | null;
  severityPriority: number | string | null;
  severityColorHex: string | null;
  statusCode: string | null;
  statusName: string | null;
  statusDescription: string | null;
  statusIsTerminal: boolean | null;
  sourceCode: string | null;
  sourceName: string | null;
  sourceDescription: string | null;
  weatherCode: string | null;
  weatherName: string | null;
  weatherDescription: string | null;
  primaryStationCode: string | null;
  primaryStationName: string | null;
}

interface IncidentMapRow {
  incidentNumber: string;
  title: string;
  occurrenceAt: string;
  reportedAt: string;
  isActive: boolean;
  locationGeoJson: unknown;
  typeCode: string | null;
  typeName: string | null;
  severityCode: string | null;
  severityName: string | null;
  severityColorHex: string | null;
  statusCode: string | null;
  statusName: string | null;
  primaryStationCode: string | null;
  primaryStationName: string | null;
}

interface IncidentDetailRow extends IncidentRowBase {
  narrative: string | null;
  metadata: unknown;
}

interface IncidentUnitRow {
  stationCode: string;
  stationName: string;
  assignmentRole: string | null;
  dispatchedAt: string | null;
  clearedAt: string | null;
}

interface IncidentAssetRow {
  assetIdentifier: string;
  assetType: string;
  status: string | null;
  notes: string | null;
}

interface IncidentNoteRow {
  author: string;
  note: string;
  createdAt: string;
}

interface StationCoverageRow {
  stationCode: string;
  stationName: string;
  isActive: boolean;
  radiusMeters: number | string | null;
  incidentCount: number | string | null;
  locationGeoJson: unknown;
  bufferGeoJson: unknown;
}

interface IncidentTypeCountRow {
  typeCode: string;
  typeName: string | null;
  typeDescription: string | null;
  total: string | number;
}

interface IncidentSeverityCountRow {
  severityCode: string;
  severityName: string | null;
  severityDescription: string | null;
  severityPriority: number | string | null;
  severityColorHex: string | null;
  total: string | number;
}

interface IncidentDailyCountRow {
  bucketDate: Date;
  total: string | number;
}

interface IncidentMonthlyCountRow {
  bucketMonth: Date;
  total: string | number;
}

interface IncidentQuarterCountRow {
  bucketQuarter: Date;
  year: number | string;
  quarter: number | string;
  total: string | number;
}

interface IncidentTypeTimelineRow {
  bucketMonth: Date;
  typeCode: string | null;
  typeName: string | null;
  typeDescription: string | null;
  total: string | number;
}

interface HotspotAggregateRow {
  cellId: string;
  geometry: unknown;
  centroidCoordinates: unknown;
  incidentCount: number;
}

interface RawHotspotAggregateRow {
  cellId: string;
  geometry: unknown;
  centroidCoordinates: unknown;
  incidentCount: number | string;
}

interface ResponseMetricStationRow {
  groupType: 'station';
  stationCode: string;
  stationName: string | null;
  sampleSize: number | string;
  averageSeconds: number | string;
  medianSeconds: number | string;
  p90Seconds: number | string;
}

interface ResponseMetricGridRow {
  groupType: 'grid';
  cellId: string;
  geometry: unknown;
  centroidCoordinates: unknown;
  sampleSize: number | string;
  averageSeconds: number | string;
  medianSeconds: number | string;
  p90Seconds: number | string;
}

type ResponseMetricRow = ResponseMetricStationRow | ResponseMetricGridRow;

interface PriorityScoreStationRow {
  groupType: 'station';
  stationCode: string;
  stationName: string | null;
  totalIncidents: number | string;
  rawScore: number | string;
  weightSum: number | string;
  averageSeverity: number | string;
}

interface PriorityScoreGridRow {
  groupType: 'grid';
  cellId: string;
  geometry: unknown;
  centroidCoordinates: unknown;
  totalIncidents: number | string;
  rawScore: number | string;
  weightSum: number | string;
  averageSeverity: number | string;
}

type PriorityScoreRow = PriorityScoreStationRow | PriorityScoreGridRow;

type RecentIncidentRow = IncidentRowBase;

export class IncidentLookupError extends Error {
  constructor(
    public readonly entity: string,
    public readonly codeValue: string
  ) {
    super(`${entity} '${codeValue}' was not found.`);
    this.name = 'IncidentLookupError';
  }
}

export interface IncidentLocationInput {
  latitude: number;
  longitude: number;
}

export interface CreateIncidentInput {
  incidentNumber: string;
  externalReference?: string | null;
  title: string;
  narrative?: string | null;
  typeCode: string;
  severityCode: string;
  statusCode: string;
  sourceCode?: string | null;
  weatherCode?: string | null;
  primaryStationCode?: string | null;
  occurrenceAt: string;
  reportedAt: string;
  dispatchAt?: string | null;
  arrivalAt?: string | null;
  resolvedAt?: string | null;
  casualtyCount: number;
  responderInjuries: number;
  estimatedDamageAmount?: string | null;
  isActive: boolean;
  metadata: Record<string, unknown>;
  location: IncidentLocationInput;
}

interface IncidentReferenceIds {
  typeId: number;
  severityId: number;
  statusId: number;
  sourceId: number | null;
  weatherConditionId: number | null;
  primaryStationId: number | null;
}

interface IncidentTypeMetaRow {
  code: string;
  name: string | null;
  description: string | null;
}

interface IncidentSeverityMetaRow {
  code: string;
  name: string | null;
  description: string | null;
  priority: number | string | null;
  colorHex: string | null;
}

interface IncidentStatusMetaRow {
  code: string;
  name: string | null;
  description: string | null;
  isTerminal: boolean | null;
}

const requireLookup = (code: string | null, entity: string): string => {
  if (!code) {
    throw new Error(`${entity} data missing for incident row`);
  }
  return code;
};

const createLookup = (
  code: string,
  name: string | null,
  description: string | null
): IncidentLookupValue => ({
  code,
  name: name ?? code,
  description: description ?? undefined,
});

const mapIncidentType = (row: IncidentRowBase): IncidentLookupValue => {
  const code = requireLookup(row.typeCode, 'Type');
  return createLookup(code, row.typeName, row.typeDescription);
};

const mapSeverity = (row: IncidentRowBase): IncidentSeverity => {
  const code = requireLookup(row.severityCode, 'Severity');
  const base = createLookup(code, row.severityName, row.severityDescription);
  return {
    ...base,
    priority: Number(row.severityPriority ?? 0),
    colorHex: row.severityColorHex ?? '#000000',
  };
};

const mapStatus = (row: IncidentRowBase): IncidentStatus => {
  const code = requireLookup(row.statusCode, 'Status');
  const base = createLookup(code, row.statusName, row.statusDescription);
  return {
    ...base,
    isTerminal: Boolean(row.statusIsTerminal),
  };
};

const mapSource = (row: IncidentRowBase): IncidentSource | null => {
  if (!row.sourceCode) {
    return null;
  }
  return createLookup(row.sourceCode, row.sourceName, row.sourceDescription);
};

const mapWeather = (row: IncidentRowBase): IncidentWeather | null => {
  if (!row.weatherCode) {
    return null;
  }
  return createLookup(row.weatherCode, row.weatherName, row.weatherDescription);
};

const hasIncidentFilters = (filters: IncidentListFilters): boolean =>
  Boolean(
    filters.typeCodes?.length ||
    filters.severityCodes?.length ||
    filters.statusCodes?.length ||
    typeof filters.isActive === 'boolean' ||
    filters.startDate ||
    filters.endDate ||
    filters.incidentNumber ||
    filters.bounds
  );

const applyFilterJoins = (query: Knex.QueryBuilder, filters: IncidentListFilters): void => {
  if (filters.typeCodes?.length) {
    query.join('incident_types as it', 'i.type_id', 'it.id');
  }

  if (filters.severityCodes?.length) {
    query.join('incident_severities as isv', 'i.severity_id', 'isv.id');
  }

  if (filters.statusCodes?.length) {
    query.join('incident_statuses as ist', 'i.status_id', 'ist.id');
  }
};

const applyFilters = (query: Knex.QueryBuilder, filters: IncidentListFilters): void => {
  if (filters.typeCodes?.length) {
    query.whereIn('it.type_code', filters.typeCodes);
  }

  if (filters.severityCodes?.length) {
    query.whereIn('isv.severity_code', filters.severityCodes);
  }

  if (filters.statusCodes?.length) {
    query.whereIn('ist.status_code', filters.statusCodes);
  }

  if (typeof filters.isActive === 'boolean') {
    query.where('i.is_active', filters.isActive);
  }

  if (filters.startDate) {
    query.where('i.occurrence_at', '>=', filters.startDate);
  }

  if (filters.endDate) {
    query.where('i.occurrence_at', '<=', filters.endDate);
  }

  if (filters.incidentNumber) {
    query.whereRaw('UPPER(i.incident_number) = ?', [filters.incidentNumber.toUpperCase()]);
  }

  if (filters.bounds) {
    const { west, south, east, north } = filters.bounds;
    query.whereRaw('ST_Within(i.location, ST_MakeEnvelope(?, ?, ?, ?, 4326))', [
      west,
      south,
      east,
      north,
    ]);
  }
};

const mapIncidentRow = (row: IncidentRowBase): IncidentListItem => {
  const severity = mapSeverity(row);
  const status = mapStatus(row);
  const type = mapIncidentType(row);
  const source = mapSource(row);
  const weather = mapWeather(row);

  const locationGeometry = parseGeometry(row.locationGeoJson);
  const location = geometryToFeature(locationGeometry) as GeoJsonPoint | null;
  if (!location) {
    throw new Error('Incident location geometry is missing');
  }

  return {
    incidentNumber: row.incidentNumber,
    externalReference: row.externalReference,
    title: row.title,
    occurrenceAt: row.occurrenceAt,
    reportedAt: row.reportedAt,
    dispatchAt: row.dispatchAt,
    arrivalAt: row.arrivalAt,
    resolvedAt: row.resolvedAt,
    isActive: row.isActive,
    casualtyCount: Number(row.casualtyCount ?? 0),
    responderInjuries: Number(row.responderInjuries ?? 0),
    estimatedDamageAmount: row.estimatedDamageAmount,
    location,
    locationGeohash: row.locationGeohash,
    type,
    severity,
    status,
    source,
    weather,
    primaryStation: row.primaryStationCode
      ? {
        stationCode: row.primaryStationCode,
        name: row.primaryStationName ?? row.primaryStationCode,
      }
      : null,
  };
};

const mapIncidentRowForMap = (row: IncidentMapRow): IncidentMapListItem => {
  const locationGeometry = parseGeometry(row.locationGeoJson);
  const location = geometryToFeature(locationGeometry) as GeoJsonPoint | null;
  if (!location) {
    throw new Error('Incident location geometry is missing');
  }

  return {
    incidentNumber: row.incidentNumber,
    title: row.title,
    occurrenceAt: row.occurrenceAt,
    reportedAt: row.reportedAt,
    isActive: row.isActive,
    location,
    type: {
      code: row.typeCode ?? 'UNKNOWN',
      name: row.typeName ?? row.typeCode ?? 'Unknown',
    },
    severity: {
      code: row.severityCode ?? 'UNKNOWN',
      name: row.severityName ?? row.severityCode ?? 'Unknown',
      colorHex: row.severityColorHex ?? '#4B5563',
    },
    status: {
      code: row.statusCode ?? 'UNKNOWN',
      name: row.statusName ?? row.statusCode ?? 'Unknown',
    },
    primaryStation: row.primaryStationCode
      ? {
        stationCode: row.primaryStationCode,
        name: row.primaryStationName ?? row.primaryStationCode,
      }
      : null,
  };
};

const coerceCount = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export class IncidentRepository {
  constructor(private readonly db: Knex = getDb()) { }

  private async findLookupId(
    executor: Knex,
    table: string,
    codeColumn: string,
    code: string,
    entityName: string
  ): Promise<number> {
    const row = await executor(table).where(codeColumn, code).first<{ id: number }>('id');
    if (!row) {
      throw new IncidentLookupError(entityName, code);
    }
    return row.id;
  }

  private async findOptionalLookupId(
    executor: Knex,
    table: string,
    codeColumn: string,
    code: string | null | undefined,
    entityName: string
  ): Promise<number | null> {
    if (!code) {
      return null;
    }
    return this.findLookupId(executor, table, codeColumn, code, entityName);
  }

  private async resolveIncidentReferences(
    executor: Knex,
    input: CreateIncidentInput
  ): Promise<IncidentReferenceIds> {
    const typeId = await this.findLookupId(
      executor,
      'incident_types',
      'type_code',
      input.typeCode,
      'Incident type'
    );
    const severityId = await this.findLookupId(
      executor,
      'incident_severities',
      'severity_code',
      input.severityCode,
      'Incident severity'
    );
    const statusId = await this.findLookupId(
      executor,
      'incident_statuses',
      'status_code',
      input.statusCode,
      'Incident status'
    );

    const sourceId = await this.findOptionalLookupId(
      executor,
      'incident_sources',
      'source_code',
      input.sourceCode ?? null,
      'Incident source'
    );
    const weatherConditionId = await this.findOptionalLookupId(
      executor,
      'weather_conditions',
      'condition_code',
      input.weatherCode ?? null,
      'Weather condition'
    );
    const primaryStationId = await this.findOptionalLookupId(
      executor,
      'stations',
      'station_code',
      input.primaryStationCode ?? null,
      'Station'
    );

    return {
      typeId,
      severityId,
      statusId,
      sourceId,
      weatherConditionId,
      primaryStationId,
    };
  }

  public async listIncidents(
    filters: IncidentListFilters = {}
  ): Promise<PaginatedResult<IncidentListItem>> {
    const page = Math.max(filters.page ?? 1, 1);
    const rawPageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
    const pageSize = Math.min(Math.max(rawPageSize, 1), MAX_PAGE_SIZE);

    const baseQuery = this.db('incidents as i')
      .leftJoin('incident_types as it', 'i.type_id', 'it.id')
      .leftJoin('incident_severities as isv', 'i.severity_id', 'isv.id')
      .leftJoin('incident_statuses as ist', 'i.status_id', 'ist.id')
      .leftJoin('incident_sources as iso', 'i.source_id', 'iso.id')
      .leftJoin('weather_conditions as iwc', 'i.weather_condition_id', 'iwc.id')
      .leftJoin('stations as ps', 'i.primary_station_id', 'ps.id');

    applyFilters(baseQuery, filters);

    const total = await this.countIncidents(filters);

    const sortBy = filters.sortBy ?? 'reportedAt';
    const sortDirection = filters.sortDirection ?? 'desc';

    const sortColumn = (() => {
      switch (sortBy) {
        case 'occurrenceAt':
          return 'i.occurrence_at';
        case 'severityPriority':
          return 'isv.priority';
        case 'reportedAt':
        default:
          return 'i.reported_at';
      }
    })();

    const rows = (await baseQuery
      .clone()
      .select([
        'i.id as incidentId',
        'i.incident_number as incidentNumber',
        'i.external_reference as externalReference',
        'i.title as title',
        'i.occurrence_at as occurrenceAt',
        'i.reported_at as reportedAt',
        'i.dispatch_at as dispatchAt',
        'i.arrival_at as arrivalAt',
        'i.resolved_at as resolvedAt',
        'i.is_active as isActive',
        'i.casualty_count as casualtyCount',
        'i.responder_injuries as responderInjuries',
        'i.estimated_damage_amount as estimatedDamageAmount',
        'i.location_geohash as locationGeohash',
        'it.type_code as typeCode',
        'it.name as typeName',
        'it.description as typeDescription',
        'isv.severity_code as severityCode',
        'isv.name as severityName',
        'isv.description as severityDescription',
        'isv.priority as severityPriority',
        'isv.color_hex as severityColorHex',
        'ist.status_code as statusCode',
        'ist.name as statusName',
        'ist.description as statusDescription',
        'ist.is_terminal as statusIsTerminal',
        'iso.source_code as sourceCode',
        'iso.name as sourceName',
        'iso.description as sourceDescription',
        'iwc.condition_code as weatherCode',
        'iwc.name as weatherName',
        'iwc.description as weatherDescription',
        'ps.station_code as primaryStationCode',
        'ps.name as primaryStationName',
      ])
      .select(this.db.raw('ST_AsGeoJSON(i.location)::json as "locationGeoJson"'))
      .orderBy(sortColumn, sortDirection)
      .orderBy('i.id', sortDirection)
      .limit(pageSize)
      .offset((page - 1) * pageSize)) as IncidentRowBase[];

    const data = rows.map((row) => mapIncidentRow(row));

    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const hasNext = totalPages > 0 && page < totalPages;
    const hasPrevious = page > 1;

    return {
      data,
      page,
      pageSize,
      total,
      totalPages,
      hasNext,
      hasPrevious,
      sortBy,
      sortDirection,
    };
  }

  public async listIncidentsForMap(
    filters: IncidentListFilters = {}
  ): Promise<PaginatedResult<IncidentMapListItem>> {
    const page = Math.max(filters.page ?? 1, 1);
    const rawPageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
    const pageSize = Math.min(Math.max(rawPageSize, 1), MAX_PAGE_SIZE);
    repoLog('listIncidentsForMap:start', {
      page,
      pageSize,
      sortBy: filters.sortBy ?? 'reportedAt',
      sortDirection: filters.sortDirection ?? 'desc',
      hasBounds: Boolean(filters.bounds),
      hasCenter: Boolean(filters.center),
      typeCodes: filters.typeCodes?.length ?? 0,
      severityCodes: filters.severityCodes?.length ?? 0,
      statusCodes: filters.statusCodes?.length ?? 0,
    });

    const baseQuery = this.db('incidents as i')
      .leftJoin('incident_types as it', 'i.type_id', 'it.id')
      .leftJoin('incident_severities as isv', 'i.severity_id', 'isv.id')
      .leftJoin('incident_statuses as ist', 'i.status_id', 'ist.id')
      .leftJoin('stations as ps', 'i.primary_station_id', 'ps.id');

    applyFilters(baseQuery, filters);

    const total = await this.countIncidents(filters);
    repoLog('listIncidentsForMap:count', { total });

    const sortBy = filters.sortBy ?? 'reportedAt';
    const sortDirection = filters.sortDirection ?? 'desc';

    const sortColumn = (() => {
      switch (sortBy) {
        case 'occurrenceAt':
          return 'i.occurrence_at';
        case 'severityPriority':
          return 'isv.priority';
        case 'reportedAt':
        default:
          return 'i.reported_at';
      }
    })();

    const rows = (await baseQuery
      .clone()
      .select([
        'i.incident_number as incidentNumber',
        'i.title as title',
        'i.occurrence_at as occurrenceAt',
        'i.reported_at as reportedAt',
        'i.is_active as isActive',
        'it.type_code as typeCode',
        'it.name as typeName',
        'isv.severity_code as severityCode',
        'isv.name as severityName',
        'isv.color_hex as severityColorHex',
        'ist.status_code as statusCode',
        'ist.name as statusName',
        'ps.station_code as primaryStationCode',
        'ps.name as primaryStationName',
      ])
      .select(this.db.raw('ST_AsGeoJSON(i.location)::json as "locationGeoJson"'))
      .modify((query) => {
        if (filters.center) {
          query.orderByRaw('i.location <-> ST_SetSRID(ST_MakePoint(?, ?), 4326)', [
            filters.center.longitude,
            filters.center.latitude,
          ]);
        }
      })
      .orderBy(sortColumn, sortDirection)
      .orderBy('i.id', sortDirection)
      .limit(pageSize)
      .offset((page - 1) * pageSize)) as IncidentMapRow[];
    return {
      data: rows.map(mapIncidentRowForMap),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasNext: page < Math.ceil(total / pageSize),
      hasPrevious: page > 1,
      sortBy,
      sortDirection,
    };
  }

  public async getSyncStatus(): Promise<{ lastModified: string; count: number }> {
    const result = await this.db('incidents')
      .select(this.db.raw('MAX(updated_at) as "lastModified"'))
      .count<{ count: string; lastModified: string }>('id as count')
      .first();

    return {
      lastModified: result?.lastModified ? new Date(result.lastModified).toISOString() : new Date(0).toISOString(),
      count: Number(result?.count ?? 0),
    };
  }

  public async countIncidents(filters: IncidentListFilters = {}): Promise<number> {
    const query = this.db('incidents as i');

    applyFilterJoins(query, filters);
    applyFilters(query, filters);

    const [result] = await query.count<{ total: string }[]>({ total: '*' });

    const total = coerceCount(result?.total ?? 0);
    repoLog('countIncidents', {
      total,
      hasBounds: Boolean(filters.bounds),
      hasCenter: Boolean(filters.center),
      typeCodes: filters.typeCodes?.length ?? 0,
      severityCodes: filters.severityCodes?.length ?? 0,
      statusCodes: filters.statusCodes?.length ?? 0,
    });
    return total;
  }

  public createIncidentExportStream(
    filters: IncidentListFilters = {},
    options: { limit: number; sortBy?: IncidentSortField; sortDirection?: 'asc' | 'desc' }
  ): Readable {
    const sortBy = options.sortBy ?? filters.sortBy ?? 'reportedAt';
    const sortDirection = options.sortDirection ?? filters.sortDirection ?? 'desc';

    const sortColumn = (() => {
      switch (sortBy) {
        case 'occurrenceAt':
          return 'i.occurrence_at';
        case 'severityPriority':
          return 'isv.priority';
        case 'reportedAt':
        default:
          return 'i.reported_at';
      }
    })();

    const query = this.db('incidents as i')
      .leftJoin('incident_types as it', 'i.type_id', 'it.id')
      .leftJoin('incident_severities as isv', 'i.severity_id', 'isv.id')
      .leftJoin('incident_statuses as ist', 'i.status_id', 'ist.id')
      .leftJoin('incident_sources as iso', 'i.source_id', 'iso.id')
      .leftJoin('weather_conditions as iwc', 'i.weather_condition_id', 'iwc.id')
      .leftJoin('stations as ps', 'i.primary_station_id', 'ps.id')
      .select([
        'i.id as incidentId',
        'i.incident_number as incidentNumber',
        'i.external_reference as externalReference',
        'i.title as title',
        'i.occurrence_at as occurrenceAt',
        'i.reported_at as reportedAt',
        'i.dispatch_at as dispatchAt',
        'i.arrival_at as arrivalAt',
        'i.resolved_at as resolvedAt',
        'i.is_active as isActive',
        'i.casualty_count as casualtyCount',
        'i.responder_injuries as responderInjuries',
        'i.estimated_damage_amount as estimatedDamageAmount',
        'i.location_geohash as locationGeohash',
        'it.type_code as typeCode',
        'it.name as typeName',
        'it.description as typeDescription',
        'isv.severity_code as severityCode',
        'isv.name as severityName',
        'isv.description as severityDescription',
        'isv.priority as severityPriority',
        'isv.color_hex as severityColorHex',
        'ist.status_code as statusCode',
        'ist.name as statusName',
        'ist.description as statusDescription',
        'ist.is_terminal as statusIsTerminal',
        'iso.source_code as sourceCode',
        'iso.name as sourceName',
        'iso.description as sourceDescription',
        'iwc.condition_code as weatherCode',
        'iwc.name as weatherName',
        'iwc.description as weatherDescription',
        'ps.station_code as primaryStationCode',
        'ps.name as primaryStationName',
      ])
      .select(this.db.raw('ST_AsGeoJSON(i.location)::json as "locationGeoJson"'))
      .orderBy(sortColumn, sortDirection)
      .orderBy('i.id', sortDirection)
      .limit(Math.max(0, options.limit));

    applyFilters(query, filters);

    const rawStream = query.stream();
    const mapper = new Transform({
      objectMode: true,
      transform(chunk: IncidentRowBase, _encoding: unknown, callback: TransformCallback) {
        try {
          const item = mapIncidentRow(chunk);
          callback(null, item);
        } catch (error) {
          const normalizedError = error instanceof Error ? error : new Error(String(error));
          callback(normalizedError);
        }
      },
    });

    rawStream.on('error', (error: unknown) => {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      mapper.destroy(normalizedError);
    });

    return rawStream.pipe(mapper);
  }

  public async createIncident(input: CreateIncidentInput): Promise<IncidentDetail> {
    const incidentNumber = input.incidentNumber;

    const insertedIncidentNumber = await this.db.transaction(async (trx: Knex.Transaction) => {
      const references = await this.resolveIncidentReferences(trx, input);

      const [row] = await trx('incidents')
        .insert({
          incident_number: incidentNumber,
          external_reference: input.externalReference ?? null,
          title: input.title,
          narrative: input.narrative ?? null,
          type_id: references.typeId,
          severity_id: references.severityId,
          status_id: references.statusId,
          source_id: references.sourceId,
          weather_condition_id: references.weatherConditionId,
          primary_station_id: references.primaryStationId,
          occurrence_at: input.occurrenceAt,
          reported_at: input.reportedAt,
          dispatch_at: input.dispatchAt ?? null,
          arrival_at: input.arrivalAt ?? null,
          resolved_at: input.resolvedAt ?? null,
          is_active: input.isActive,
          casualty_count: input.casualtyCount,
          responder_injuries: input.responderInjuries,
          estimated_damage_amount: input.estimatedDamageAmount ?? null,
          location: trx.raw('ST_SetSRID(ST_Point(?, ?), 4326)', [
            input.location.longitude,
            input.location.latitude,
          ]),
          location_geohash: null,
          metadata: trx.raw('?::jsonb', [JSON.stringify(input.metadata ?? {})]),
        })
        .returning<{ incident_number: string }[]>('incident_number');

      return row.incident_number;
    });

    const detail = await this.getIncidentDetail(insertedIncidentNumber);
    if (!detail) {
      throw new Error(`Failed to load incident '${insertedIncidentNumber}' after creation.`);
    }

    return detail;
  }

  public async getIncidentDetail(incidentNumber: string): Promise<IncidentDetail | null> {
    const incidentRow = (await this.db('incidents as i')
      .leftJoin('incident_types as it', 'i.type_id', 'it.id')
      .leftJoin('incident_severities as isv', 'i.severity_id', 'isv.id')
      .leftJoin('incident_statuses as ist', 'i.status_id', 'ist.id')
      .leftJoin('incident_sources as iso', 'i.source_id', 'iso.id')
      .leftJoin('weather_conditions as iwc', 'i.weather_condition_id', 'iwc.id')
      .leftJoin('stations as ps', 'i.primary_station_id', 'ps.id')
      .where('i.incident_number', incidentNumber)
      .select([
        'i.id as incidentId',
        'i.incident_number as incidentNumber',
        'i.external_reference as externalReference',
        'i.title as title',
        'i.narrative as narrative',
        'i.occurrence_at as occurrenceAt',
        'i.reported_at as reportedAt',
        'i.dispatch_at as dispatchAt',
        'i.arrival_at as arrivalAt',
        'i.resolved_at as resolvedAt',
        'i.is_active as isActive',
        'i.casualty_count as casualtyCount',
        'i.responder_injuries as responderInjuries',
        'i.estimated_damage_amount as estimatedDamageAmount',
        'i.metadata as metadata',
        'i.location_geohash as locationGeohash',
        'it.type_code as typeCode',
        'it.name as typeName',
        'it.description as typeDescription',
        'isv.severity_code as severityCode',
        'isv.name as severityName',
        'isv.description as severityDescription',
        'isv.priority as severityPriority',
        'isv.color_hex as severityColorHex',
        'ist.status_code as statusCode',
        'ist.name as statusName',
        'ist.description as statusDescription',
        'ist.is_terminal as statusIsTerminal',
        'iso.source_code as sourceCode',
        'iso.name as sourceName',
        'iso.description as sourceDescription',
        'iwc.condition_code as weatherCode',
        'iwc.name as weatherName',
        'iwc.description as weatherDescription',
        'ps.station_code as primaryStationCode',
        'ps.name as primaryStationName',
      ])
      .select(this.db.raw('ST_AsGeoJSON(i.location)::json as "locationGeoJson"'))
      .first()) as IncidentDetailRow | undefined;

    if (!incidentRow) {
      return null;
    }

    const base = mapIncidentRow(incidentRow);

    const metadata = parseJsonColumn<Record<string, unknown>>(incidentRow.metadata, {});

    const incidentId = incidentRow.incidentId;

    const [unitRows, assetRows, noteRows] = await Promise.all([
      this.db<IncidentUnitRow>('incident_units as iu')
        .join('stations as s', 'iu.station_id', 's.id')
        .where('iu.incident_id', incidentId)
        .orderBy('iu.created_at', 'asc')
        .select<
          IncidentUnitRow[]
        >(['s.station_code as stationCode', 's.name as stationName', 'iu.assignment_role as assignmentRole', 'iu.dispatched_at as dispatchedAt', 'iu.cleared_at as clearedAt']),
      this.db<IncidentAssetRow>('incident_assets')
        .where('incident_id', incidentId)
        .orderBy('created_at', 'asc')
        .select<
          IncidentAssetRow[]
        >(['asset_identifier as assetIdentifier', 'asset_type as assetType', 'status', 'notes']),
      this.db<IncidentNoteRow>('incident_notes')
        .where('incident_id', incidentId)
        .orderBy('created_at', 'asc')
        .select<IncidentNoteRow[]>(['author', 'note', 'created_at as createdAt']),
    ]);

    return {
      ...base,
      narrative: incidentRow.narrative ?? null,
      metadata,
      units: unitRows.map((row) => ({
        stationCode: row.stationCode,
        stationName: row.stationName,
        assignmentRole: row.assignmentRole ?? null,
        dispatchedAt: row.dispatchedAt ?? null,
        clearedAt: row.clearedAt ?? null,
      })),
      assets: assetRows.map((row) => ({
        assetIdentifier: row.assetIdentifier,
        assetType: row.assetType,
        status: row.status ?? null,
        notes: row.notes ?? null,
      })),
      notes: noteRows.map((row) => ({
        author: row.author,
        note: row.note,
        createdAt: row.createdAt,
      })),
    };
  }

  public async getIncidentMetadata(): Promise<Omit<IncidentMetadata, 'limits'>> {
    const [typeRows, severityRows, statusRows, dateBoundsRaw, activeRowRaw] = await Promise.all([
      this.db<IncidentTypeMetaRow>('incident_types')
        .select<IncidentTypeMetaRow[]>(['type_code as code', 'name', 'description'])
        .orderBy('name', 'asc'),
      this.db<IncidentSeverityMetaRow>('incident_severities')
        .select<IncidentSeverityMetaRow[]>([
          'severity_code as code',
          'name',
          'description',
          'priority',
          'color_hex as colorHex',
        ])
        .orderBy([
          { column: 'priority', order: 'asc' },
          { column: 'name', order: 'asc' },
        ]),
      this.db<IncidentStatusMetaRow>('incident_statuses')
        .select<IncidentStatusMetaRow[]>([
          'status_code as code',
          'name',
          'description',
          'is_terminal as isTerminal',
        ])
        .orderBy([
          { column: 'is_terminal', order: 'asc' },
          { column: 'name', order: 'asc' },
        ]),
      this.db('incidents')
        .min({ minOccurrenceAt: 'occurrence_at' })
        .max({ maxOccurrenceAt: 'occurrence_at' })
        .min({ minReportedAt: 'reported_at' })
        .max({ maxReportedAt: 'reported_at' })
        .first(),
      this.db('incidents').count<{ total: string }>('id as total').where('is_active', true).first(),
    ]);

    const types = typeRows.map((row) => createLookup(row.code, row.name, row.description));
    const severities = severityRows.map(
      (row): IncidentSeverity => ({
        ...createLookup(row.code, row.name, row.description),
        priority: Number(row.priority ?? 0),
        colorHex: row.colorHex ?? '#000000',
      })
    );
    const statuses = statusRows.map(
      (row): IncidentStatus => ({
        ...createLookup(row.code, row.name, row.description),
        isTerminal: Boolean(row.isTerminal),
      })
    );

    const bounds = (dateBoundsRaw ?? {}) as {
      minOccurrenceAt?: string | null;
      maxOccurrenceAt?: string | null;
      minReportedAt?: string | null;
      maxReportedAt?: string | null;
    };

    const activeTotalRaw = activeRowRaw?.total as string | number | null | undefined;
    const activeTotal =
      typeof activeTotalRaw === 'string' ? Number(activeTotalRaw) : activeTotalRaw;

    return {
      types,
      severities,
      statuses,
      occurrenceRange: {
        start: bounds.minOccurrenceAt ?? null,
        end: bounds.maxOccurrenceAt ?? null,
      },
      reportedRange: {
        start: bounds.minReportedAt ?? null,
        end: bounds.maxReportedAt ?? null,
      },
      activeCount: Number(activeTotal ?? 0),
    };
  }

  public async findIncidentSummary(incidentNumber: string): Promise<IncidentSearchResult | null> {
    const row = (await this.db('incidents as i')
      .leftJoin('incident_types as it', 'i.type_id', 'it.id')
      .leftJoin('incident_severities as isv', 'i.severity_id', 'isv.id')
      .leftJoin('incident_statuses as ist', 'i.status_id', 'ist.id')
      .select([
        'i.id as incidentId',
        'i.incident_number as incidentNumber',
        'i.title as title',
        'i.occurrence_at as occurrenceAt',
        'i.reported_at as reportedAt',
        'i.dispatch_at as dispatchAt',
        'i.arrival_at as arrivalAt',
        'i.resolved_at as resolvedAt',
        'i.is_active as isActive',
        'i.casualty_count as casualtyCount',
        'i.responder_injuries as responderInjuries',
        'i.estimated_damage_amount as estimatedDamageAmount',
        'i.location_geohash as locationGeohash',
        'it.type_code as typeCode',
        'it.name as typeName',
        'it.description as typeDescription',
        'isv.severity_code as severityCode',
        'isv.name as severityName',
        'isv.description as severityDescription',
        'isv.priority as severityPriority',
        'isv.color_hex as severityColorHex',
        'ist.status_code as statusCode',
        'ist.name as statusName',
        'ist.description as statusDescription',
        'ist.is_terminal as statusIsTerminal',
      ])
      .select(this.db.raw('ST_AsGeoJSON(i.location)::json as "locationGeoJson"'))
      .where('i.incident_number', incidentNumber)
      .first()) as IncidentRowBase | undefined;

    if (!row) {
      return null;
    }

    const mapped = mapIncidentRow(row);
    return {
      incidentNumber: mapped.incidentNumber,
      title: mapped.title,
      occurrenceAt: mapped.occurrenceAt,
      reportedAt: mapped.reportedAt,
      isActive: mapped.isActive,
      location: mapped.location,
      severity: mapped.severity,
      status: mapped.status,
      type: mapped.type,
    };
  }

  public async countIncidentsByReportedRange(
    filters: IncidentListFilters,
    range: { start: string; end: string }
  ): Promise<number> {
    if (new Date(range.start).getTime() > new Date(range.end).getTime()) {
      return 0;
    }

    const query = this.db('incidents as i')
      .leftJoin('incident_types as it', 'i.type_id', 'it.id')
      .leftJoin('incident_severities as isv', 'i.severity_id', 'isv.id')
      .leftJoin('incident_statuses as ist', 'i.status_id', 'ist.id');
    applyFilters(query, filters);
    query.whereBetween('i.reported_at', [range.start, range.end]);

    const row = await query.count<{ total: string | number }>('i.id as total').first();
    return coerceCount(row?.total);
  }

  public async getIncidentCountsByType(
    filters: IncidentListFilters,
    range?: { start: string; end: string }
  ): Promise<IncidentTypeBucket[]> {
    const query = this.db('incidents as i')
      .leftJoin('incident_types as it', 'i.type_id', 'it.id')
      .leftJoin('incident_severities as isv', 'i.severity_id', 'isv.id')
      .leftJoin('incident_statuses as ist', 'i.status_id', 'ist.id')
      .select<
        IncidentTypeCountRow[]
      >(['it.type_code as typeCode', 'it.name as typeName', 'it.description as typeDescription'])
      .count<{ total: string | number }>('i.id as total')
      .groupBy(['it.type_code', 'it.name', 'it.description'])
      .orderBy('total', 'desc');

    applyFilters(query, filters);

    if (range) {
      query.whereBetween('i.reported_at', [range.start, range.end]);
    }

    const rows = (await query) as IncidentTypeCountRow[];
    return rows
      .filter((row) => row.typeCode)
      .map((row) => ({
        type: createLookup(row.typeCode, row.typeName, row.typeDescription),
        count: coerceCount(row.total),
      }))
      .filter((bucket) => bucket.count > 0);
  }

  public async getIncidentCountsByReportedDay(
    filters: IncidentListFilters,
    range: { start: string; end: string }
  ): Promise<IncidentDailyCount[]> {
    if (new Date(range.start).getTime() > new Date(range.end).getTime()) {
      return [];
    }

    const query = this.db('incidents as i')
      .leftJoin('incident_types as it', 'i.type_id', 'it.id')
      .leftJoin('incident_severities as isv', 'i.severity_id', 'isv.id')
      .leftJoin('incident_statuses as ist', 'i.status_id', 'ist.id')
      .select<IncidentDailyCountRow[]>([
        this.db.raw('DATE_TRUNC(\'day\', i.reported_at) as "bucketDate"'),
      ])
      .count<{ total: string | number }>('i.id as total')
      .groupByRaw("DATE_TRUNC('day', i.reported_at)")
      .orderByRaw("DATE_TRUNC('day', i.reported_at)");

    applyFilters(query, filters);
    query.whereBetween('i.reported_at', [range.start, range.end]);

    const rows = (await query) as unknown as IncidentDailyCountRow[];

    return rows.map((row) => ({
      date: new Date(row.bucketDate).toISOString(),
      count: coerceCount(row.total),
    }));
  }

  public async getSeverityDistribution(
    filters: IncidentListFilters
  ): Promise<IncidentSeverityBucket[]> {
    const query = this.db('incidents as i')
      .leftJoin('incident_types as it', 'i.type_id', 'it.id')
      .leftJoin('incident_severities as isv', 'i.severity_id', 'isv.id')
      .leftJoin('incident_statuses as ist', 'i.status_id', 'ist.id')
      .select<
        IncidentSeverityCountRow[]
      >(['isv.severity_code as severityCode', 'isv.name as severityName', 'isv.description as severityDescription', 'isv.priority as severityPriority', 'isv.color_hex as severityColorHex'])
      .count<{ total: string | number }>('i.id as total')
      .groupBy([
        'isv.severity_code',
        'isv.name',
        'isv.description',
        'isv.priority',
        'isv.color_hex',
      ])
      .orderBy('total', 'desc');

    applyFilters(query, filters);

    const rows = (await query) as IncidentSeverityCountRow[];
    return rows
      .filter((row) => row.severityCode)
      .map((row) => ({
        severity: {
          ...createLookup(row.severityCode, row.severityName, row.severityDescription),
          priority: Number(row.severityPriority ?? 0),
          colorHex: row.severityColorHex ?? '#000000',
        },
        count: coerceCount(row.total),
      }))
      .filter((bucket) => bucket.count > 0);
  }

  public async getIncidentCountsByReportedMonth(
    filters: IncidentListFilters,
    range: { start: string; end: string }
  ): Promise<Array<{ periodStart: string; count: number }>> {
    if (new Date(range.start).getTime() > new Date(range.end).getTime()) {
      return [];
    }

    const filtersWithRange: IncidentListFilters = {
      ...filters,
      startDate: filters.startDate ?? range.start,
      endDate: filters.endDate ?? range.end,
    };

    const query = this.db('incidents as i')
      .leftJoin('incident_types as it', 'i.type_id', 'it.id')
      .leftJoin('incident_severities as isv', 'i.severity_id', 'isv.id')
      .leftJoin('incident_statuses as ist', 'i.status_id', 'ist.id')
      .select<IncidentMonthlyCountRow[]>([
        this.db.raw('DATE_TRUNC(\'month\', i.reported_at) as "bucketMonth"'),
      ])
      .count<{ total: string | number }>('i.id as total')
      .groupByRaw("DATE_TRUNC('month', i.reported_at)")
      .orderByRaw("DATE_TRUNC('month', i.reported_at)");

    applyFilters(query, filtersWithRange);
    query.whereBetween('i.reported_at', [range.start, range.end]);

    const rows = (await query) as unknown as IncidentMonthlyCountRow[];
    return rows.map((row) => ({
      periodStart: new Date(row.bucketMonth).toISOString(),
      count: coerceCount(row.total),
    }));
  }

  public async getIncidentCountsByReportedQuarter(
    filters: IncidentListFilters,
    range: { start: string; end: string }
  ): Promise<Array<{ periodStart: string; year: number; quarter: number; count: number }>> {
    if (new Date(range.start).getTime() > new Date(range.end).getTime()) {
      return [];
    }

    const filtersWithRange: IncidentListFilters = {
      ...filters,
      startDate: filters.startDate ?? range.start,
      endDate: filters.endDate ?? range.end,
    };

    const query = this.db('incidents as i')
      .leftJoin('incident_types as it', 'i.type_id', 'it.id')
      .leftJoin('incident_severities as isv', 'i.severity_id', 'isv.id')
      .leftJoin('incident_statuses as ist', 'i.status_id', 'ist.id')
      .select<IncidentQuarterCountRow[]>([
        this.db.raw('DATE_TRUNC(\'quarter\', i.reported_at) as "bucketQuarter"'),
        this.db.raw('EXTRACT(YEAR FROM i.reported_at) as year'),
        this.db.raw('EXTRACT(QUARTER FROM i.reported_at) as quarter'),
      ])
      .count<{ total: string | number }>('i.id as total')
      .groupByRaw(
        "DATE_TRUNC('quarter', i.reported_at), EXTRACT(YEAR FROM i.reported_at), EXTRACT(QUARTER FROM i.reported_at)"
      )
      .orderByRaw("DATE_TRUNC('quarter', i.reported_at)");

    applyFilters(query, filtersWithRange);
    query.whereBetween('i.reported_at', [range.start, range.end]);

    const rows = (await query) as unknown as IncidentQuarterCountRow[];
    return rows.map((row) => ({
      periodStart: new Date(row.bucketQuarter).toISOString(),
      year: Number(row.year),
      quarter: Number(row.quarter),
      count: coerceCount(row.total),
    }));
  }

  public async getIncidentTypeTimeline(
    filters: IncidentListFilters,
    range: { start: string; end: string }
  ): Promise<Array<{ periodStart: string; type: IncidentLookupValue; count: number }>> {
    if (new Date(range.start).getTime() > new Date(range.end).getTime()) {
      return [];
    }

    const filtersWithRange: IncidentListFilters = {
      ...filters,
      startDate: filters.startDate ?? range.start,
      endDate: filters.endDate ?? range.end,
    };

    const query = this.db('incidents as i')
      .leftJoin('incident_types as it', 'i.type_id', 'it.id')
      .leftJoin('incident_severities as isv', 'i.severity_id', 'isv.id')
      .leftJoin('incident_statuses as ist', 'i.status_id', 'ist.id')
      .select<IncidentTypeTimelineRow[]>([
        this.db.raw('DATE_TRUNC(\'month\', i.reported_at) as "bucketMonth"'),
        'it.type_code as typeCode',
        'it.name as typeName',
        'it.description as typeDescription',
      ])
      .count<{ total: string | number }>('i.id as total')
      .groupByRaw("DATE_TRUNC('month', i.reported_at), it.type_code, it.name, it.description")
      .orderByRaw("DATE_TRUNC('month', i.reported_at)")
      .orderBy('it.type_code', 'asc');

    applyFilters(query, filtersWithRange);
    query.whereBetween('i.reported_at', [range.start, range.end]);

    const rows = (await query) as unknown as IncidentTypeTimelineRow[];
    return rows
      .filter((row) => row.typeCode)
      .map((row) => ({
        periodStart: new Date(row.bucketMonth).toISOString(),
        type: createLookup(row.typeCode as string, row.typeName, row.typeDescription),
        count: coerceCount(row.total),
      }));
  }

  public async getIncidentHotspotAggregates(
    filters: IncidentListFilters,
    options: { cellSizeMeters: number; resolution: number }
  ): Promise<HotspotAggregateRow[]> {
    const cellSize = Math.max(options.cellSizeMeters, 1);

    const filteredQuery = this.db('incidents as i')
      .leftJoin('incident_types as it', 'i.type_id', 'it.id')
      .leftJoin('incident_severities as isv', 'i.severity_id', 'isv.id')
      .leftJoin('incident_statuses as ist', 'i.status_id', 'ist.id')
      .select(['i.id as incidentId', this.db.raw('ST_Transform(i.location, 3857) as geom')]);

    applyFilters(filteredQuery, filters);

    const rawRows = (await this.db
      .with('filtered', filteredQuery)
      .with('binned', (qb) => {
        qb.select([
          this.db.raw('geom'),
          this.db.raw('FLOOR(ST_X(geom) / ?) as cell_x', [cellSize]),
          this.db.raw('FLOOR(ST_Y(geom) / ?) as cell_y', [cellSize]),
        ]).from('filtered');
      })
      .from('binned')
      .select<RawHotspotAggregateRow[]>([
        this.db.raw(
          "CONCAT('sq_', cell_x::bigint, '_', cell_y::bigint, '_r', CAST(? AS int))::text as \"cellId\"",
          [options.resolution]
        ),
        this.db.raw(
          'ST_AsGeoJSON(\n            ST_Transform(\n              ST_SetSRID(\n                ST_MakeEnvelope(\n                  cell_x * ?,\n                  cell_y * ?,\n                  (cell_x + 1) * ?,\n                  (cell_y + 1) * ?,\n                  3857\n                ),\n                3857\n              ),\n              4326\n            )\n          )::json as "geometry"',
          [cellSize, cellSize, cellSize, cellSize]
        ),
        this.db.raw(
          'ST_AsGeoJSON(\n            ST_Transform(\n              ST_SetSRID(\n                ST_Point(\n                  (cell_x + 0.5) * ?,\n                  (cell_y + 0.5) * ?\n                ),\n                3857\n              ),\n              4326\n            )\n          )::json -> \'coordinates\' as "centroidCoordinates"',
          [cellSize, cellSize]
        ),
        this.db.raw('COUNT(*)::int as "incidentCount"'),
      ])
      .groupBy(['cell_x', 'cell_y'])
      .orderBy('incidentCount', 'desc')) as RawHotspotAggregateRow[];

    return rawRows.map((row) => ({
      cellId: row.cellId,
      geometry: row.geometry,
      centroidCoordinates: row.centroidCoordinates,
      incidentCount:
        typeof row.incidentCount === 'number' ? row.incidentCount : Number(row.incidentCount),
    }));
  }

  public async getResponseTimeMetrics(
    filters: IncidentListFilters,
    options: { groupBy: 'station' | 'grid'; cellSizeMeters?: number; resolution?: number }
  ): Promise<ResponseMetricRow[]> {
    const baseQuery = this.db('incidents as i')
      .leftJoin('incident_types as it', 'i.type_id', 'it.id')
      .leftJoin('incident_severities as isv', 'i.severity_id', 'isv.id')
      .leftJoin('incident_statuses as ist', 'i.status_id', 'ist.id')
      .leftJoin('stations as ps', 'i.primary_station_id', 'ps.id')
      .select([
        'i.id as incidentId',
        'ps.station_code as stationCode',
        'ps.name as stationName',
        this.db.raw('EXTRACT(EPOCH FROM (i.arrival_at - i.dispatch_at)) as response_seconds'),
        this.db.raw('ST_Transform(i.location, 3857) as geom'),
      ])
      .whereNotNull('i.dispatch_at')
      .whereNotNull('i.arrival_at');

    applyFilters(baseQuery, filters);

    const responseDataAlias = 'response_data';

    if (options.groupBy === 'station') {
      const rows = (await this.db
        .with(responseDataAlias, baseQuery)
        .from<ResponseMetricStationRow>(responseDataAlias)
        .whereNotNull('stationCode')
        .where('response_seconds', '>', 0)
        .select([
          this.db.raw('\'station\'::text as "groupType"'),
          'stationCode',
          'stationName',
          this.db.raw('COUNT(*)::int as "sampleSize"'),
          this.db.raw('AVG(response_seconds) as "averageSeconds"'),
          this.db.raw(
            'PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_seconds) as "medianSeconds"'
          ),
          this.db.raw(
            'PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY response_seconds) as "p90Seconds"'
          ),
        ])
        .groupBy(['stationCode', 'stationName'])
        .orderBy('stationCode', 'asc')) as ResponseMetricStationRow[];

      return rows.map((row) => ({
        groupType: 'station',
        stationCode: row.stationCode,
        stationName: row.stationName,
        sampleSize: Number(row.sampleSize ?? 0),
        averageSeconds: Number(row.averageSeconds ?? 0),
        medianSeconds: Number(row.medianSeconds ?? 0),
        p90Seconds: Number(row.p90Seconds ?? 0),
      }));
    }

    const cellSize = Math.max(options.cellSizeMeters ?? 1, 1);
    const resolution = options.resolution ?? 4;

    const rows = (await this.db
      .with(responseDataAlias, baseQuery)
      .with('binned', (qb) => {
        qb.select([
          this.db.raw('geom'),
          this.db.raw('response_seconds'),
          this.db.raw('FLOOR(ST_X(geom) / ?) as cell_x', [cellSize]),
          this.db.raw('FLOOR(ST_Y(geom) / ?) as cell_y', [cellSize]),
        ])
          .from(responseDataAlias)
          .where('response_seconds', '>', 0);
      })
      .from<ResponseMetricGridRow>('binned')
      .select([
        this.db.raw('\'grid\'::text as "groupType"'),
        this.db.raw(
          "CONCAT('sq_', cell_x::bigint, '_', cell_y::bigint, '_r', CAST(? AS int))::text as \"cellId\"",
          [resolution]
        ),
        this.db.raw(
          'ST_AsGeoJSON(\n            ST_Transform(\n              ST_SetSRID(\n                ST_MakeEnvelope(\n                  cell_x * ?,\n                  cell_y * ?,\n                  (cell_x + 1) * ?,\n                  (cell_y + 1) * ?,\n                  3857\n                ),\n                3857\n              ),\n              4326\n            )\n          )::json as "geometry"',
          [cellSize, cellSize, cellSize, cellSize]
        ),
        this.db.raw(
          'ST_AsGeoJSON(\n            ST_Transform(\n              ST_SetSRID(\n                ST_Point(\n                  (cell_x + 0.5) * ?,\n                  (cell_y + 0.5) * ?\n                ),\n                3857\n              ),\n              4326\n            )\n          )::json -> \'coordinates\' as "centroidCoordinates"',
          [cellSize, cellSize]
        ),
        this.db.raw('COUNT(*)::int as "sampleSize"'),
        this.db.raw('AVG(response_seconds) as "averageSeconds"'),
        this.db.raw(
          'PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_seconds) as "medianSeconds"'
        ),
        this.db.raw(
          'PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY response_seconds) as "p90Seconds"'
        ),
      ])
      .groupBy(['cell_x', 'cell_y'])
      .orderBy('sampleSize', 'desc')) as ResponseMetricGridRow[];

    return rows.map((row) => ({
      groupType: 'grid',
      cellId: row.cellId,
      geometry: row.geometry,
      centroidCoordinates: row.centroidCoordinates,
      sampleSize: Number(row.sampleSize ?? 0),
      averageSeconds: Number(row.averageSeconds ?? 0),
      medianSeconds: Number(row.medianSeconds ?? 0),
      p90Seconds: Number(row.p90Seconds ?? 0),
    }));
  }

  public async getPriorityScores(
    filters: IncidentListFilters,
    options: {
      groupBy: 'station' | 'grid';
      cellSizeMeters?: number;
      resolution?: number;
      decayHalfLifeDays?: number | null;
    }
  ): Promise<PriorityScoreRow[]> {
    const weightColumn =
      options.decayHalfLifeDays && options.decayHalfLifeDays > 0
        ? this.db.raw(
          'POWER(0.5, GREATEST(0, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - i.occurrence_at)) / (? * 86400))) as "weightFactor"',
          [options.decayHalfLifeDays]
        )
        : this.db.raw('1.0 as "weightFactor"');

    const baseQuery = this.db('incidents as i')
      .leftJoin('incident_types as it', 'i.type_id', 'it.id')
      .leftJoin('incident_severities as isv', 'i.severity_id', 'isv.id')
      .leftJoin('incident_statuses as ist', 'i.status_id', 'ist.id')
      .leftJoin('stations as ps', 'i.primary_station_id', 'ps.id')
      .select([
        this.db.raw('i.id as "incidentId"'),
        this.db.raw('ps.station_code as "stationCode"'),
        this.db.raw('ps.name as "stationName"'),
        this.db.raw('COALESCE(isv.priority, 0)::numeric as "severityPriority"'),
        this.db.raw('i.occurrence_at as "occurrenceAt"'),
        this.db.raw('ST_Transform(i.location, 3857) as geom'),
        weightColumn,
      ]);

    applyFilters(baseQuery, filters);

    const baseAlias = 'priority_base';

    if (options.groupBy === 'station') {
      const rows = (await this.db
        .with(baseAlias, baseQuery)
        .from<PriorityScoreStationRow>(baseAlias)
        .whereNotNull('stationCode')
        .select([
          this.db.raw('\'station\'::text as "groupType"'),
          'stationCode',
          'stationName',
          this.db.raw('COUNT(*)::int as "totalIncidents"'),
          this.db.raw('SUM("severityPriority" * "weightFactor") as "rawScore"'),
          this.db.raw('SUM("weightFactor") as "weightSum"'),
          this.db.raw('AVG("severityPriority") as "averageSeverity"'),
        ])
        .groupBy(['stationCode', 'stationName'])
        .orderBy('stationCode', 'asc')) as PriorityScoreStationRow[];

      return rows.map((row) => ({
        groupType: 'station',
        stationCode: row.stationCode,
        stationName: row.stationName,
        totalIncidents: Number(row.totalIncidents ?? 0),
        rawScore: Number(row.rawScore ?? 0),
        weightSum: Number(row.weightSum ?? 0),
        averageSeverity: Number(row.averageSeverity ?? 0),
      }));
    }

    const cellSize = Math.max(options.cellSizeMeters ?? 1, 1);
    const resolution = options.resolution ?? 4;

    const rows = (await this.db
      .with(baseAlias, baseQuery)
      .with('binned', (qb) => {
        qb.select([
          'geom',
          this.db.raw('"severityPriority"'),
          this.db.raw('"weightFactor"'),
          this.db.raw('FLOOR(ST_X(geom) / ?) as cell_x', [cellSize]),
          this.db.raw('FLOOR(ST_Y(geom) / ?) as cell_y', [cellSize]),
        ]).from(baseAlias);
      })
      .from<PriorityScoreGridRow>('binned')
      .select([
        this.db.raw('\'grid\'::text as "groupType"'),
        this.db.raw(
          "CONCAT('sq_', cell_x::bigint, '_', cell_y::bigint, '_r', CAST(? AS int))::text as \"cellId\"",
          [resolution]
        ),
        this.db.raw(
          'ST_AsGeoJSON(\n            ST_Transform(\n              ST_SetSRID(\n                ST_MakeEnvelope(\n                  cell_x * ?,\n                  cell_y * ?,\n                  (cell_x + 1) * ?,\n                  (cell_y + 1) * ?,\n                  3857\n                ),\n                3857\n              ),\n              4326\n            )\n          )::json as "geometry"',
          [cellSize, cellSize, cellSize, cellSize]
        ),
        this.db.raw(
          'ST_AsGeoJSON(\n            ST_Transform(\n              ST_SetSRID(\n                ST_Point(\n                  (cell_x + 0.5) * ?,\n                  (cell_y + 0.5) * ?\n                ),\n                3857\n              ),\n              4326\n            )\n          )::json -> \'coordinates\' as "centroidCoordinates"',
          [cellSize, cellSize]
        ),
        this.db.raw('COUNT(*)::int as "totalIncidents"'),
        this.db.raw('SUM("severityPriority" * "weightFactor") as "rawScore"'),
        this.db.raw('SUM("weightFactor") as "weightSum"'),
        this.db.raw('AVG("severityPriority") as "averageSeverity"'),
      ])
      .groupBy(['cell_x', 'cell_y'])
      .orderBy('totalIncidents', 'desc')) as PriorityScoreGridRow[];

    return rows.map((row) => ({
      groupType: 'grid',
      cellId: row.cellId,
      geometry: row.geometry,
      centroidCoordinates: row.centroidCoordinates,
      totalIncidents: Number(row.totalIncidents ?? 0),
      rawScore: Number(row.rawScore ?? 0),
      weightSum: Number(row.weightSum ?? 0),
      averageSeverity: Number(row.averageSeverity ?? 0),
    }));
  }

  public async listRecentIncidents(
    filters: IncidentListFilters,
    limit = 10
  ): Promise<RecentIncidentSummary[]> {
    const query = this.db('incidents as i')
      .leftJoin('incident_types as it', 'i.type_id', 'it.id')
      .leftJoin('incident_severities as isv', 'i.severity_id', 'isv.id')
      .leftJoin('incident_statuses as ist', 'i.status_id', 'ist.id')
      .leftJoin('stations as ps', 'i.primary_station_id', 'ps.id')
      .select<RecentIncidentRow[]>([
        'i.incident_number as incidentNumber',
        'i.title as title',
        'i.occurrence_at as occurrenceAt',
        'i.reported_at as reportedAt',
        'i.is_active as isActive',
        'ps.station_code as primaryStationCode',
        'ps.name as primaryStationName',
        'it.type_code as typeCode',
        'it.name as typeName',
        'it.description as typeDescription',
        'isv.severity_code as severityCode',
        'isv.name as severityName',
        'isv.description as severityDescription',
        'isv.priority as severityPriority',
        'isv.color_hex as severityColorHex',
        'ist.status_code as statusCode',
        'ist.name as statusName',
        'ist.description as statusDescription',
        'ist.is_terminal as statusIsTerminal',
      ])
      .select(this.db.raw('ST_AsGeoJSON(i.location)::json as "locationGeoJson"'))
      .orderBy('i.reported_at', 'desc')
      .orderBy('i.id', 'desc')
      .limit(Math.max(1, Math.min(limit, 50)));

    applyFilters(query, filters);

    const rows = (await query) as Array<RecentIncidentRow & { locationGeoJson: unknown }>;

    return rows.map((row) => {
      const severity = mapSeverity(row);
      const status = mapStatus(row);
      const type = mapIncidentType(row);
      const locationGeometry = parseGeometry(row.locationGeoJson);
      const location = geometryToFeature(locationGeometry) as GeoJsonPoint | null;
      if (!location) {
        throw new Error('Incident location geometry is missing');
      }

      return {
        incidentNumber: row.incidentNumber,
        title: row.title,
        occurrenceAt: row.occurrenceAt,
        reportedAt: row.reportedAt,
        isActive: row.isActive,
        location,
        severity,
        status,
        type,
        primaryStation: row.primaryStationCode
          ? {
            stationCode: row.primaryStationCode,
            name: row.primaryStationName ?? row.primaryStationCode,
          }
          : null,
      } satisfies RecentIncidentSummary;
    });
  }

  public async getStationCoverageBuffers(
    filters: IncidentListFilters,
    options: { radiusOverride?: number; stationIsActive?: boolean } = {}
  ): Promise<StationCoverageBuffer[]> {
    const radiusOverride = options.radiusOverride ?? null;
    const stationIsActive = options.stationIsActive;

    const incidentCountsQuery = this.db('incidents as i')
      .leftJoin('incident_types as it', 'i.type_id', 'it.id')
      .leftJoin('incident_severities as isv', 'i.severity_id', 'isv.id')
      .leftJoin('incident_statuses as ist', 'i.status_id', 'ist.id')
      .select('i.primary_station_id as stationId')
      .count<{ total: string | number }>('i.id as total')
      .whereNotNull('i.primary_station_id')
      .groupBy('i.primary_station_id');

    applyFilters(incidentCountsQuery, filters);

    const countsAlias = incidentCountsQuery.as('ic');

    const radiusExpression = this.db.raw(
      'COALESCE(?, NULLIF(s.coverage_radius_meters, 0), ?)::numeric as "radiusMeters"',
      [radiusOverride, DEFAULT_STATION_COVERAGE_RADIUS_METERS]
    );

    const bufferExpression = this.db.raw(
      'ST_AsGeoJSON(ST_Transform(ST_Buffer(ST_Transform(s.location, 3857), COALESCE(?, NULLIF(s.coverage_radius_meters, 0), ?)), 4326)) as "bufferGeoJson"',
      [radiusOverride, DEFAULT_STATION_COVERAGE_RADIUS_METERS]
    );

    const query = this.db('stations as s')
      .leftJoin(countsAlias, 'ic.stationId', 's.id')
      .select(['s.station_code as stationCode', 's.name as stationName', 's.is_active as isActive'])
      .select(this.db.raw('COALESCE(ic.total, 0) as "incidentCount"'))
      .select(radiusExpression)
      .select(this.db.raw('ST_AsGeoJSON(s.location)::json as "locationGeoJson"'))
      .select(bufferExpression)
      .orderBy('s.station_code', 'asc');

    if (typeof stationIsActive === 'boolean') {
      query.where('s.is_active', stationIsActive);
    }

    if (hasIncidentFilters(filters)) {
      query.whereRaw('COALESCE(ic.total, 0) > 0');
    }

    const rows = (await query) as StationCoverageRow[];

    return rows.map((row) => {
      const location = geometryToFeature(parseGeometry(row.locationGeoJson)) as GeoJsonPoint | null;
      if (!location) {
        throw new Error('Station location geometry is missing');
      }
      const coverage = geometryToFeature(parseGeometry(row.bufferGeoJson)) as GeoJsonPolygon | null;
      if (!coverage) {
        throw new Error('Station coverage geometry is missing');
      }

      const radius = Number(row.radiusMeters ?? DEFAULT_STATION_COVERAGE_RADIUS_METERS);

      return {
        stationCode: row.stationCode,
        stationName: row.stationName,
        isActive: row.isActive,
        radiusMeters:
          Number.isFinite(radius) && radius > 0 ? radius : DEFAULT_STATION_COVERAGE_RADIUS_METERS,
        incidentCount: coerceCount(row.incidentCount),
        location,
        coverage,
      } satisfies StationCoverageBuffer;
    });
  }
}

export const incidentRepository = new IncidentRepository();
