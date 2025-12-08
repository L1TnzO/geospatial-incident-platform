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
    stream: jest.fn(),
    then: jest.fn().mockImplementation((callback) => Promise.resolve([]).then(callback)),
  };

  // Make the query builder awaitable
  queryBuilder.catch = jest.fn();
  queryBuilder.finally = jest.fn();

  const db = jest.fn(() => queryBuilder) as unknown as Knex;
  db.raw = jest.fn((sql) => sql) as any;
  db.fn = { now: jest.fn() } as any;
  db.transaction = jest.fn((callback) => callback(db)) as any; // Simple transaction mock

  return { db, queryBuilder };
};

describe('IncidentRepository', () => {
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

      // Mock first() call for main query
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

      // Mock count query
      queryBuilder.count.mockResolvedValue([{ total: '1' }]);

      // Mock list query
      queryBuilder.then.mockImplementation((resolve: any) => Promise.resolve([mockRow]).then(resolve));

      const result = await repository.listIncidents({ page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].incidentNumber).toBe('INC-001');
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

      // Mock lookups
      queryBuilder.first.mockResolvedValue({ id: 1 });

      // Mock insert
      queryBuilder.insert.mockReturnThis();
      queryBuilder.returning.mockResolvedValue([{ incident_number: 'INC-NEW' }]);

      (db as unknown as jest.Mock).mockImplementation((tableName: string) => {
          if (tableName === 'incidents as i') {
              // This is getIncidentDetail
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
               // Make the query builder awaitable
               detailQueryBuilder.catch = jest.fn();
               detailQueryBuilder.finally = jest.fn();
               detailQueryBuilder.then = jest.fn().mockImplementation((cb: any) => Promise.resolve([]).then(cb));

              return detailQueryBuilder;
          }
          return queryBuilder;
      });

      const result = await repository.createIncident(input);

      expect(result.incidentNumber).toBe('INC-NEW');
      expect(db).toHaveBeenCalledWith('incidents'); // insert
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
});
