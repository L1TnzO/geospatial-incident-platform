import {
  StrategicAnalyticsService,
  type HotspotResponse,
  type ResponseMetricStationGroup,
  type PriorityScoreStationGroup,
} from '../../src/services/strategicService';
import type { IncidentFilterOptions } from '../../src/services/incidentsService';
import type { IncidentLookupValue, StationCoverageBuffer } from '../../src/db';
import { HttpError } from '../../src/errors/httpError';

const createService = (
  overrides: {
    repository?: Partial<{
      getIncidentCountsByReportedMonth: jest.Mock;
      getIncidentCountsByReportedQuarter: jest.Mock;
      getIncidentTypeTimeline: jest.Mock;
      getIncidentHotspotAggregates: jest.Mock;
      getResponseTimeMetrics: jest.Mock;
      getPriorityScores: jest.Mock;
      getStationCoverageBuffers: jest.Mock;
      getIncidentCountsByReportedHour: jest.Mock;
      getIncidentCountsByReportedDay: jest.Mock;
      countIncidentsByReportedRange: jest.Mock;
      getIncidentCountsByHourOfDay: jest.Mock;
      getZoneFrequency: jest.Mock;
      getStationIncidentCounts: jest.Mock;
      getIncidentMetadata: jest.Mock;
      getMostFrequentIncidentTypesByDistrict: jest.Mock;
    }>;
    incidentSvc?: Partial<{
      buildFilterOptions: jest.Mock;
    }>;
  } = {}
) => {
  const defaultFilters: IncidentFilterOptions = {};
  const repository = {
    getIncidentCountsByReportedMonth: jest.fn().mockResolvedValue([]),
    getIncidentCountsByReportedQuarter: jest.fn().mockResolvedValue([]),
    getIncidentTypeTimeline: jest.fn().mockResolvedValue([]),
    getIncidentHotspotAggregates: jest.fn().mockResolvedValue([]),
    getResponseTimeMetrics: jest.fn().mockResolvedValue([]),
    getPriorityScores: jest.fn().mockResolvedValue([]),
    getStationCoverageBuffers: jest.fn().mockResolvedValue([]),
    getIncidentCountsByReportedHour: jest.fn().mockResolvedValue([]),
    getIncidentCountsByReportedDay: jest.fn().mockResolvedValue([]),
    countIncidentsByReportedRange: jest.fn().mockResolvedValue(0),
    getIncidentCountsByHourOfDay: jest.fn().mockResolvedValue([]),
    getZoneFrequency: jest.fn().mockResolvedValue([]),
    getStationIncidentCounts: jest.fn().mockResolvedValue([]),
    getIncidentMetadata: jest.fn().mockResolvedValue({ reportedRange: {} }),
    getMostFrequentIncidentTypesByDistrict: jest.fn().mockResolvedValue([]),
    ...(overrides.repository ?? {}),
  };

  const incidentSvc = {
    buildFilterOptions: jest.fn().mockReturnValue(defaultFilters),
    ...(overrides.incidentSvc ?? {}),
  };

  const service = new StrategicAnalyticsService(repository as never, incidentSvc as never);
  return { service, repository, incidentSvc, defaultFilters };
};

const assertHotspotResponse: (value: unknown) => asserts value is HotspotResponse = (
  value: unknown
) => {
  if (!value || typeof value !== 'object') {
    throw new Error('Hotspot response must be an object');
  }
  const candidate = value as { metadata?: unknown; cells?: unknown };
  if (typeof candidate.metadata !== 'object' || !Array.isArray(candidate.cells)) {
    throw new Error('Hotspot response is missing metadata or cells');
  }
};

describe('StrategicAnalyticsService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-15T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Existing tests ...
  it('rejects invalid months window', async () => {
    const { service } = createService();
    await expect(service.getMonthlyTrend({ months: '0' })).rejects.toThrow(HttpError);
  });

  it('computes monthly delta scores using repository data', async () => {
    const rows = [
      { periodStart: '2024-12-01T00:00:00.000Z', count: 10 },
      { periodStart: '2025-01-01T00:00:00.000Z', count: 15 },
      { periodStart: '2024-01-01T00:00:00.000Z', count: 5 },
    ];
    const { service, repository } = createService({
      repository: {
        getIncidentCountsByReportedMonth: jest.fn().mockResolvedValue(rows),
      },
    });

    const result = await service.getMonthlyTrend({ months: '3' });

    expect(repository.getIncidentCountsByReportedMonth).toHaveBeenCalled();
    expect(result.series.length).toBeGreaterThan(0);
    const january = result.series.find((point) => point.month === '2025-01');
    expect(january?.count).toBe(15);
    expect(january?.previousMonthCount).toBe(10);
    expect(january?.monthOverMonthDelta).toBe(5);
  });

  it('computes quarterly summary metrics', async () => {
    const rows = [
      { periodStart: '2024-07-01T00:00:00.000Z', year: 2024, quarter: 3, count: 20 },
      { periodStart: '2024-10-01T00:00:00.000Z', year: 2024, quarter: 4, count: 30 },
      { periodStart: '2025-01-01T00:00:00.000Z', year: 2025, quarter: 1, count: 40 },
    ];
    const { service } = createService({
      repository: {
        getIncidentCountsByReportedQuarter: jest.fn().mockResolvedValue(rows),
      },
    });

    const result = await service.getQuarterlyTrends({ quarters: '3' });
    expect(result.series.length).toBe(3);
    expect(result.summary.current?.count).toBe(40);
    expect(result.summary.previous?.count).toBe(30);
    expect(result.summary.delta).toBe(10);
  });

  it('normalizes type timeline gaps and totals', async () => {
    const type: IncidentLookupValue = { code: 'FIRE_STRUCTURE', name: 'Structure Fire' };
    const rows = [
      { periodStart: '2024-11-01T00:00:00.000Z', type, count: 0 },
      { periodStart: '2024-12-01T00:00:00.000Z', type, count: 3 },
      { periodStart: '2025-01-01T00:00:00.000Z', type, count: 4 },
    ];
    const { service } = createService({
      repository: {
        getIncidentTypeTimeline: jest.fn().mockResolvedValue(rows),
      },
    });

    const result = await service.getTypeTimeline({ months: '3' });
    expect(result.types[0]?.total).toBe(7);
    expect(result.types[0]?.points.length).toBe(3);
  });

  it('normalizes coverage buffers and caches results', async () => {
    const coverage: StationCoverageBuffer[] = [
      {
        stationCode: 'STN-001',
        stationName: 'Station 1',
        isActive: true,
        radiusMeters: 5000,
        incidentCount: 12,
        location: {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-122.4, 37.8] },
          properties: {},
        },
        coverage: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-122.41, 37.77],
                [-122.39, 37.77],
                [-122.39, 37.79],
                [-122.41, 37.79],
                [-122.41, 37.77],
              ],
            ],
          },
          properties: {},
        },
      },
    ];

    const getStationCoverageBuffers = jest.fn().mockResolvedValue(coverage);
    const { service, repository } = createService({
      repository: {
        getStationCoverageBuffers,
      },
    });

    const first = await service.getCoverageBuffers({});
    expect(first.type).toBe('FeatureCollection');
    expect(first.features).toHaveLength(1);
    expect(first.features[0]?.properties.stationCode).toBe('STN-001');
    expect(first.metadata.stationCount).toBe(1);
    expect(repository.getStationCoverageBuffers).toHaveBeenCalledTimes(1);

    const second = await service.getCoverageBuffers({});
    expect(second.features).toHaveLength(1);
    expect(repository.getStationCoverageBuffers).toHaveBeenCalledTimes(1);
  });

  it('applies radius override and refresh flag for coverage buffers', async () => {
    const coverage: StationCoverageBuffer[] = [
      {
        stationCode: 'STN-002',
        stationName: 'Station 2',
        isActive: false,
        radiusMeters: 8000,
        incidentCount: 8,
        location: {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-122.3, 37.75] },
          properties: {},
        },
        coverage: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-122.31, 37.74],
                [-122.29, 37.74],
                [-122.29, 37.76],
                [-122.31, 37.76],
                [-122.31, 37.74],
              ],
            ],
          },
          properties: {},
        },
      },
    ];

    const getStationCoverageBuffers = jest.fn().mockResolvedValue(coverage);
    const { service, repository } = createService({
      repository: {
        getStationCoverageBuffers,
      },
    });

    const result = await service.getCoverageBuffers({
      radiusMeters: '1500',
      stationIsActive: 'false',
      refresh: 'true',
    });

    expect(result.metadata.radiusOverrideMeters).toBe(1500);
    expect(result.metadata.stationCount).toBe(1);
    expect(repository.getStationCoverageBuffers).toHaveBeenCalledWith(expect.anything(), {
      radiusOverride: 1500,
      stationIsActive: false,
    });
  });

  it('normalizes hotspot intensity and defaults resolution', async () => {
    const { service, repository } = createService({
      repository: {
        getIncidentHotspotAggregates: jest.fn().mockResolvedValue([
          {
            cellId: 'sq_1_2_r4',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [0, 0],
                  [1, 0],
                  [1, 1],
                  [0, 1],
                  [0, 0],
                ],
              ],
            },
            centroidCoordinates: [-122.4, 37.75],
            incidentCount: 10,
          },
          {
            cellId: 'sq_3_4_r4',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [1, 1],
                  [2, 1],
                  [2, 2],
                  [1, 2],
                  [1, 1],
                ],
              ],
            },
            centroidCoordinates: [-122.45, 37.8],
            incidentCount: 5,
          },
        ]),
      },
    });

    const response: unknown = await service.getHotspots({});

    expect(repository.getIncidentHotspotAggregates).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        cellSizeMeters: 500,
        resolution: 4,
      })
    );

    assertHotspotResponse(response);
    const typedResponse = response;

    expect(typedResponse.metadata).toMatchObject({
      resolution: 4,
      totalIncidents: 15,
      maxIncidentCount: 10,
      cellCount: 2,
      cellSizeMeters: 500,
      cellAreaSquareMeters: 250000,
    });
    expect(typeof typedResponse.metadata.generatedAt).toBe('string');

    expect(typedResponse.cells).toHaveLength(2);
    const [first, second] = typedResponse.cells;
    expect(first).toMatchObject({
      cellId: 'sq_1_2_r4',
      intensity: 1,
      incidentCount: 10,
      centroid: { longitude: -122.4 },
      geometry: { geometry: { type: 'Polygon' } },
    });
    expect(second).toMatchObject({
      cellId: 'sq_3_4_r4',
      intensity: 0.5,
      incidentCount: 5,
      centroid: { longitude: -122.45 },
      geometry: { geometry: { type: 'Polygon' } },
    });
  });

  it('rejects invalid hotspot resolution', async () => {
    const { service } = createService();
    await expect(service.getHotspots({ resolution: '0' })).rejects.toThrow(HttpError);
    await expect(service.getHotspots({ resolution: '9' })).rejects.toThrow(HttpError);
    await expect(service.getHotspots({ resolution: 'abc' })).rejects.toThrow(HttpError);
  });

  it('validates coverage buffer radius bounds', async () => {
    const { service } = createService();
    await expect(service.getCoverageBuffers({ radiusMeters: '50' })).rejects.toThrow(HttpError);
    await expect(service.getCoverageBuffers({ radiusMeters: '60000' })).rejects.toThrow(HttpError);
    await expect(service.getCoverageBuffers({ radiusMeters: 'not-a-number' })).rejects.toThrow(
      HttpError
    );
  });

  it('computes response metrics normalization for station grouping', async () => {
    const { service, repository } = createService({
      repository: {
        getResponseTimeMetrics: jest.fn().mockResolvedValue([
          {
            groupType: 'station',
            stationCode: 'STATION_A',
            stationName: 'Station A',
            sampleSize: 10,
            averageSeconds: 300,
            medianSeconds: 280,
            p90Seconds: 420,
          },
          {
            groupType: 'station',
            stationCode: 'STATION_B',
            stationName: 'Station B',
            sampleSize: 2,
            averageSeconds: 450,
            medianSeconds: 440,
            p90Seconds: 600,
          },
        ]),
      },
    });

    const result = await service.getResponseMetrics({ groupBy: 'station' });

    expect(repository.getResponseTimeMetrics).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ groupBy: 'station' })
    );
    expect(result.metadata.groupBy).toBe('station');
    expect(result.groups).toHaveLength(2);
    const stationGroups = result.groups.filter(
      (group): group is ResponseMetricStationGroup => group.groupType === 'station'
    );
    expect(stationGroups).toHaveLength(2);
    const first = stationGroups.find((group) => group.station.code === 'STATION_A');
    const second = stationGroups.find((group) => group.station.code === 'STATION_B');
    expect(first?.normalizedAverage).toBe(1);
    expect(first?.insufficientSample).toBe(false);
    expect(second?.normalizedAverage).toBe(0);
    expect(second?.insufficientSample).toBe(true);
    expect(result.metadata.minAverageSeconds).toBe(300);
    expect(result.metadata.maxAverageSeconds).toBe(450);
  });

  it('computes priority scores with normalization and decay options', async () => {
    const { service, repository } = createService({
      repository: {
        getPriorityScores: jest.fn().mockResolvedValue([
          {
            groupType: 'station',
            stationCode: 'STATION_A',
            stationName: 'Station A',
            totalIncidents: 12,
            rawScore: 48,
            weightSum: 12,
            averageSeverity: 4,
          },
          {
            groupType: 'station',
            stationCode: 'STATION_B',
            stationName: 'Station B',
            totalIncidents: 8,
            rawScore: 12,
            weightSum: 8,
            averageSeverity: 1.5,
          },
        ]),
      },
    });

    const result = await service.getPriorityScores({ groupBy: 'station', decayHalfLifeDays: '30' });

    expect(repository.getPriorityScores).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        groupBy: 'station',
        decayHalfLifeDays: 30,
      })
    );
    expect(result.groups).toHaveLength(2);
    const stationScores = result.groups.filter(
      (group): group is PriorityScoreStationGroup => group.groupType === 'station'
    );
    const topScore = stationScores.find((group) => group.station.code === 'STATION_A');
    expect(topScore?.normalizedScore).toBe(1);
    const lowestScore = stationScores.find((group) => group.station.code === 'STATION_B');
    expect(lowestScore?.normalizedScore).toBe(0);
    expect(result.metadata.decayHalfLifeDays).toBe(30);
  });

  it('rejects invalid response metric groupBy', async () => {
    const { service } = createService();
    await expect(service.getResponseMetrics({ groupBy: 'unknown' })).rejects.toThrow(HttpError);
  });

  it('rejects invalid priority score decay', async () => {
    const { service } = createService();
    await expect(service.getPriorityScores({ decayHalfLifeDays: '0' })).rejects.toThrow(HttpError);
  });

  // NEW TESTS to cover remaining gaps

  it('getDailyTrend computes hourly trend for short ranges', async () => {
    const { service, repository, incidentSvc } = createService({
        repository: {
            getIncidentCountsByReportedHour: jest.fn().mockResolvedValue([
                { date: '2025-01-15T10:00:00Z', count: 5 }
            ]),
        }
    });

    // We must ensure the filter options return start/end within 48 hours to trigger hourly mode
    (incidentSvc.buildFilterOptions as jest.Mock).mockReturnValue({
        startDate: '2025-01-15T00:00:00Z',
        endDate: '2025-01-15T12:00:00Z'
    });

    const result = await service.getDailyTrend({
        startDate: '2025-01-15T00:00:00Z',
        endDate: '2025-01-15T12:00:00Z'
    });

    expect(repository.getIncidentCountsByReportedHour).toHaveBeenCalled();
    expect(result.points.length).toBeGreaterThan(0);
  });

  it('getDailyTrend uses previous year for comparison', async () => {
      const { service, repository } = createService();
      await service.getDailyTrend({ compare: 'year' });
      // We assume default date range (30 days). From 2025-01-15, prev year start should be around 2023-12-17
      expect(repository.countIncidentsByReportedRange).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ start: expect.stringContaining('2023') })
      );
  });

  it('getTimeOfDayDistribution aggregates correctly', async () => {
      const { service, repository } = createService({
          repository: {
              getIncidentCountsByHourOfDay: jest.fn().mockResolvedValue([
                  { hour: 8, count: 10 }, // Morning
                  { hour: 14, count: 20 }, // Afternoon
                  { hour: 22, count: 5 }, // Night
              ])
          }
      });

      const result = await service.getTimeOfDayDistribution({});
      expect(result.morning).toBe(10);
      expect(result.afternoon).toBe(20);
      expect(result.night).toBe(5);
      expect(result.total).toBe(35);
  });

  it('getZoneFrequency computes percentages', async () => {
      const { service } = createService({
          repository: {
              getZoneFrequency: jest.fn().mockResolvedValue([
                  { zoneName: 'Zone A', count: 10 },
                  { zoneName: 'Zone B', count: 30 }
              ])
          }
      });

      const result = await service.getZoneFrequency({});
      expect(result.total).toBe(40);
      expect(result.zones[0].percentage).toBe(25);
      expect(result.zones[1].percentage).toBe(75);
  });

  it('getStationIncidentCounts computes percentages', async () => {
      const { service } = createService({
          repository: {
              getStationIncidentCounts: jest.fn().mockResolvedValue([
                  { stationCode: 'S1', stationName: 'Station 1', count: 20 },
                  { stationCode: 'S2', stationName: 'Station 2', count: 80 }
              ])
          }
      });

      const result = await service.getStationIncidentCounts({});
      expect(result.total).toBe(100);
      expect(result.stations[0].percentage).toBe(20);
      expect(result.stations[1].percentage).toBe(80);
  });

  it('getDistrictFrequentIncidentTypes finds max type', async () => {
      const { service } = createService({
          repository: {
              getMostFrequentIncidentTypesByDistrict: jest.fn().mockResolvedValue([
                  { district: 'D1', typeName: 'Fire', count: 10 },
                  { district: 'D1', typeName: 'Medical', count: 5 },
                  { district: 'D2', typeName: 'Medical', count: 8 }
              ])
          }
      });

      const result = await service.getDistrictFrequentIncidentTypes({});
      expect(result.items).toHaveLength(2);
      const d1 = result.items.find(i => i.district === 'D1');
      expect(d1?.mostFrequentType).toBe('Fire');
      expect(d1?.count).toBe(10);
  });

  it('getIncidentProjection handles insufficient data gracefully', async () => {
      const { service, repository } = createService({
          repository: {
              getIncidentMetadata: jest.fn().mockResolvedValue({ reportedRange: { start: '2025-01-01', end: '2025-02-01' } }),
              getIncidentCountsByReportedMonth: jest.fn().mockResolvedValue([])
          }
      });

      const result = await service.getIncidentProjection({});
      // totalMonths depends on how we iterate points. If range is small, points might be small.
      // But we expect at least no crash and valid structure.
      expect(result.periods).toHaveLength(5);
  });

  it('getIncidentProjection projects with seasonality', async () => {
      // Mock 2 years of data to trigger seasonality
      const rows = [];
      const startDate = new Date('2023-01-01T00:00:00Z');
      for(let i=0; i<24; i++) {
          const date = new Date(startDate);
          date.setUTCMonth(date.getUTCMonth() + i);
          rows.push({
              periodStart: date.toISOString(),
              count: 100 + (i * 5) // Slight upward trend
          });
      }

      const { service } = createService({
          repository: {
              getIncidentMetadata: jest.fn().mockResolvedValue({
                  reportedRange: { start: '2023-01-01T00:00:00Z', end: '2024-12-31T23:59:59Z' }
              }),
              getIncidentCountsByReportedMonth: jest.fn().mockResolvedValue(rows)
          }
      });

      const result = await service.getIncidentProjection({});
      expect(result.metadata.seasonalityDetected).toBe(true);
      expect(result.periods[0].projectedCount).toBeGreaterThan(0);
  });
});
