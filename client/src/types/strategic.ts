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
