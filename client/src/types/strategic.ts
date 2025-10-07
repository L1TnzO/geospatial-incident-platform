import type { Feature, Polygon } from 'geojson';
import type { IncidentLookupValue } from '@/types/incidents';

export interface StrategicMonthlyTrendPoint {
  month: string;
  label: string;
  start: string;
  end: string;
  count: number;
  previousMonthCount: number | null;
  monthOverMonthDelta: number | null;
  monthOverMonthPercentage: number | null;
  previousYearCount: number | null;
  yearOverYearDelta: number | null;
  yearOverYearPercentage: number | null;
}

export interface StrategicMonthlyTrendResponse {
  range: {
    start: string;
    end: string;
    months: number;
  };
  series: StrategicMonthlyTrendPoint[];
  totals: {
    currentPeriodTotal: number;
    previousPeriodTotal: number | null;
    periodDelta: number | null;
    periodPercentage: number | null;
  };
}

export interface StrategicQuarterlyTrendPoint {
  year: number;
  quarter: number;
  label: string;
  start: string;
  end: string;
  count: number;
  previousQuarterCount: number | null;
  quarterOverQuarterDelta: number | null;
  quarterOverQuarterPercentage: number | null;
  previousYearCount: number | null;
  yearOverYearDelta: number | null;
  yearOverYearPercentage: number | null;
}

export interface StrategicQuarterlyTrendResponse {
  range: {
    start: string;
    end: string;
    quarters: number;
  };
  series: StrategicQuarterlyTrendPoint[];
  summary: {
    current: StrategicQuarterlyTrendPoint | null;
    previous: StrategicQuarterlyTrendPoint | null;
    delta: number | null;
    percentage: number | null;
    yearOverYearReference: StrategicQuarterlyTrendPoint | null;
    yearOverYearDelta: number | null;
    yearOverYearPercentage: number | null;
  };
}

export interface StrategicTypeTimelinePoint {
  month: string;
  start: string;
  end: string;
  count: number;
}

export interface StrategicTypeTimelineSeries {
  type: IncidentLookupValue;
  total: number;
  points: StrategicTypeTimelinePoint[];
}

export interface StrategicTypeTimelineResponse {
  range: {
    start: string;
    end: string;
    months: number;
  };
  totalsByMonth: Array<{
    month: string;
    start: string;
    end: string;
    count: number;
  }>;
  types: StrategicTypeTimelineSeries[];
}

export interface StrategicHotspotCell {
  cellId: string;
  geometry: Feature<Polygon>;
  centroid: {
    latitude: number;
    longitude: number;
  };
  incidentCount: number;
  intensity: number;
}

export interface StrategicHotspotResponse {
  metadata: {
    resolution: number;
    cellSizeMeters: number;
    cellAreaSquareMeters: number;
    totalIncidents: number;
    maxIncidentCount: number;
    cellCount: number;
    generatedAt: string;
  };
  cells: StrategicHotspotCell[];
}

export interface StrategicCoverageStation {
  station: {
    code: string;
    name: string | null;
  };
  coverageRadiusMeters: number;
  lastUpdated: string | null;
  isActive: boolean;
  geometry: Feature<Polygon>;
  centroid: {
    latitude: number;
    longitude: number;
  };
  incidentCount?: number;
  colorHex?: string | null;
}

export interface StrategicCoverageResponse {
  metadata: {
    totalStations: number;
    activeStations: number;
    generatedAt: string;
    filtersSummary?: string;
    radiusOverrideMeters?: number | null;
    defaultRadiusMeters?: number;
    defaultColorHex?: string | null;
  };
  stations: StrategicCoverageStation[];
}

export type StrategicGroupBy = 'station' | 'grid';

interface StrategicResponseMetricBase {
  groupType: StrategicGroupBy;
  sampleSize: number;
  averageSeconds: number;
  medianSeconds: number;
  p90Seconds: number;
  normalizedAverage: number;
  percentileRank: number;
  insufficientSample: boolean;
}

export interface StrategicResponseMetricStationGroup extends StrategicResponseMetricBase {
  groupType: 'station';
  station: {
    code: string;
    name: string | null;
  };
}

export interface StrategicResponseMetricGridGroup extends StrategicResponseMetricBase {
  groupType: 'grid';
  cell: {
    cellId: string;
    geometry: Feature<Polygon>;
    centroid: {
      latitude: number;
      longitude: number;
    };
  };
}

export type StrategicResponseMetricGroup =
  | StrategicResponseMetricStationGroup
  | StrategicResponseMetricGridGroup;

export interface StrategicResponseMetricsResponse {
  metadata: {
    groupBy: StrategicGroupBy;
    sampleThreshold: number;
    totalGroups: number;
    minAverageSeconds: number | null;
    maxAverageSeconds: number | null;
    resolution?: number;
    cellSizeMeters?: number;
    generatedAt: string;
  };
  groups: StrategicResponseMetricGroup[];
}

interface StrategicPriorityScoreBase {
  groupType: StrategicGroupBy;
  totalIncidents: number;
  rawScore: number;
  normalizedScore: number;
  percentileRank: number;
  weightSum: number;
  averageSeverity: number;
}

export interface StrategicPriorityScoreStationGroup extends StrategicPriorityScoreBase {
  groupType: 'station';
  station: {
    code: string;
    name: string | null;
  };
}

export interface StrategicPriorityScoreGridGroup extends StrategicPriorityScoreBase {
  groupType: 'grid';
  cell: {
    cellId: string;
    geometry: Feature<Polygon>;
    centroid: {
      latitude: number;
      longitude: number;
    };
  };
}

export type StrategicPriorityScoreGroup =
  | StrategicPriorityScoreStationGroup
  | StrategicPriorityScoreGridGroup;

export interface StrategicPriorityScoreResponse {
  metadata: {
    groupBy: StrategicGroupBy;
    totalGroups: number;
    minRawScore: number | null;
    maxRawScore: number | null;
    decayHalfLifeDays: number | null;
    resolution?: number;
    cellSizeMeters?: number;
    generatedAt: string;
  };
  groups: StrategicPriorityScoreGroup[];
}
