import { IncidentService, type IncidentListOptions } from '../../src/services/incidentsService';
import { HttpError } from '../../src/errors/httpError';
import type {
  IncidentDetail,
  IncidentListItem,
  IncidentMetadata,
  IncidentSearchResult,
  PaginatedResult,
} from '../../src/db';

const createService = () => {
  const repository = {
    listIncidents: jest.fn<Promise<PaginatedResult<IncidentListItem>>, [IncidentListOptions]>(),
    getIncidentDetail: jest.fn<Promise<IncidentDetail | null>, [string]>(),
    getIncidentMetadata: jest.fn<Promise<Omit<IncidentMetadata, 'limits'>>, []>(),
    findIncidentSummary: jest.fn<Promise<IncidentSearchResult | null>, [string]>(),
  };

  return {
    service: new IncidentService(repository),
    repository,
  };
};

describe('IncidentService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('buildListOptions', () => {
    it('returns defaults when no query parameters provided', () => {
      const { service } = createService();

      const options = service.buildListOptions({});

      expect(options.page).toBe(1);
      expect(options.pageSize).toBe(25);
      expect(options.typeCodes).toBeUndefined();
      expect(options.sortBy).toBe('reportedAt');
      expect(options.sortDirection).toBe('desc');
    });

    it('parses filters, sorting, and validates pagination caps', () => {
      const { service } = createService();
      const options = service.buildListOptions({
        page: '2',
        pageSize: '50',
        typeCodes: 'FIRE_STRUCTURE,MEDICAL',
        severityCodes: ['CRITICAL', 'HIGH'],
        isActive: 'true',
        startDate: '2025-09-01T00:00:00Z',
        sortBy: 'severityPriority',
        sortDirection: 'asc',
      });

      expect(options.page).toBe(2);
      expect(options.pageSize).toBe(50);
      expect(options.typeCodes).toEqual(['FIRE_STRUCTURE', 'MEDICAL']);
      expect(options.severityCodes).toEqual(['CRITICAL', 'HIGH']);
      expect(options.isActive).toBe(true);
      expect(options.startDate).toBe('2025-09-01T00:00:00.000Z');
      expect(options.sortBy).toBe('severityPriority');
      expect(options.sortDirection).toBe('asc');
    });

    it('throws when page exceeds the 5,000 record window', () => {
      const { service } = createService();

      expect(() =>
        service.buildListOptions({
          page: '51',
          pageSize: '100',
        })
      ).toThrow(HttpError);
    });

    it('enforces maximum page size of 100', () => {
      const { service } = createService();

      expect(() =>
        service.buildListOptions({
          page: '1',
          pageSize: '5001',
        })
      ).toThrow(HttpError);
    });

    it('rejects invalid sort field', () => {
      const { service } = createService();

      expect(() =>
        service.buildListOptions({
          sortBy: 'foobar',
        })
      ).toThrow(HttpError);
    });

    it('rejects invalid sort direction', () => {
      const { service } = createService();

      expect(() =>
        service.buildListOptions({
          sortDirection: 'sideways',
        })
      ).toThrow(HttpError);
    });
  });

  describe('listIncidents', () => {
    it('clamps total results to the 5,000 record maximum', async () => {
      const { service, repository } = createService();
      repository.listIncidents.mockResolvedValue({
        data: [] as IncidentListItem[],
        page: 1,
        pageSize: 100,
        total: 6000,
        totalPages: 60,
        hasNext: true,
        hasPrevious: false,
        sortBy: 'reportedAt',
        sortDirection: 'desc',
      });

      const response = await service.listIncidents({
        page: 1,
        pageSize: 100,
        sortBy: 'reportedAt',
        sortDirection: 'desc',
      });

      expect(response.pagination.total).toBe(5000);
      expect(response.pagination.totalPages).toBe(50);
      expect(response.pagination.hasNext).toBe(true);
      expect(response.pagination.hasPrevious).toBe(false);
      expect(repository.listIncidents).toHaveBeenCalledWith({
        page: 1,
        pageSize: 100,
        sortBy: 'reportedAt',
        sortDirection: 'desc',
      });
    });

    it('handles empty result sets', async () => {
      const { service, repository } = createService();
      repository.listIncidents.mockResolvedValue({
        data: [] as IncidentListItem[],
        page: 1,
        pageSize: 25,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
        sortBy: 'reportedAt',
        sortDirection: 'desc',
      });

      const response = await service.listIncidents({
        page: 1,
        pageSize: 25,
        sortBy: 'reportedAt',
        sortDirection: 'desc',
      });

      expect(response.data).toHaveLength(0);
      expect(response.pagination.totalPages).toBe(0);
      expect(response.pagination.hasNext).toBe(false);
      expect(response.pagination.hasPrevious).toBe(false);
    });
  });

  describe('getIncidentDetail', () => {
    it('returns detail when found', async () => {
      const { service, repository } = createService();
      repository.getIncidentDetail.mockResolvedValue({
        incidentNumber: 'INC-001',
        title: 'Test',
        occurrenceAt: '2025-09-01T00:00:00.000Z',
        reportedAt: '2025-09-01T00:05:00.000Z',
        dispatchAt: null,
        arrivalAt: null,
        resolvedAt: null,
        isActive: true,
        casualtyCount: 0,
        responderInjuries: 0,
        estimatedDamageAmount: null,
        location: {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: {},
        },
        locationGeohash: null,
        externalReference: null,
        type: { code: 'FIRE_STRUCTURE', name: 'Structure' },
        severity: { code: 'CRITICAL', name: 'Critical', priority: 4, colorHex: '#fff' },
        status: { code: 'REPORTED', name: 'Reported', isTerminal: false },
        source: null,
        weather: null,
        primaryStation: null,
        narrative: null,
        metadata: {},
        units: [],
        assets: [],
        notes: [],
      } as IncidentDetail);

      const detail = await service.getIncidentDetail(' INC-001 ');

      expect(detail.incidentNumber).toBe('INC-001');
      expect(repository.getIncidentDetail).toHaveBeenCalledWith('INC-001');
    });

    it('throws a 404 when the incident is not found', async () => {
      const { service, repository } = createService();
      repository.getIncidentDetail.mockResolvedValue(null);

      await expect(service.getIncidentDetail('INC-404')).rejects.toThrow(HttpError);
    });

    it('validates required incident number', async () => {
      const { service } = createService();

      await expect(service.getIncidentDetail(' ')).rejects.toThrow(HttpError);
    });
  });

  describe('getIncidentMetadata', () => {
    const baseMetadata: Omit<IncidentMetadata, 'limits'> = {
      types: [{ code: 'FIRE_STRUCTURE', name: 'Structure' }],
      severities: [{ code: 'CRITICAL', name: 'Critical', priority: 1, colorHex: '#ff0000' }],
      statuses: [{ code: 'REPORTED', name: 'Reported', isTerminal: false }],
      occurrenceRange: { start: '2025-09-01T00:00:00.000Z', end: '2025-09-02T00:00:00.000Z' },
      reportedRange: { start: '2025-09-01T00:05:00.000Z', end: '2025-09-02T00:05:00.000Z' },
      activeCount: 10,
    };

    it('caches metadata responses until TTL expires', async () => {
      const { service, repository } = createService();
      repository.getIncidentMetadata.mockResolvedValue(baseMetadata);

      const first = await service.getIncidentMetadata();
      const second = await service.getIncidentMetadata();

      expect(first.limits.maxTotalResults).toBeGreaterThan(0);
      expect(second).toBe(first);
      expect(repository.getIncidentMetadata).toHaveBeenCalledTimes(1);
    });

    it('force refresh bypasses cache', async () => {
      const { service, repository } = createService();
      repository.getIncidentMetadata.mockResolvedValue(baseMetadata);

      await service.getIncidentMetadata();
      await service.getIncidentMetadata(true);

      expect(repository.getIncidentMetadata).toHaveBeenCalledTimes(2);
    });
  });

  describe('searchIncidentByNumber', () => {
    it('normalizes the incident number and returns summary', async () => {
      const { service, repository } = createService();
      const summary = {
        incidentNumber: 'INC-123',
        title: 'Summary',
        occurrenceAt: '2025-09-01T00:00:00.000Z',
        reportedAt: '2025-09-01T00:05:00.000Z',
        isActive: true,
        location: {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: {},
        },
        severity: { code: 'CRITICAL', name: 'Critical', priority: 1, colorHex: '#ff0000' },
        status: { code: 'REPORTED', name: 'Reported', isTerminal: false },
        type: { code: 'FIRE_STRUCTURE', name: 'Structure' },
      } satisfies IncidentSearchResult;
      repository.findIncidentSummary.mockResolvedValue(summary);

      const result = await service.searchIncidentByNumber(' inc-123 ');

      expect(result).toEqual(summary);
      expect(repository.findIncidentSummary).toHaveBeenCalledWith('INC-123');
    });

    it('throws when incident number missing', async () => {
      const { service } = createService();

      await expect(service.searchIncidentByNumber('')).rejects.toThrow(HttpError);
    });

    it('rejects invalid characters', async () => {
      const { service } = createService();

      await expect(service.searchIncidentByNumber('INC 123')).rejects.toThrow(HttpError);
    });

    it('throws not found when repository misses incident', async () => {
      const { service, repository } = createService();
      repository.findIncidentSummary.mockResolvedValue(null);

      await expect(service.searchIncidentByNumber('INC-404')).rejects.toThrow(HttpError);
    });
  });
});
