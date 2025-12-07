import {
  DashboardService,
  type DailyTrend,
  type Last24HoursKpi,
  type SeverityDistribution,
  type TypeDistribution,
} from '../../src/services/dashboardService';
import { incidentRepository } from '../../src/db';
import { incidentService } from '../../src/services/incidentsService';
import { HttpError } from '../../src/errors/httpError';

// Mock dependencies
jest.mock('../../src/db', () => ({
  incidentRepository: {
    countIncidentsByReportedRange: jest.fn(),
    getIncidentCountsByType: jest.fn(),
    getIncidentCountsByReportedHour: jest.fn(),
    getIncidentCountsByReportedDay: jest.fn(),
    getSeverityDistribution: jest.fn(),
    listRecentIncidents: jest.fn(),
    countIncidents: jest.fn(),
    createIncidentExportStream: jest.fn(),
  },
}));

jest.mock('../../src/services/incidentsService', () => ({
  incidentService: {
    buildFilterOptions: jest.fn(),
  },
}));

describe('DashboardService', () => {
  let service: DashboardService;
  const mockNow = new Date('2025-01-02T12:00:00Z');

  beforeEach(() => {
    service = new DashboardService(incidentRepository, incidentService);
    service.clearCaches();
    jest.clearAllMocks();
  });

  describe('getLast24HoursKpi', () => {
    it('calculates KPI correctly with defaults', async () => {
      (incidentService.buildFilterOptions as jest.Mock).mockReturnValue({});
      (incidentRepository.countIncidentsByReportedRange as jest.Mock)
        .mockResolvedValueOnce(100) // current
        .mockResolvedValueOnce(80); // previous

      const kpi = await service.getLast24HoursKpi({}, false, mockNow);

      expect(kpi.currentCount).toBe(100);
      expect(kpi.previousCount).toBe(80);
      expect(kpi.delta).toBe(20);
      expect(kpi.deltaPercentage).toBe(25);
      expect(incidentRepository.countIncidentsByReportedRange).toHaveBeenCalledTimes(2);
    });

    it('handles zero previous count correctly', async () => {
      (incidentService.buildFilterOptions as jest.Mock).mockReturnValue({});
      (incidentRepository.countIncidentsByReportedRange as jest.Mock)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(0);

      const kpi = await service.getLast24HoursKpi({}, false, mockNow);

      expect(kpi.deltaPercentage).toBeNull();
    });

    it('caches results', async () => {
      (incidentService.buildFilterOptions as jest.Mock).mockReturnValue({});
      (incidentRepository.countIncidentsByReportedRange as jest.Mock).mockResolvedValue(100);

      await service.getLast24HoursKpi({}, false, mockNow);
      await service.getLast24HoursKpi({}, false, mockNow);

      expect(incidentRepository.countIncidentsByReportedRange).toHaveBeenCalledTimes(2); // Once for current, once for previous, in the first call
    });

    it('compares with previous year if requested', async () => {
        (incidentService.buildFilterOptions as jest.Mock).mockReturnValue({});
        (incidentRepository.countIncidentsByReportedRange as jest.Mock).mockResolvedValue(100);

        await service.getLast24HoursKpi({ compare: 'year' }, false, mockNow);

        const calls = (incidentRepository.countIncidentsByReportedRange as jest.Mock).mock.calls;
        const previousCall = calls[1];
        const previousRange = previousCall[1];

        const expectedPrevStart = new Date(mockNow.getTime() - 24 * 60 * 60 * 1000);
        expectedPrevStart.setFullYear(expectedPrevStart.getFullYear() - 1);

        // previousRange.start is string, need to compare dates
        expect(new Date(previousRange.start).toISOString()).toBe(expectedPrevStart.toISOString());
      });
  });

  describe('getIncidentsByType', () => {
    it('calculates distribution and percentages', async () => {
      (incidentService.buildFilterOptions as jest.Mock).mockReturnValue({});
      (incidentRepository.getIncidentCountsByType as jest.Mock).mockResolvedValue([
        { type: { code: 'A', name: 'Type A' }, count: 50 },
        { type: { code: 'B', name: 'Type B' }, count: 50 },
      ]);

      const dist = await service.getIncidentsByType({}, false, mockNow);

      expect(dist.total).toBe(100);
      expect(dist.buckets).toHaveLength(2);
      expect(dist.buckets[0].percentage).toBe(50);
      expect(dist.buckets[1].percentage).toBe(50);
    });

    it('uses explicit date range if provided', async () => {
      const filters = { startDate: '2025-01-01T00:00:00Z', endDate: '2025-01-02T00:00:00Z' };
      (incidentService.buildFilterOptions as jest.Mock).mockReturnValue(filters);
      (incidentRepository.getIncidentCountsByType as jest.Mock).mockResolvedValue([]);

      await service.getIncidentsByType({}, false, mockNow);

      expect(incidentRepository.getIncidentCountsByType).toHaveBeenCalledWith(
        expect.anything(),
        { start: filters.startDate, end: filters.endDate }
      );
    });
  });

  describe('getDailyTrend', () => {
    it('calculates trend with defaults (daily)', async () => {
      (incidentService.buildFilterOptions as jest.Mock).mockReturnValue({});
      (incidentRepository.getIncidentCountsByReportedDay as jest.Mock).mockResolvedValue([
        { date: '2025-01-01', count: 10 },
      ]);
      // Previous range mocks
      (incidentRepository.countIncidentsByReportedRange as jest.Mock).mockResolvedValue(5);

      const trend = await service.getDailyTrend({}, false, mockNow);

      expect(trend.points).toBeDefined();
      expect(trend.trend.currentTotal).toBe(10); // 10 from the bucket
      expect(trend.trend.previousTotal).toBe(5);
      expect(trend.trend.change).toBe(5);
      expect(trend.trend.direction).toBe('up');
    });

    it('uses hourly bucketing for short ranges', async () => {
        const filters = { startDate: '2025-01-02T00:00:00Z', endDate: '2025-01-02T12:00:00Z' };
        (incidentService.buildFilterOptions as jest.Mock).mockReturnValue(filters);

        // Mock getIncidentCountsByReportedHour for current range
        (incidentRepository.getIncidentCountsByReportedHour as jest.Mock)
          .mockResolvedValueOnce([{ date: '2025-01-02T01:00:00.000Z', count: 5 }])
          .mockResolvedValueOnce([]); // for previous range

        (incidentRepository.countIncidentsByReportedRange as jest.Mock).mockResolvedValue(0);

        await service.getDailyTrend({}, false, mockNow);

        expect(incidentRepository.getIncidentCountsByReportedHour).toHaveBeenCalled();
      });
  });

  describe('getSeverityDistribution', () => {
    it('calculates distribution and percentages', async () => {
      (incidentService.buildFilterOptions as jest.Mock).mockReturnValue({});
      (incidentRepository.getSeverityDistribution as jest.Mock).mockResolvedValue([
        { severity: { code: 'HIGH', name: 'High' }, count: 10 },
        { severity: { code: 'LOW', name: 'Low' }, count: 90 },
      ]);

      const dist = await service.getSeverityDistribution({});

      expect(dist.total).toBe(100);
      expect(dist.buckets[0].percentage).toBe(10);
      expect(dist.buckets[1].percentage).toBe(90);
    });
  });

  describe('prepareIncidentsExport', () => {
      it('creates export stream with correct metadata', async () => {
          (incidentService.buildFilterOptions as jest.Mock).mockReturnValue({});
          (incidentRepository.countIncidents as jest.Mock).mockResolvedValue(100);

          const mockStream = { pipe: jest.fn().mockReturnThis(), on: jest.fn() };
          (incidentRepository.createIncidentExportStream as jest.Mock).mockReturnValue(mockStream);

          const result = await service.prepareIncidentsExport({ limit: '100' }, mockNow);

          expect(result.total).toBe(100);
          expect(result.filename).toContain('incidents-export-');
          expect(incidentRepository.createIncidentExportStream).toHaveBeenCalled();
      });

      it('throws if limit exceeded', async () => {
          (incidentService.buildFilterOptions as jest.Mock).mockReturnValue({});
          (incidentRepository.countIncidents as jest.Mock).mockResolvedValue(6000);

          await expect(service.prepareIncidentsExport({ limit: '5000' }, mockNow))
            .rejects.toThrow(HttpError);
      });

      it('throws on invalid columns', async () => {
          (incidentService.buildFilterOptions as jest.Mock).mockReturnValue({});

          await expect(service.prepareIncidentsExport({ includeColumns: 'invalid' }, mockNow))
            .rejects.toThrow(HttpError);
      });
  });
});
