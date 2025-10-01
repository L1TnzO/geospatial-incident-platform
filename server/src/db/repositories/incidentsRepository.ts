import type { Knex } from 'knex';
import { getDb } from '../client';
import {
  type GeoJsonPoint,
  type IncidentDetail,
  type IncidentListItem,
  type IncidentLookupValue,
  type IncidentSeverity,
  type IncidentStatus,
  type IncidentSource,
  type IncidentWeather,
  type PaginatedResult,
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

export class IncidentRepository {
  constructor(private readonly db: Knex = getDb()) {}

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
      .orderBy('i.reported_at', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)) as IncidentRowBase[];

    const data = rows.map((row) => mapIncidentRow(row));

    return {
      data,
      page,
      pageSize,
      total,
    };
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
}

export const incidentRepository = new IncidentRepository();
