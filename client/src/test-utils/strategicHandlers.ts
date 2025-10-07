import { HttpResponse, http } from 'msw';
import type {
  StrategicCoverageResponse,
  StrategicHotspotResponse,
  StrategicMonthlyTrendResponse,
  StrategicPriorityScoreResponse,
  StrategicQuarterlyTrendResponse,
  StrategicResponseMetricsResponse,
  StrategicTypeTimelinePoint,
  StrategicTypeTimelineResponse,
} from '@/types/strategic';

export const defaultStrategicMocks = {
  monthly: {
    range: { start: '2024-01-01T00:00:00Z', end: '2024-12-31T23:59:59Z', months: 12 },
    series: [
      {
        month: '2024-01',
        label: 'Jan 2024',
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-31T23:59:59Z',
        count: 120,
        previousMonthCount: null,
        monthOverMonthDelta: null,
        monthOverMonthPercentage: null,
        previousYearCount: 100,
        yearOverYearDelta: 20,
        yearOverYearPercentage: 20,
      },
      {
        month: '2024-02',
        label: 'Feb 2024',
        start: '2024-02-01T00:00:00Z',
        end: '2024-02-29T23:59:59Z',
        count: 150,
        previousMonthCount: 120,
        monthOverMonthDelta: 30,
        monthOverMonthPercentage: 25,
        previousYearCount: 110,
        yearOverYearDelta: 40,
        yearOverYearPercentage: 36.36,
      },
    ],
    totals: {
      currentPeriodTotal: 270,
      previousPeriodTotal: 210,
      periodDelta: 60,
      periodPercentage: 28.57,
    },
  } satisfies StrategicMonthlyTrendResponse,
  quarterly: {
    range: { start: '2023-04-01T00:00:00Z', end: '2024-03-31T23:59:59Z', quarters: 4 },
    series: [
      {
        year: 2023,
        quarter: 4,
        label: 'Q4 2023',
        start: '2023-10-01T00:00:00Z',
        end: '2023-12-31T23:59:59Z',
        count: 300,
        previousQuarterCount: 280,
        quarterOverQuarterDelta: 20,
        quarterOverQuarterPercentage: 7.14,
        previousYearCount: 260,
        yearOverYearDelta: 40,
        yearOverYearPercentage: 15.38,
      },
      {
        year: 2024,
        quarter: 1,
        label: 'Q1 2024',
        start: '2024-01-01T00:00:00Z',
        end: '2024-03-31T23:59:59Z',
        count: 320,
        previousQuarterCount: 300,
        quarterOverQuarterDelta: 20,
        quarterOverQuarterPercentage: 6.67,
        previousYearCount: 280,
        yearOverYearDelta: 40,
        yearOverYearPercentage: 14.29,
      },
    ],
    summary: {
      current: null,
      previous: null,
      delta: null,
      percentage: null,
      yearOverYearReference: null,
      yearOverYearDelta: null,
      yearOverYearPercentage: null,
    },
  } satisfies StrategicQuarterlyTrendResponse,
  typeTimelines: {
    range: { start: '2024-01-01T00:00:00Z', end: '2024-12-31T23:59:59Z', months: 12 },
    totalsByMonth: [
      {
        month: '2024-01',
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-31T23:59:59Z',
        count: 120,
      },
      {
        month: '2024-02',
        start: '2024-02-01T00:00:00Z',
        end: '2024-02-29T23:59:59Z',
        count: 150,
      },
    ],
    types: [
      {
        type: { code: 'FIRE_STRUCTURE', name: 'Structure Fire', description: null },
        total: 200,
        points: [
          {
            month: '2024-01',
            start: '2024-01-01T00:00:00Z',
            end: '2024-01-31T23:59:59Z',
            count: 90,
          },
          {
            month: '2024-02',
            start: '2024-02-01T00:00:00Z',
            end: '2024-02-29T23:59:59Z',
            count: 110,
          },
        ],
      },
      {
        type: { code: 'RESCUE', name: 'Rescue', description: null },
        total: 70,
        points: [
          {
            month: '2024-01',
            start: '2024-01-01T00:00:00Z',
            end: '2024-01-31T23:59:59Z',
            count: 30,
          },
          {
            month: '2024-02',
            start: '2024-02-01T00:00:00Z',
            end: '2024-02-29T23:59:59Z',
            count: 40,
          },
        ],
      },
    ],
  } satisfies StrategicTypeTimelineResponse,
  hotspots: {
    metadata: {
      resolution: 4,
      cellSizeMeters: 500,
      cellAreaSquareMeters: 250000,
      totalIncidents: 15,
      maxIncidentCount: 5,
      cellCount: 3,
      generatedAt: '2024-12-31T23:59:59Z',
    },
    cells: [
      {
        cellId: 'cell-1',
        geometry: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-122.41, 37.79],
                [-122.4, 37.79],
                [-122.4, 37.78],
                [-122.41, 37.78],
                [-122.41, 37.79],
              ],
            ],
          },
        },
        centroid: { latitude: 37.785, longitude: -122.405 },
        incidentCount: 5,
        intensity: 1,
      },
    ],
  } satisfies StrategicHotspotResponse,
  coverage: {
    metadata: {
      totalStations: 2,
      activeStations: 2,
      generatedAt: '2024-12-31T23:59:59Z',
      defaultColorHex: null,
    },
    stations: [
      {
        station: { code: 'ST-101', name: 'Station 101' },
        coverageRadiusMeters: 4800,
        lastUpdated: '2024-12-31T21:00:00Z',
        isActive: true,
        geometry: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-122.42, 37.78],
                [-122.41, 37.78],
                [-122.41, 37.77],
                [-122.42, 37.77],
                [-122.42, 37.78],
              ],
            ],
          },
        },
        centroid: { latitude: 37.775, longitude: -122.415 },
        colorHex: '#2563eb',
      },
      {
        station: { code: 'ST-202', name: 'Station 202' },
        coverageRadiusMeters: 5200,
        lastUpdated: '2024-12-30T16:30:00Z',
        isActive: true,
        geometry: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-122.39, 37.79],
                [-122.38, 37.79],
                [-122.38, 37.78],
                [-122.39, 37.78],
                [-122.39, 37.79],
              ],
            ],
          },
        },
        centroid: { latitude: 37.785, longitude: -122.385 },
        colorHex: '#f97316',
      },
    ],
  } satisfies StrategicCoverageResponse,
  responseMetrics: {
    metadata: {
      groupBy: 'station',
      sampleThreshold: 3,
      totalGroups: 2,
      minAverageSeconds: 240,
      maxAverageSeconds: 480,
      generatedAt: '2024-12-31T23:59:59Z',
    },
    groups: [
      {
        groupType: 'station',
        station: {
          code: 'ST-101',
          name: 'Station 101',
          location: { latitude: 37.775, longitude: -122.41 },
        },
        sampleSize: 12,
        averageSeconds: 260,
        medianSeconds: 250,
        p90Seconds: 410,
        normalizedAverage: 1,
        percentileRank: 1,
        insufficientSample: false,
      },
      {
        groupType: 'station',
        station: {
          code: 'ST-102',
          name: 'Station 102',
          location: { latitude: 37.785, longitude: -122.39 },
        },
        sampleSize: 4,
        averageSeconds: 420,
        medianSeconds: 430,
        p90Seconds: 600,
        normalizedAverage: 0,
        percentileRank: 0,
        insufficientSample: false,
      },
    ],
  } satisfies StrategicResponseMetricsResponse,
  priorityScores: {
    metadata: {
      groupBy: 'station',
      totalGroups: 2,
      minRawScore: 12,
      maxRawScore: 48,
      decayHalfLifeDays: 30,
      generatedAt: '2024-12-31T23:59:59Z',
    },
    groups: [
      {
        groupType: 'station',
        station: { code: 'ST-101', name: 'Station 101' },
        totalIncidents: 24,
        rawScore: 48,
        normalizedScore: 1,
        percentileRank: 1,
        weightSum: 24,
        averageSeverity: 3.5,
      },
      {
        groupType: 'station',
        station: { code: 'ST-102', name: 'Station 102' },
        totalIncidents: 18,
        rawScore: 12,
        normalizedScore: 0,
        percentileRank: 0,
        weightSum: 18,
        averageSeverity: 1.8,
      },
    ],
  } satisfies StrategicPriorityScoreResponse,
};

type StrategicHandlersOptions = {
  monthly?: StrategicMonthlyTrendResponse;
  quarterly?: StrategicQuarterlyTrendResponse;
  typeTimelines?: StrategicTypeTimelineResponse;
  hotspots?: StrategicHotspotResponse;
  responseMetrics?: StrategicResponseMetricsResponse;
  priorityScores?: StrategicPriorityScoreResponse;
  coverage?: StrategicCoverageResponse;
  onMonthlyRequest?: (url: string) => void;
  onQuarterlyRequest?: (url: string) => void;
  onTypeTimelinesRequest?: (url: string) => void;
  onHotspotsRequest?: (url: string) => void;
  onResponseMetricsRequest?: (url: string) => void;
  onPriorityScoresRequest?: (url: string) => void;
  onCoverageRequest?: (url: string) => void;
};

type StrategicErrorOptions = {
  status?: number;
  message?: string;
  coverage?: StrategicCoverageResponse;
};

export const createStrategicHandlers = (options: StrategicHandlersOptions = {}) => {
  const {
    monthly = defaultStrategicMocks.monthly,
    quarterly = defaultStrategicMocks.quarterly,
    typeTimelines = defaultStrategicMocks.typeTimelines,
    hotspots = defaultStrategicMocks.hotspots,
    onMonthlyRequest,
    onQuarterlyRequest,
    onTypeTimelinesRequest,
    onHotspotsRequest,
    responseMetrics = defaultStrategicMocks.responseMetrics,
    priorityScores = defaultStrategicMocks.priorityScores,
    onResponseMetricsRequest,
    onPriorityScoresRequest,
    coverage = defaultStrategicMocks.coverage,
    onCoverageRequest,
  } = options;

  return [
    http.get('*/api/strategic/trends/monthly', ({ request }) => {
      onMonthlyRequest?.(request.url);
      const url = new URL(request.url);
      const monthsParam = url.searchParams.get('months');
      if (!monthsParam) {
        return HttpResponse.json(monthly);
      }

      const months = Number(monthsParam);
      if (Number.isNaN(months) || months <= 0) {
        return HttpResponse.json(monthly);
      }

      const sliceCount = Math.min(months, monthly.series.length);
      const responseBody: StrategicMonthlyTrendResponse = {
        ...monthly,
        range: { ...monthly.range, months },
        series: monthly.series.slice(-sliceCount),
      };

      return HttpResponse.json(responseBody);
    }),
    http.get('*/api/strategic/trends/quarters', ({ request }) => {
      onQuarterlyRequest?.(request.url);
      const url = new URL(request.url);
      const quartersParam = url.searchParams.get('quarters');

      if (!quartersParam) {
        return HttpResponse.json(quarterly);
      }

      const quarters = Number(quartersParam);
      if (Number.isNaN(quarters) || quarters <= 0) {
        return HttpResponse.json(quarterly);
      }

      const sliceCount = Math.min(quarters, quarterly.series.length);
      const slicedSeries = quarterly.series.slice(-sliceCount);

      const responseBody: StrategicQuarterlyTrendResponse = {
        ...quarterly,
        range: { ...quarterly.range, quarters },
        series: slicedSeries,
      };

      return HttpResponse.json(responseBody);
    }),
    http.get('*/api/strategic/trends/types', ({ request }) => {
      onTypeTimelinesRequest?.(request.url);
      const url = new URL(request.url);
      const monthsParam = url.searchParams.get('months');
      if (!monthsParam) {
        return HttpResponse.json(typeTimelines);
      }

      const months = Number(monthsParam);
      if (Number.isNaN(months) || months <= 0) {
        return HttpResponse.json(typeTimelines);
      }

      const trimPoints = <T extends StrategicTypeTimelinePoint>(points: T[]): T[] => {
        const sliceCount = Math.min(months, points.length);
        return points.slice(-sliceCount);
      };

      const trimmedTotals = trimPoints(typeTimelines.totalsByMonth);
      const trimmedTypes = typeTimelines.types.map((series) => {
        const trimmedPoints = trimPoints(series.points);
        const total = trimmedPoints.reduce((sum, point) => sum + point.count, 0);
        return {
          ...series,
          points: trimmedPoints,
          total,
        };
      });

      return HttpResponse.json({
        ...typeTimelines,
        range: { ...typeTimelines.range, months },
        totalsByMonth: trimmedTotals,
        types: trimmedTypes,
      });
    }),
    http.get('*/api/strategic/hotspots', ({ request }) => {
      onHotspotsRequest?.(request.url);
      return HttpResponse.json(hotspots);
    }),
    http.get('*/api/strategic/coverage-buffers', ({ request }) => {
      onCoverageRequest?.(request.url);
      return HttpResponse.json(coverage);
    }),
    http.get('*/api/strategic/response-metrics', ({ request }) => {
      onResponseMetricsRequest?.(request.url);
      return HttpResponse.json(responseMetrics);
    }),
    http.get('*/api/strategic/priority-scores', ({ request }) => {
      onPriorityScoresRequest?.(request.url);
      return HttpResponse.json(priorityScores);
    }),
  ];
};

export const createStrategicErrorHandlers = (options: StrategicErrorOptions = {}) => {
  const { status = 500, message = 'Strategic analytics request failed' } = options;
  const failure = () => HttpResponse.text(message, { status });

  return [
    http.get('*/api/strategic/trends/monthly', failure),
    http.get('*/api/strategic/trends/quarters', failure),
    http.get('*/api/strategic/trends/types', failure),
    http.get('*/api/strategic/hotspots', failure),
    http.get('*/api/strategic/coverage-buffers', failure),
    http.get('*/api/strategic/response-metrics', failure),
    http.get('*/api/strategic/priority-scores', failure),
  ];
};
