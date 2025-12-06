import type {
  GeoJsonPoint,
  IncidentLookupValue,
  IncidentSeverity,
  IncidentStatus,
} from './incidents';

// Request interfaces
export interface DashboardFilterParams extends Record<string, unknown> {
  typeCodes?: string[];
  severityCodes?: string[];
  statusCodes?: string[];
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  refresh?: boolean;
  compare?: 'previous' | 'year';
}

export interface DashboardRecentIncidentsParams extends DashboardFilterParams {
  limit?: number;
}

export interface DashboardExportParams extends DashboardFilterParams {
  includeColumns?: string[];
  limit?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

// Response interfaces
export interface TimeWindow {
  start: string;
  end: string;
}

export interface Last24HoursKpiResponse {
  window: TimeWindow;
  previousWindow: TimeWindow;
  currentCount: number;
  previousCount: number;
  delta: number;
  deltaPercentage: number | null;
}

export interface TypeDistributionBucket {
  type: IncidentLookupValue;
  count: number;
  percentage: number;
}

export interface TypeDistributionResponse {
  total: number;
  buckets: TypeDistributionBucket[];
}

export interface SeverityDistributionBucket {
  severity: IncidentSeverity;
  count: number;
  percentage: number;
}

export interface SeverityDistributionResponse {
  total: number;
  buckets: SeverityDistributionBucket[];
}

export interface DailyTrendPoint {
  date: string;
  count: number;
}

export interface DailyTrendSummary {
  currentTotal: number;
  previousTotal: number;
  change: number;
  percentageChange: number;
  direction: 'up' | 'down' | 'flat';
}

export interface DailyTrendResponse {
  points: DailyTrendPoint[];
  previousPoints?: DailyTrendPoint[];
  trend: DailyTrendSummary;
}

export interface RecentIncident {
  incidentNumber: string;
  title: string;
  reportedAt: string;
  occurrenceAt: string;
  isActive: boolean;
  severity: IncidentSeverity;
  status: IncidentStatus;
  type: IncidentLookupValue;
  primaryStation: {
    stationCode: string;
    name: string;
  } | null;
  location: GeoJsonPoint;
}

export type RecentIncidentsResponse = RecentIncident[];

export interface DashboardExportOptions {
  filename?: string;
  onProgress?: (loaded: number, total: number) => void;
}

export interface DashboardExportResult {
  filename: string;
  blobUrl: string;
  totalRecords: number;
}
