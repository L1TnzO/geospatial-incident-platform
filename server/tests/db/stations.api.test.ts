import request from 'supertest';
import type { Knex } from 'knex';
import createApp from '../../src/app';
import { closeDb, getDb, type StationSummary } from '../../src/db';
import { pointWkt, purgeTestRecords } from './testUtils';

const TEST_PREFIX = 'TEST_TASK_3_2';

describe('Stations API', () => {
  let db: Knex;
  let app: ReturnType<typeof createApp>;
  let dbReady = true;

  const requireDb = () => {
    if (!dbReady) {
      console.warn('Database unavailable for stations API tests; skipping assertions.');
    }
    return dbReady;
  };

  beforeAll(async () => {
    app = createApp();
    db = getDb();

    try {
      await db.raw('select 1');
    } catch (error) {
      dbReady = false;
      console.warn('Skipping stations API tests: database connection failed', error);
      return;
    }

    await db.migrate.latest();
    await db.seed.run();
    await purgeTestRecords(db, TEST_PREFIX);

    await seedStations(db);
  }, 60000);

  afterAll(async () => {
    if (dbReady) {
      await purgeTestRecords(db, TEST_PREFIX);
    }
    await closeDb();
  });

  test('returns all stations', async () => {
    if (!requireDb()) {
      return;
    }
    const response = await request(app).get('/api/stations');

    expect(response.status).toBe(200);
    const body = response.body as { data: StationSummary[] };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(3);
    body.data.forEach((station) => {
      expect(station).toHaveProperty('stationCode');
      expect(station.location).toMatchObject({ type: 'Feature' });
    });
  });

  test('filters by isActive', async () => {
    if (!requireDb()) {
      return;
    }
    const response = await request(app).get('/api/stations').query({ isActive: true });

    expect(response.status).toBe(200);
    const body = response.body as { data: StationSummary[] };
    expect(body.data.length).toBeGreaterThan(0);
    body.data.forEach((station) => {
      expect(station.isActive).toBe(true);
    });
  });

  test('returns 400 for invalid boolean', async () => {
    if (!requireDb()) {
      return;
    }
    const response = await request(app).get('/api/stations').query({ isActive: 'maybe' });

    expect(response.status).toBe(400);
    const body = response.body as { error: { code: string } };
    expect(body.error.code).toBe('BAD_REQUEST');
  });
});

const seedStations = async (db: Knex): Promise<void> => {
  const suffix = Date.now().toString(36);

  const [zone] = await db('response_zones')
    .insert({
      zone_code: `${TEST_PREFIX}_ZONE_${suffix}`,
      name: `${TEST_PREFIX} Zone ${suffix}`,
      boundary: db.raw('ST_GeomFromText(?, 4326)', [
        'MULTIPOLYGON(((-122.6 37.6, -122.3 37.6, -122.3 37.9, -122.6 37.9, -122.6 37.6)))',
      ]),
    })
    .returning<{ id: number }[]>('id');

  const stationConfigs = [
    { code: 'ALPHA', isActive: true, lng: -122.45, lat: 37.78 },
    { code: 'BRAVO', isActive: true, lng: -122.44, lat: 37.76 },
    { code: 'CHARLIE', isActive: false, lng: -122.42, lat: 37.74 },
  ];

  for (const config of stationConfigs) {
    await db('stations').insert({
      station_code: `${TEST_PREFIX}_STATION_${config.code}_${suffix}`,
      name: `${TEST_PREFIX} Station ${config.code}`,
      battalion: 'B9',
      phone: '555-0199',
      is_active: config.isActive,
      response_zone_id: zone.id,
      location: db.raw('ST_GeomFromText(?, 4326)', [pointWkt(config.lng, config.lat)]),
      coverage_radius_meters: 5000,
    });
  }
};
