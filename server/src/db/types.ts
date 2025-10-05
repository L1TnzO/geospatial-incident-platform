import type { Feature, Point, Polygon, MultiPolygon } from 'geojson';

export type GeoJsonPoint = Feature<Point>;
export type GeoJsonMultiPolygon = Feature<MultiPolygon>;
export type GeoJsonPolygon = Feature<Polygon>;

export type IncidentSortField = 'reportedAt' | 'occurrenceAt' | 'severityPriority';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  sortBy: IncidentSortField;
  sortDirection: 'asc' | 'desc';
}

export interface IncidentLookupValue {
  code: string;
  name: string;
  description?: string | null;
}

export interface IncidentSeverity extends IncidentLookupValue {
  priority: number;
  colorHex: string;
}

export interface IncidentStatus extends IncidentLookupValue {
  isTerminal: boolean;
}

export type IncidentSource = IncidentLookupValue;

export type IncidentWeather = IncidentLookupValue;

export interface StationSummary {
  stationCode: string;
  name: string;
  battalion?: string | null;
  phone?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    region?: string | null;
    postalCode?: string | null;
  };
  isActive: boolean;
  commissionedOn?: string | null;
  decommissionedOn?: string | null;
  coverageRadiusMeters?: number | null;
  location: GeoJsonPoint;
  responseZone?: {
    zoneCode: string;
    name: string;
    boundary: GeoJsonMultiPolygon;
  } | null;
}

export interface IncidentListItem {
  incidentNumber: string;
  externalReference?: string | null;
  title: string;
  occurrenceAt: string;
  reportedAt: string;
  dispatchAt?: string | null;
  arrivalAt?: string | null;
  resolvedAt?: string | null;
  isActive: boolean;
  casualtyCount: number;
  responderInjuries: number;
  estimatedDamageAmount?: string | null;
  location: GeoJsonPoint;
  locationGeohash?: string | null;
  type: IncidentLookupValue;
  severity: IncidentSeverity;
  status: IncidentStatus;
  source?: IncidentSource | null;
  weather?: IncidentWeather | null;
  primaryStation?: {
    stationCode: string;
    name: string;
  } | null;
}

export interface IncidentUnit {
  stationCode: string;
  stationName: string;
  assignmentRole?: string | null;
  dispatchedAt?: string | null;
  clearedAt?: string | null;
}

export interface IncidentAsset {
  assetIdentifier: string;
  assetType: string;
  status?: string | null;
  notes?: string | null;
}

export interface IncidentNote {
  author: string;
  note: string;
  createdAt: string;
}

export interface IncidentDetail extends IncidentListItem {
  narrative?: string | null;
  metadata: Record<string, unknown>;
  units: IncidentUnit[];
  assets: IncidentAsset[];
  notes: IncidentNote[];
}

export interface PaginatedResult<T> extends PaginationMeta {
  data: T[];
}

export interface IncidentMetadata {
  types: IncidentLookupValue[];
  severities: IncidentSeverity[];
  statuses: IncidentStatus[];
  occurrenceRange: {
    start: string | null;
    end: string | null;
  };
  reportedRange: {
    start: string | null;
    end: string | null;
  };
  activeCount: number;
  limits: {
    maxPageSize: number;
    maxTotalResults: number;
  };
}

export interface IncidentSearchResult {
  incidentNumber: string;
  title: string;
  occurrenceAt: string;
  reportedAt: string;
  isActive: boolean;
  location: GeoJsonPoint;
  severity: IncidentSeverity;
  status: IncidentStatus;
  type: IncidentLookupValue;
}

export interface IncidentTypeBucket {
  type: IncidentLookupValue;
  count: number;
}

export interface IncidentDailyCount {
  date: string;
  count: number;
}

export interface IncidentSeverityBucket {
  severity: IncidentSeverity;
  count: number;
}

export interface RecentIncidentSummary {
  incidentNumber: string;
  title: string;
  occurrenceAt: string;
  reportedAt: string;
  isActive: boolean;
  location: GeoJsonPoint;
  severity: IncidentSeverity;
  status: IncidentStatus;
  type: IncidentLookupValue;
  primaryStation?: {
    stationCode: string;
    name: string;
  } | null;
}
