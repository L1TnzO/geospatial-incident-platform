import { StrategicAnalyticsService } from '../../src/services/strategicService';
import type { IncidentFilterOptions } from '../../src/services/incidentsService';
import type { IncidentLookupValue } from '../../src/db';
import { HttpError } from '../../src/errors/httpError';

const createService = (
  overrides: {
    repository?: Partial<{
      getIncidentCountsByReportedMonth: jest.Mock;
      getIncidentCountsByReportedQuarter: jest.Mock;
      getIncidentTypeTimeline: jest.Mock;
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
    ...(overrides.repository ?? {}),
  };

  const incidentSvc = {
    buildFilterOptions: jest.fn().mockReturnValue(defaultFilters),
    ...(overrides.incidentSvc ?? {}),
  };

  const service = new StrategicAnalyticsService(repository as never, incidentSvc as never);
  return { service, repository, incidentSvc, defaultFilters };
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
});
