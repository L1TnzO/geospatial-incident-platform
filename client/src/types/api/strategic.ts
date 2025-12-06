// Strategic Analytics API Types
// Aligned with /api/strategic/* endpoints documented in docs/api/strategic.md

import type { DashboardFilterParams } from './dashboard';

// ============================================================================
// Shared Types
// ============================================================================

export interface IncidentTypeRef {
  code: string;
  name: string;
}

export interface StationRef {
  code: string;
  name: string;
}

export interface GeometryPoint {
  latitude: number;
  longitude: number;
}

// ============================================================================
// Request Parameters
// ============================================================================

export interface StrategicFilterParams extends DashboardFilterParams {
  refresh?: boolean;
}

export interface MonthlyTrendsParams extends StrategicFilterParams {
  months?: number; // 3-36, default 12
}

export interface QuarterlyTrendsParams extends StrategicFilterParams {
  quarters?: number; // 2-12, default 8
}

export interface TypeTimelinesParams extends StrategicFilterParams {
  months?: number; // 3-24, default 12
}

export interface HotspotsParams extends StrategicFilterParams {
  resolution?: number; // 1-8, default 4
}

export interface CoverageBuffersParams extends StrategicFilterParams {
  radiusMeters?: number; // 100-50000
  stationIsActive?: boolean;
}

export interface ResponseMetricsParams extends StrategicFilterParams {
  groupBy?: 'station' | 'grid' | 'zone'; // default 'station'
  resolution?: number; // 1-8, default 4 (for grid grouping)
}

export interface PriorityScoresParams extends StrategicFilterParams {
  groupBy?: 'station' | 'grid'; // default 'station'
  resolution?: number; // 1-8, default 4 (for grid grouping)
  decayHalfLifeDays?: number; // positive number
}

// ============================================================================
// Monthly Trends Response
// ============================================================================

export interface MonthlyTrendDataPoint {
  month: string; // ISO 8601 month (e.g., "2025-01")
  label: string; // Display label (e.g., "Jan 2025")
  start: string; // ISO 8601 timestamp
  end: string; // ISO 8601 timestamp
  count: number;
  previousMonthCount: number;
  monthOverMonthDelta: number;
  monthOverMonthPercentage: number;
  previousYearCount: number;
  yearOverYearDelta: number;
  yearOverYearPercentage: number;
}

export interface MonthlyTrendTotals {
  currentPeriodTotal: number;
  previousPeriodTotal: number;
  periodDelta: number;
  periodPercentage: number;
}

export interface StrategicMonthlyTrendResponse {
  range: {
    start: string; // ISO 8601 timestamp
    end: string; // ISO 8601 timestamp
    months: number;
  };
  series: MonthlyTrendDataPoint[];
  totals: MonthlyTrendTotals;
}

// ============================================================================
// Quarterly Trends Response
// ============================================================================

export interface QuarterlyTrendDataPoint {
  year: number;
  quarter: number; // 1-4
  label: string; // Display label (e.g., "Q1 2025")
  start: string; // ISO 8601 timestamp
  end: string; // ISO 8601 timestamp
  count: number;
  previousQuarterCount: number;
  quarterOverQuarterDelta: number;
  quarterOverQuarterPercentage: number;
  previousYearCount: number;
  yearOverYearDelta: number;
  yearOverYearPercentage: number;
}

export interface QuarterlyTrendSummary {
  current: {
    year: number;
    quarter: number;
    count: number;
  };
  previous: {
    year: number;
    quarter: number;
    count: number;
  };
  delta: number;
  percentage: number;
  yearOverYearReference: {
    year: number;
    quarter: number;
    count: number;
  };
  yearOverYearDelta: number;
  yearOverYearPercentage: number;
}

export interface StrategicQuarterlyTrendResponse {
  range: {
    start: string; // ISO 8601 timestamp
    end: string; // ISO 8601 timestamp
    quarters: number;
  };
  series: QuarterlyTrendDataPoint[];
  summary: QuarterlyTrendSummary;
}

// ============================================================================
// Type Timelines Response
// ============================================================================

export interface TypeTrendPoint {
  month: string; // ISO 8601 month
  count: number;
  start: string; // ISO 8601 timestamp
  end: string; // ISO 8601 timestamp
}

export interface TypeTimelineSeries {
  type: IncidentTypeRef;
  total: number;
  points: TypeTrendPoint[];
}

export interface TotalsByMonth {
  month: string; // ISO 8601 month
  count: number;
  start: string; // ISO 8601 timestamp
  end: string; // ISO 8601 timestamp
}

export interface StrategicTypeTimelineResponse {
  range: {
    start: string; // ISO 8601 timestamp
    end: string; // ISO 8601 timestamp
    months: number;
  };
  totalsByMonth: TotalsByMonth[];
  types: TypeTimelineSeries[];
}

// ============================================================================
// Hotspots Response
// ============================================================================

export interface HotspotCell {
  cellId: string;
  incidentCount: number;
  intensity: number; // 0-1, normalized to max cell count
  centroid: GeometryPoint;
  geometry: GeoJSON.Feature<GeoJSON.Polygon>;
}

export interface StrategicHotspotResponse {
  metadata: {
    resolution: number;
    cellSizeMeters: number;
    cellAreaSquareMeters: number;
    totalIncidents: number;
    maxIncidentCount: number;
    cellCount: number;
    generatedAt: string; // ISO 8601 timestamp
  };
  cells: HotspotCell[];
}

// ============================================================================
// Coverage Buffers Response
// ============================================================================

export interface CoverageBufferFeature {
  type: 'Feature';
  geometry: GeoJSON.Polygon;
  properties: {
    stationCode: string;
    stationName: string;
    isActive: boolean;
    radiusMeters: number;
    incidentCount: number;
    centroid: GeometryPoint;
  };
}

export interface StrategicCoverageResponse {
  type: 'FeatureCollection';
  features: CoverageBufferFeature[];
  metadata: {
    generatedAt: string; // ISO 8601 timestamp
    stationCount: number;
    filtersSummary: string;
    radiusOverrideMeters: number | null;
    defaultRadiusMeters: number;
  };
}

// ============================================================================
// Response Metrics Response
// ============================================================================

export interface ResponseMetricGroup {
  groupType: 'station' | 'grid' | 'zone';
  station?: StationRef; // Present when groupType === 'station'
  cell?: {
    // Present when groupType === 'grid'
    cellId: string;
    centroid: GeometryPoint;
    geometry: GeoJSON.Feature<GeoJSON.Polygon>;
  };
  zoneName?: string; // Present when groupType === 'zone'
  sampleSize: number;
  averageSeconds: number;
  medianSeconds: number;
  p90Seconds: number;
  normalizedAverage: number; // 0-1 range
  percentileRank: number; // 0-1 range
  insufficientSample: boolean;
}

export interface StrategicResponseMetricsResponse {
  metadata: {
    groupBy: 'station' | 'grid' | 'zone';
    sampleThreshold: number;
    totalGroups: number;
    minAverageSeconds: number;
    maxAverageSeconds: number;
    generatedAt: string; // ISO 8601 timestamp
    globalAverageSeconds: number | null;
    allTimeAverageSeconds: number | null;
  };
  groups: ResponseMetricGroup[];
}

// ============================================================================
// Priority Scores Response
// ============================================================================

export interface PriorityScoreGroup {
  groupType: 'station' | 'grid';
  station?: StationRef; // Present when groupType === 'station'
  cell?: {
    // Present when groupType === 'grid'
    cellId: string;
    centroid: GeometryPoint;
    geometry: GeoJSON.Feature<GeoJSON.Polygon>;
  };
  totalIncidents: number;
  rawScore: number;
  normalizedScore: number; // 0-1 range
  percentileRank: number; // 0-1 range
  weightSum: number;
  averageSeverity: number;
}

export interface StrategicPriorityScoreResponse {
  metadata: {
    groupBy: 'station' | 'grid';
    totalGroups: number;
    minRawScore: number;
    maxRawScore: number;
    decayHalfLifeDays?: number;
    generatedAt: string; // ISO 8601 timestamp
  };
  groups: PriorityScoreGroup[];
}

export interface StrategicTimeOfDayResponse {
  morning: number;
  afternoon: number;
  night: number;
  total: number;
}

export interface StrategicZoneFrequencyResponse {
  zones: {
    name: string;
    count: number;
    percentage: number;
  }[];
  total: number;
}

export interface StrategicStationVolumeResponse {
  stations: {
    stationCode: string;
    stationName: string;
    count: number;
    percentage: number;
  }[];
  total: number;
}

export interface StrategicIncidentProjectionResponse {
  periods: {
    label: string;
    months: number;
    projectedCount: number;
  }[];
  metadata: {
    baseStart: string;
    baseEnd: string;
    totalMonths: number;
    trendSlope: number;
    trendIntercept: number;
    seasonalityDetected: boolean;
    generatedAt: string;
  };
}

export interface StrategicDistrictFrequentIncidentsResponse {
  items: {
    district: string;
    mostFrequentType: string;
    count: number;
    percentage: number;
  }[];
}
