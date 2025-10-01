import type { Feature, Point, MultiPolygon } from 'geojson';

export type GeoJsonPoint = Feature<Point>;
export type GeoJsonMultiPolygon = Feature<MultiPolygon>;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
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
