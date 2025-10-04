import type {
  GeoJsonPoint,
  IncidentLookupValue,
  IncidentSeverity,
  IncidentStatus,
} from '@/types/incidents';

export interface DashboardLast24HoursKpi {
  window: {
    start: string;
    end: string;
  };
  previousWindow: {
    start: string;
    end: string;
  };
  currentCount: number;
  previousCount: number;
  delta: number;
  deltaPercentage: number | null;
}

export interface DashboardTypeDistributionBucket {
  type: IncidentLookupValue;
  count: number;
  percentage: number;
}

export interface DashboardTypeDistribution {
  total: number;
  buckets: DashboardTypeDistributionBucket[];
}

export interface DashboardDailyTrendPoint {
  date: string;
  count: number;
}

export interface DashboardDailyTrendSummary {
  currentTotal: number;
  previousTotal: number;
  change: number;
  percentageChange: number | null;
  direction: 'up' | 'down' | 'flat';
}

export interface DashboardDailyTrend {
  points: DashboardDailyTrendPoint[];
  trend: DashboardDailyTrendSummary;
}

export interface DashboardSeverityDistributionBucket {
  severity: IncidentSeverity;
  count: number;
  percentage: number;
}

export interface DashboardSeverityDistribution {
  total: number;
  buckets: DashboardSeverityDistributionBucket[];
}

export interface DashboardRecentIncident {
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

export interface DashboardFilterParams {
  typeCodes?: string[];
  severityCodes?: string[];
  statusCodes?: string[];
  startDate?: string;
  endDate?: string;
  incidentNumber?: string;
  isActive?: boolean;
}
