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

      expect(incidentRepository.getIncidentCountsByType).toHaveBeenCalledWith(expect.anything(), {
        start: filters.startDate,
        end: filters.endDate,
      });
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

      await expect(service.prepareIncidentsExport({ limit: '5000' }, mockNow)).rejects.toThrow(
        HttpError
      );
    });

    it('throws on invalid columns', async () => {
      (incidentService.buildFilterOptions as jest.Mock).mockReturnValue({});

      await expect(
        service.prepareIncidentsExport({ includeColumns: 'invalid' }, mockNow)
      ).rejects.toThrow(HttpError);
    });

    it('exercises all column accessors and csv formatting', async () => {
      // Mock stream with robust definition
      const mockOn = jest.fn();
      const mockStream = {
        pipe: jest.fn(),
        on: mockOn,
        pause: jest.fn(),
        resume: jest.fn(),
      };
      // When pipe is called, return self to simulate chaining/throttling result (simplified)
      (mockStream.pipe as jest.Mock).mockReturnValue(mockStream);

      (incidentService.buildFilterOptions as jest.Mock).mockReturnValue({});
      (incidentRepository.countIncidents as jest.Mock).mockResolvedValue(1);
      (incidentRepository.createIncidentExportStream as jest.Mock).mockReturnValue(mockStream);

      const fullItem: any = {
        incidentNumber: 'INC-"001"', // Quote test
        title: 'Test\nIncident', // Newline test
        occurrenceAt: '2023-01-01T00:00:00Z',
        reportedAt: '2023-01-01T00:00:00Z',
        dispatchAt: '2023-01-01T00:05:00Z',
        arrivalAt: '2023-01-01T00:10:00Z',
        resolvedAt: '2023-01-01T01:00:00Z',
        type: { code: 'FIRE', name: 'Fire' },
        severity: { code: 'HIGH', name: 'High', priority: 1 },
        status: { code: 'OPEN', name: 'Open' },
        isActive: true,
        casualtyCount: 2,
        responderInjuries: 1,
        estimatedDamageAmount: '1000',
        primaryStation: { stationCode: 'ST-01', name: 'Station 1' },
        source: { code: 'PHONE' },
        weather: { code: 'CLEAR' },
        location: { geometry: { coordinates: [-123.456789, 45.678901] } },
      };

      const knownKeys = [
        'incidentnumber',
        'title',
        'occurrenceat',
        'reportedat',
        'dispatchat',
        'arrivalat',
        'resolvedat',
        'typecode',
        'typename',
        'severitycode',
        'severityname',
        'severitypriority',
        'statuscode',
        'statusname',
        'isactive',
        'casualtycount',
        'responderinjuries',
        'estimateddamage',
        'primarystationcode',
        'primarystationname',
        'sourcecode',
        'weathercode',
        'longitude',
        'latitude',
      ];
      const includeColumns = knownKeys.join(',');

      const result = await service.prepareIncidentsExport({ includeColumns }, mockNow);

      // Verify accessors
      result.selectedColumns.forEach((col) => {
        expect(col.accessor(fullItem)).toBeDefined();
      });

      // Trigger data flow to test csvEscape and stream writing
      const dataHandler = mockOn.mock.calls.find((call) => call[0] === 'data')?.[1];
      expect(dataHandler).toBeDefined();

      // Mock the csvStream write to inspect output if needed, but PassThrough works in memory too.
      // We can collect data from result.stream
      const chunks: string[] = [];
      result.stream.on('data', (chunk) => chunks.push(chunk.toString()));

      // Simulate data event
      dataHandler(fullItem);

      // Wait a tick for stream? It's synchronous usually for PassThrough
      // Simulate data event
      dataHandler(fullItem);

      // Wait for stream events to propagate
      await new Promise((resolve) => setImmediate(resolve));

      expect(chunks.length).toBeGreaterThan(0);
      const csvContent = chunks.join('');
      // Check for escaped quote
      expect(csvContent).toContain('"INC-""001"""');
      // Check for quoted newline
      expect(csvContent).toContain('"Test\nIncident"');

      // Test null/empty item safety
      const emptyItem: any = {
        incidentNumber: 'INC-002',
        title: 'Empty',
        occurrenceAt: '',
        reportedAt: '',
        type: { code: '', name: '' },
        severity: { code: '', name: '', priority: 0 },
        status: { code: '', name: '' },
        isActive: false, // Should be 'false' string
        casualtyCount: 0,
        responderInjuries: 0,
        location: { geometry: { coordinates: [] } },
      };

      dataHandler(emptyItem);
      const finalCsv = chunks.join('');
      expect(finalCsv).toContain(',false,'); // Boolean formatting
    });
  });

  describe('Utility/Edge Cases', () => {
    it('getDailyTrend uses previous year for comparison', async () => {
      (incidentService.buildFilterOptions as jest.Mock).mockReturnValue({});
      // Start/End provided implies explicit range
      (incidentService.buildFilterOptions as jest.Mock).mockReturnValue({
        startDate: '2023-01-01T00:00:00Z',
        endDate: '2023-01-31T00:00:00Z',
      });

      (incidentRepository.getIncidentCountsByReportedDay as jest.Mock).mockResolvedValue([]);
      (incidentRepository.countIncidentsByReportedRange as jest.Mock).mockResolvedValue(0);

      await service.getDailyTrend({ compare: 'year' }, false, mockNow);

      // Verify the previous range calculation (should be 2022)
      const calls = (incidentRepository.countIncidentsByReportedRange as jest.Mock).mock.calls;
      // The second call (or first if optimize check order?)
      // getDailyTrend calls countIncidentsByReportedRange for "previousTotal"
      const prevRangeArg = calls[0][1];
      expect(prevRangeArg.start).toContain('2022');
    });

    it('accessors handle coordinate formatting correctly', async () => {
      // Indirectly test formatCoordinate
      const knownKeys = ['longitude'];
      const result = await service.prepareIncidentsExport(
        { includeColumns: knownKeys.join(',') },
        mockNow
      );
      const accessor = result.selectedColumns[0].accessor;

      const item: any = { location: { geometry: { coordinates: [123.456789123] } } };
      expect(accessor(item)).toBe('123.456789');

      const itemNaN: any = { location: { geometry: { coordinates: [NaN] } } };
      expect(accessor(itemNaN)).toBe('');
    });
  });
});
