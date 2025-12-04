import type { Feature, Point } from 'geojson';

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

export type GeoJsonPoint = Feature<Point>;

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
  deletedAt?: string | null;
}

export interface IncidentListResponse {
  data: IncidentListItem[];
  pagination: PaginationMeta;
}

export interface IncidentMapListItem {
  incidentNumber: string;
  title: string;
  occurrenceAt: string;
  reportedAt: string;
  isActive: boolean;
  location: GeoJsonPoint;
  type: Pick<IncidentLookupValue, 'code' | 'name'>;
  severity: Pick<IncidentSeverity, 'code' | 'name' | 'colorHex'>;
  status: Pick<IncidentStatus, 'code' | 'name'>;
  primaryStation?: {
    stationCode: string;
    name: string;
  } | null;
}

export interface IncidentMapListResponse {
  data: IncidentMapListItem[];
  pagination: PaginationMeta;
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

export interface IncidentCreateRequest {
  incidentNumber: string;
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
  casualtyCount?: number;
  responderInjuries?: number;
  estimatedDamageAmount?: number;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  externalReference?: string | null;
  location: {
    latitude: number;
    longitude: number;
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

export interface IncidentSyncStatus {
  lastModified: string;
  count: number;
}
