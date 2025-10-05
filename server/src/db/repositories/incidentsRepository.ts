import type { Knex } from 'knex';
import { Readable, Transform, type TransformCallback } from 'stream';
import { getDb } from '../client';
import {
  type GeoJsonPoint,
  type IncidentDailyCount,
  type IncidentDetail,
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
} from '../types';
import { geometryToFeature, parseGeometry, parseJsonColumn } from '../utils';

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
}

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

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
  constructor(private readonly db: Knex = getDb()) {}

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

    const totalRow = await baseQuery
      .clone()
      .clearSelect()
      .clearOrder()
      .countDistinct<{ total: string }[]>('i.id as total');

    const total = Number(totalRow[0]?.total ?? 0);

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

  public async countIncidents(filters: IncidentListFilters = {}): Promise<number> {
    const query = this.db('incidents as i')
      .leftJoin('incident_types as it', 'i.type_id', 'it.id')
      .leftJoin('incident_severities as isv', 'i.severity_id', 'isv.id')
      .leftJoin('incident_statuses as ist', 'i.status_id', 'ist.id');

    applyFilters(query, filters);

    const result = await query
      .clone()
      .clearSelect()
      .clearOrder()
      .countDistinct<{ total: string }>('i.id as total')
      .first();

    return Number(result?.total ?? 0);
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
      transform(chunk: IncidentRowBase, _encoding, callback: TransformCallback) {
        try {
          const item = mapIncidentRow(chunk);
          callback(null, item);
        } catch (error) {
          const normalizedError = error instanceof Error ? error : new Error(String(error));
          callback(normalizedError);
        }
      },
    });

    rawStream.on('error', (error) => {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      mapper.destroy(normalizedError);
    });

    return rawStream.pipe(mapper);
  }

  public async createIncident(input: CreateIncidentInput): Promise<IncidentDetail> {
    const incidentNumber = input.incidentNumber;

    const insertedIncidentNumber = await this.db.transaction(async (trx) => {
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

    const query = this.db('incidents as i');
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
      .leftJoin('incident_severities as isv', 'i.severity_id', 'isv.id')
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
}

export const incidentRepository = new IncidentRepository();
