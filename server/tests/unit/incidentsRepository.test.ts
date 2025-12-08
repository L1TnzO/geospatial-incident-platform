import { IncidentRepository } from '../../src/db/repositories/incidentsRepository';
import type { Knex } from 'knex';

const createMockDb = () => {
  const queryBuilder: any = {
    leftJoin: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    whereRaw: jest.fn().mockReturnThis(),
    whereBetween: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    first: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
    modify: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    groupByRaw: jest.fn().mockReturnThis(),
    orderByRaw: jest.fn().mockReturnThis(),
    min: jest.fn().mockReturnThis(),
    max: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    transacting: jest.fn().mockReturnThis(),
    as: jest.fn().mockReturnThis(),
    with: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    stream: jest.fn(),
    delete: jest.fn().mockReturnThis(),
    then: jest.fn().mockImplementation((callback) => Promise.resolve([]).then(callback)),
  };

  // Make the query builder awaitable
  queryBuilder.catch = jest.fn();
  queryBuilder.finally = jest.fn();

  const db: any = jest.fn(() => queryBuilder);
  db.raw = jest.fn((sql) => sql);
  db.fn = { now: jest.fn().mockReturnValue('NOW()') };
  db.transaction = jest.fn((callback) => callback(db));
  db.with = jest.fn().mockReturnValue(queryBuilder); // Mock db.with()

  return { db: db as unknown as Knex, queryBuilder };
};

describe('IncidentRepository', () => {
  // Existing tests ...
  describe('getIncidentDetail', () => {
    it('fetches incident detail and maps it correctly', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);

      const mockRow = {
        incidentId: 1,
        incidentNumber: 'INC-001',
        title: 'Test Incident',
        occurrenceAt: '2025-01-01T00:00:00Z',
        reportedAt: '2025-01-01T00:05:00Z',
        isActive: true,
        typeCode: 'FIRE',
        typeName: 'Fire',
        severityCode: 'HIGH',
        statusCode: 'REPORTED',
        locationGeoJson: { type: 'Point', coordinates: [0, 0] },
        metadata: { key: 'value' },
      };

      queryBuilder.first.mockImplementationOnce(() => Promise.resolve(mockRow));

      const result = await repository.getIncidentDetail('INC-001');

      expect(result).not.toBeNull();
      expect(result?.incidentNumber).toBe('INC-001');
      expect(result?.metadata).toEqual({ key: 'value' });
      expect(db).toHaveBeenCalledWith('incidents as i');
    });

    it('returns null if incident not found', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);
      queryBuilder.first.mockResolvedValue(undefined);
      const result = await repository.getIncidentDetail('INC-404');
      expect(result).toBeNull();
    });
  });

  describe('listIncidents', () => {
    it('lists incidents with pagination', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);
      const mockRow = {
        incidentNumber: 'INC-001',
        title: 'Test',
        occurrenceAt: '2025-01-01T00:00:00Z',
        reportedAt: '2025-01-01T00:05:00Z',
        isActive: true,
        typeCode: 'FIRE',
        severityCode: 'HIGH',
        statusCode: 'REPORTED',
        locationGeoJson: { type: 'Point', coordinates: [0, 0] },
      };
      queryBuilder.count.mockResolvedValue([{ total: '1' }]);
      queryBuilder.then.mockImplementation((resolve: any) => Promise.resolve([mockRow]).then(resolve));

      const result = await repository.listIncidents({ page: 1, pageSize: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('applies filters', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);
      queryBuilder.count.mockResolvedValue([{ total: '0' }]);

      await repository.listIncidents({
        typeCodes: ['FIRE'],
        isActive: true,
        incidentNumber: 'INC-001',
      });
      expect(queryBuilder.whereIn).toHaveBeenCalledWith('it.type_code', ['FIRE']);
      expect(queryBuilder.where).toHaveBeenCalledWith('i.is_active', true);
      expect(queryBuilder.whereRaw).toHaveBeenCalledWith(expect.stringContaining('UPPER(i.incident_number)'), expect.anything());
    });
  });

  describe('createIncident', () => {
    it('creates incident in transaction', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);
      const input = {
        incidentNumber: 'INC-NEW',
        title: 'New Incident',
        typeCode: 'FIRE',
        severityCode: 'HIGH',
        statusCode: 'REPORTED',
        occurrenceAt: '2025-01-01T00:00:00Z',
        reportedAt: '2025-01-01T00:05:00Z',
        casualtyCount: 0,
        responderInjuries: 0,
        isActive: true,
        metadata: {},
        location: { latitude: 0, longitude: 0 },
      };
      queryBuilder.first.mockResolvedValue({ id: 1 });
      queryBuilder.insert.mockReturnThis();
      queryBuilder.returning.mockResolvedValue([{ incident_number: 'INC-NEW' }]);

      (db as unknown as jest.Mock).mockImplementation((tableName: string) => {
          if (tableName === 'incidents as i') {
              const detailQueryBuilder: any = { ...queryBuilder };
              detailQueryBuilder.first = jest.fn().mockResolvedValue({
                  incidentId: 100,
                  incidentNumber: 'INC-NEW',
                  title: 'New Incident',
                  occurrenceAt: '2025-01-01T00:00:00Z',
                  reportedAt: '2025-01-01T00:05:00Z',
                  isActive: true,
                  typeCode: 'FIRE',
                  severityCode: 'HIGH',
                  statusCode: 'REPORTED',
                  locationGeoJson: { type: 'Point', coordinates: [0, 0] },
                  metadata: {},
              });
               detailQueryBuilder.catch = jest.fn();
               detailQueryBuilder.finally = jest.fn();
               detailQueryBuilder.then = jest.fn().mockImplementation((cb: any) => Promise.resolve([]).then(cb));
              return detailQueryBuilder;
          }
          return queryBuilder;
      });

      const result = await repository.createIncident(input);
      expect(result.incidentNumber).toBe('INC-NEW');
    });
  });

  describe('countIncidents', () => {
      it('counts correctly', async () => {
          const { db, queryBuilder } = createMockDb();
          const repository = new IncidentRepository(db);
          queryBuilder.count.mockResolvedValue([{ total: '42' }]);
          const count = await repository.countIncidents({});
          expect(count).toBe(42);
      });
  });

  describe('getIncidentCountsByReportedDay', () => {
    it('returns daily counts', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);

      const mockRows = [
        { bucketDate: '2025-01-01T00:00:00Z', total: '10' },
        { bucketDate: '2025-01-02T00:00:00Z', total: '5' },
      ];

      queryBuilder.then.mockImplementation((resolve: any) => Promise.resolve(mockRows).then(resolve));

      const result = await repository.getIncidentCountsByReportedDay({}, { start: '2025-01-01', end: '2025-01-03' });

      expect(result).toHaveLength(2);
      expect(result[0].count).toBe(10);
      expect(result[1].count).toBe(5);
      expect(queryBuilder.groupByRaw).toHaveBeenCalled();
    });
  });

  describe('getIncidentCountsByReportedHour', () => {
    it('returns hourly counts', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);

      const mockRows = [
        { bucketDate: '2025-01-01T10:00:00Z', total: '2' },
      ];
      queryBuilder.then.mockImplementation((resolve: any) => Promise.resolve(mockRows).then(resolve));

      const result = await repository.getIncidentCountsByReportedHour({}, { start: '2025-01-01T00:00:00Z', end: '2025-01-01T12:00:00Z' });
      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(2);
    });
  });

  describe('getIncidentHotspotAggregates', () => {
    it('returns aggregated hotspots', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);

      const mockRows = [
        { cellId: 'sq_1_1_r4', geometry: {}, centroidCoordinates: [0, 0], incidentCount: 10, mostFrequentType: 'Fire' }
      ];

      queryBuilder.then.mockImplementation((resolve: any) => Promise.resolve(mockRows).then(resolve));

      const result = await repository.getIncidentHotspotAggregates({}, { cellSizeMeters: 1000, resolution: 4 });

      expect(result).toHaveLength(1);
      expect(result[0].incidentCount).toBe(10);
    });
  });

  describe('getResponseTimeMetrics', () => {
    it('calculates metrics by station', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);

      const mockRows = [
        { stationCode: 'ST1', stationName: 'Station 1', sampleSize: 10, averageSeconds: 300, medianSeconds: 250, p90Seconds: 500 }
      ];
      queryBuilder.then.mockImplementation((resolve: any) => Promise.resolve(mockRows).then(resolve));

      const result = await repository.getResponseTimeMetrics({}, { groupBy: 'station' });

      expect(result).toHaveLength(1);
      expect((result[0] as any).stationCode).toBe('ST1');
    });

    it('calculates metrics by grid', async () => {
        const { db, queryBuilder } = createMockDb();
        const repository = new IncidentRepository(db);

        const mockRows = [
          { cellId: 'sq_1_1', sampleSize: 5, averageSeconds: 400, medianSeconds: 350, p90Seconds: 600 }
        ];
        queryBuilder.then.mockImplementation((resolve: any) => Promise.resolve(mockRows).then(resolve));

        const result = await repository.getResponseTimeMetrics({}, { groupBy: 'grid' });

        expect(result).toHaveLength(1);
        expect((result[0] as any).cellId).toBe('sq_1_1');
    });
  });

  describe('getStationCoverageBuffers', () => {
    it('returns station coverage', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);

      const mockRows = [
        {
            stationCode: 'ST1',
            stationName: 'Station 1',
            isActive: true,
            radiusMeters: 5000,
            incidentCount: 10,
            locationGeoJson: { type: 'Point', coordinates: [0, 0] },
            bufferGeoJson: { type: 'Polygon', coordinates: [[[0,0], [1,1], [1,0], [0,0]]] }
        }
      ];
      queryBuilder.then.mockImplementation((resolve: any) => Promise.resolve(mockRows).then(resolve));

      const result = await repository.getStationCoverageBuffers({});

      expect(result).toHaveLength(1);
      expect(result[0].stationCode).toBe('ST1');
      expect(result[0].coverage).toBeDefined();
    });
  });

  describe('getPriorityScores', () => {
      it('calculates priority scores by station', async () => {
        const { db, queryBuilder } = createMockDb();
        const repository = new IncidentRepository(db);

        const mockRows = [
            { stationCode: 'ST1', stationName: 'S1', totalIncidents: 10, rawScore: 100, weightSum: 10, averageSeverity: 10 }
        ];
        queryBuilder.then.mockImplementation((resolve: any) => Promise.resolve(mockRows).then(resolve));

        const result = await repository.getPriorityScores({}, { groupBy: 'station' });
        expect(result).toHaveLength(1);
        expect((result[0] as any).rawScore).toBe(100);
      });
  });

  // NEW TESTS FOR MISSING METHODS

  describe('listIncidentsForMap', () => {
    it('lists map incidents', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);
      const mockRow = {
        incidentNumber: 'INC-001',
        title: 'Test',
        occurrenceAt: '2025-01-01T00:00:00Z',
        reportedAt: '2025-01-01T00:05:00Z',
        isActive: true,
        typeCode: 'FIRE',
        severityCode: 'HIGH',
        statusCode: 'REPORTED',
        locationGeoJson: { type: 'Point', coordinates: [0, 0] },
      };
      queryBuilder.count.mockResolvedValue([{ total: '1' }]);
      queryBuilder.then.mockImplementation((resolve: any) => Promise.resolve([mockRow]).then(resolve));

      const result = await repository.listIncidentsForMap({});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getSyncStatus', () => {
    it('returns sync status', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);
      queryBuilder.first.mockResolvedValue({ lastModified: '2025-01-01', count: '100' });

      const status = await repository.getSyncStatus();
      expect(status.count).toBe(100);
      expect(status.lastModified).toBe('2025-01-01T00:00:00.000Z');
    });
  });

  describe('getChangesSince', () => {
    it('returns changed incidents', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);
      const mockRow = {
        incidentNumber: 'INC-001',
        title: 'Test',
        occurrenceAt: '2025-01-01T00:00:00Z',
        reportedAt: '2025-01-01T00:05:00Z',
        isActive: true,
        typeCode: 'FIRE',
        severityCode: 'HIGH',
        statusCode: 'REPORTED',
        locationGeoJson: { type: 'Point', coordinates: [0, 0] },
      };
      queryBuilder.then.mockImplementation((resolve: any) => Promise.resolve([mockRow]).then(resolve));

      const result = await repository.getChangesSince('2025-01-01');
      expect(result).toHaveLength(1);
    });
  });

  describe('deleteIncident', () => {
    it('deletes incident (soft delete)', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);
      queryBuilder.update.mockResolvedValue(1);

      await repository.deleteIncident('INC-001');
      expect(queryBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ deleted_at: expect.anything() }));
    });

    it('throws if incident not found', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);
      queryBuilder.update.mockResolvedValue(0);

      await expect(repository.deleteIncident('INC-404')).rejects.toThrow();
    });
  });

  describe('findIncidentSummary', () => {
    it('finds incident summary', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);
      const mockRow = {
        incidentNumber: 'INC-001',
        title: 'Test',
        occurrenceAt: '2025-01-01T00:00:00Z',
        reportedAt: '2025-01-01T00:05:00Z',
        isActive: true,
        typeCode: 'FIRE',
        severityCode: 'HIGH',
        statusCode: 'REPORTED',
        locationGeoJson: { type: 'Point', coordinates: [0, 0] },
      };
      queryBuilder.first.mockResolvedValue(mockRow);

      const result = await repository.findIncidentSummary('INC-001');
      expect(result).not.toBeNull();
      expect(result?.incidentNumber).toBe('INC-001');
    });
  });

  describe('getIncidentCountsByType', () => {
    it('counts by type', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);
      const mockRows = [{ typeCode: 'FIRE', typeName: 'Fire', total: '10' }];
      queryBuilder.then.mockImplementation((resolve: any) => Promise.resolve(mockRows).then(resolve));

      const result = await repository.getIncidentCountsByType({});
      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(10);
    });
  });

  describe('getSeverityDistribution', () => {
    it('returns severity distribution', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);
      const mockRows = [{ severityCode: 'HIGH', severityName: 'High', total: '5' }];
      queryBuilder.then.mockImplementation((resolve: any) => Promise.resolve(mockRows).then(resolve));

      const result = await repository.getSeverityDistribution({});
      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(5);
    });
  });

  describe('getIncidentCountsByReportedMonth', () => {
    it('returns monthly counts', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);
      const mockRows = [{ bucketMonth: '2025-01-01T00:00:00Z', total: '10' }];
      queryBuilder.then.mockImplementation((resolve: any) => Promise.resolve(mockRows).then(resolve));

      const result = await repository.getIncidentCountsByReportedMonth({}, { start: '2025-01-01', end: '2025-02-01' });
      expect(result).toHaveLength(1);
    });
  });

  describe('getIncidentCountsByReportedQuarter', () => {
    it('returns quarterly counts', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);
      const mockRows = [{ bucketQuarter: '2025-01-01T00:00:00Z', year: 2025, quarter: 1, total: '20' }];
      queryBuilder.then.mockImplementation((resolve: any) => Promise.resolve(mockRows).then(resolve));

      const result = await repository.getIncidentCountsByReportedQuarter({}, { start: '2025-01-01', end: '2025-04-01' });
      expect(result).toHaveLength(1);
    });
  });

  describe('getIncidentTypeTimeline', () => {
    it('returns timeline', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);
      const mockRows = [{ bucketMonth: '2025-01-01T00:00:00Z', typeCode: 'FIRE', typeName: 'Fire', total: '5' }];
      queryBuilder.then.mockImplementation((resolve: any) => Promise.resolve(mockRows).then(resolve));

      const result = await repository.getIncidentTypeTimeline({}, { start: '2025-01-01', end: '2025-02-01' });
      expect(result).toHaveLength(1);
    });
  });

  describe('listRecentIncidents', () => {
    it('lists recent incidents', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);
      const mockRow = {
        incidentNumber: 'INC-001',
        title: 'Test',
        occurrenceAt: '2025-01-01T00:00:00Z',
        reportedAt: '2025-01-01T00:05:00Z',
        isActive: true,
        typeCode: 'FIRE',
        severityCode: 'HIGH',
        statusCode: 'REPORTED',
        locationGeoJson: { type: 'Point', coordinates: [0, 0] },
      };
      queryBuilder.then.mockImplementation((resolve: any) => Promise.resolve([mockRow]).then(resolve));

      const result = await repository.listRecentIncidents({});
      expect(result).toHaveLength(1);
    });
  });

  describe('getZoneFrequency', () => {
    it('returns zone frequency', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);
      const mockRows = [{ zoneName: 'Zone 1', count: '10' }];
      queryBuilder.then.mockImplementation((resolve: any) => Promise.resolve(mockRows).then(resolve));

      const result = await repository.getZoneFrequency({});
      expect(result).toHaveLength(1);
    });
  });

  describe('getStationIncidentCounts', () => {
    it('returns station counts', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);
      const mockRows = [{ stationCode: 'ST1', stationName: 'S1', count: '15' }];
      queryBuilder.then.mockImplementation((resolve: any) => Promise.resolve(mockRows).then(resolve));

      const result = await repository.getStationIncidentCounts({});
      expect(result).toHaveLength(1);
    });
  });

  describe('getMostFrequentIncidentTypesByDistrict', () => {
    it('returns district frequencies', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);
      const mockRows = [{ district: 'D1', typeName: 'Fire', count: '5' }];
      queryBuilder.then.mockImplementation((resolve: any) => Promise.resolve(mockRows).then(resolve));

      const result = await repository.getMostFrequentIncidentTypesByDistrict({});
      expect(result).toHaveLength(1);
    });
  });

  describe('createIncidentExportStream', () => {
    it('returns a stream', () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new IncidentRepository(db);
      const mockStream = { pipe: jest.fn().mockReturnThis(), on: jest.fn() };
      queryBuilder.stream.mockReturnValue(mockStream);

      const stream = repository.createIncidentExportStream({}, { limit: 10 });
      expect(stream).toBeDefined();
    });
  });
});
