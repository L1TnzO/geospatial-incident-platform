import { StationRepository } from '../../src/db/repositories/stationsRepository';
import type { Knex } from 'knex';

const createMockDb = () => {
  const queryBuilder: any = {
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    then: jest.fn().mockImplementation((callback) => {
      // Return a promise that resolves to empty array by default
      return Promise.resolve([]).then(callback);
    }),
  };

  // Make the query builder awaitable
  queryBuilder.catch = jest.fn();
  queryBuilder.finally = jest.fn();

  const db = jest.fn(() => queryBuilder) as unknown as Knex;
  db.raw = jest.fn((sql) => sql) as any;
  return { db, queryBuilder };
};

describe('StationRepository', () => {
  describe('listStations', () => {
    it('fetches stations and maps them correctly', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new StationRepository(db);

      const mockRow = {
        stationCode: 'ST-01',
        name: 'Station 1',
        battalion: 'B1',
        phone: '555-0101',
        addressLine1: '123 Main St',
        addressLine2: null,
        city: 'Metropolis',
        region: 'NY',
        postalCode: '10001',
        isActive: true,
        commissionedOn: '2020-01-01T00:00:00Z',
        decommissionedOn: null,
        coverageRadiusMeters: 5000,
        zoneCode: 'Z1',
        zoneName: 'Zone 1',
        locationGeoJson: { type: 'Point', coordinates: [0, 0] },
        responseZoneGeoJson: { type: 'MultiPolygon', coordinates: [[[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]] },
      };

      // Mock the resolution of the promise
      queryBuilder.then.mockImplementation((resolve: any) => {
          return Promise.resolve([mockRow]).then(resolve);
      });

      const result = await repository.listStations();

      expect(result).toHaveLength(1);
      expect(result[0].stationCode).toBe('ST-01');
      expect(result[0].name).toBe('Station 1');
      expect(result[0].location).toEqual({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: {},
      });
      expect(result[0].responseZone).toEqual({
        zoneCode: 'Z1',
        name: 'Zone 1',
        boundary: {
          type: 'Feature',
          geometry: { type: 'MultiPolygon', coordinates: [[[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]] },
          properties: {},
        },
      });
      expect(db).toHaveBeenCalledWith('stations as s');
      expect(queryBuilder.leftJoin).toHaveBeenCalledWith('response_zones as rz', 's.response_zone_id', 'rz.id');
    });

    it('filters by isActive', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new StationRepository(db);

      await repository.listStations({ isActive: true });

      expect(queryBuilder.where).toHaveBeenCalledWith('s.is_active', true);
    });

    it('handles missing response zone', async () => {
        const { db, queryBuilder } = createMockDb();
        const repository = new StationRepository(db);

        const mockRow = {
          stationCode: 'ST-01',
          name: 'Station 1',
          isActive: true,
          locationGeoJson: { type: 'Point', coordinates: [0, 0] },
          zoneCode: null,
          zoneName: null,
          responseZoneGeoJson: null,
        };

        queryBuilder.then.mockImplementation((resolve: any) => {
            return Promise.resolve([mockRow]).then(resolve);
        });

        const result = await repository.listStations();

        expect(result[0].responseZone).toBeNull();
      });

    it('throws if location geometry is missing', async () => {
      const { db, queryBuilder } = createMockDb();
      const repository = new StationRepository(db);

      const mockRow = {
        stationCode: 'ST-01',
        locationGeoJson: null,
      };

      queryBuilder.then.mockImplementation((resolve: any) => {
        return Promise.resolve([mockRow]).then(resolve);
      });

      await expect(repository.listStations()).rejects.toThrow('Station location geometry is missing');
    });

    it('throws if response zone geometry is missing but zone code exists', async () => {
        const { db, queryBuilder } = createMockDb();
        const repository = new StationRepository(db);

        const mockRow = {
          stationCode: 'ST-01',
          locationGeoJson: { type: 'Point', coordinates: [0, 0] },
          zoneCode: 'Z1',
          responseZoneGeoJson: null,
        };

        queryBuilder.then.mockImplementation((resolve: any) => {
            return Promise.resolve([mockRow]).then(resolve);
        });

        await expect(repository.listStations()).rejects.toThrow('Response zone boundary geometry is missing');
      });
  });
});
