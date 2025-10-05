import {
  StrategicAnalyticsService,
  type HotspotResponse,
} from '../../src/services/strategicService';
import type { IncidentFilterOptions } from '../../src/services/incidentsService';
import type { IncidentLookupValue } from '../../src/db';
import { HttpError } from '../../src/errors/httpError';

const createService = (
  overrides: {
    repository?: Partial<{
      getIncidentCountsByReportedMonth: jest.Mock;
      getIncidentCountsByReportedQuarter: jest.Mock;
      getIncidentTypeTimeline: jest.Mock;
      getIncidentHotspotAggregates: jest.Mock;
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
});
