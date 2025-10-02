import request from 'supertest';
import type { Knex } from 'knex';
import createApp from '../../src/app';
import {
  closeDb,
  getDb,
  type IncidentListItem,
  type PaginationMeta,
  type StationSummary,
} from '../../src/db';
import { getLookupId, iso, pointWkt, polygonWkt, purgeTestRecords } from './testUtils';

const TEST_PREFIX = 'TEST_TASK_3_8';

interface SeededDataset {
  activeStation: { id: number; stationCode: string };
  inactiveStation: { id: number; stationCode: string };
  incidents: Array<{
    incidentNumber: string;
    severityCode: string;
    isActive: boolean;
  }>;
}

interface IncidentsResponse {
  data: IncidentListItem[];
  pagination: PaginationMeta;
}

interface StationsResponse {
  data: StationSummary[];
}

const assertIncidentsResponse: (payload: unknown) => asserts payload is IncidentsResponse = (
  payload
) => {
  expect(payload).toBeDefined();
  expect(typeof payload).toBe('object');
  const candidate = payload as Partial<IncidentsResponse> | null;
  expect(Array.isArray(candidate?.data)).toBe(true);
  expect(candidate?.pagination).toBeDefined();
};

const assertStationsResponse: (payload: unknown) => asserts payload is StationsResponse = (
  payload
) => {
  expect(payload).toBeDefined();
  expect(typeof payload).toBe('object');
  const candidate = payload as Partial<StationsResponse> | null;
  expect(Array.isArray(candidate?.data)).toBe(true);
};

describe('Map integration API', () => {
  let db: Knex;
  let app: ReturnType<typeof createApp>;
  let dataset: SeededDataset;
  let dbReady = true;

  const requireDb = () => {
    if (!dbReady) {
      console.warn('Database unavailable for map integration tests; skipping assertions.');
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
      console.warn('Skipping map integration API tests: database connection failed', error);
      return;
    }

    await db.migrate.latest();
    await db.seed.run();
    await purgeTestRecords(db, TEST_PREFIX);

    dataset = await seedDataset(db);
  }, 60000);

  afterAll(async () => {
    if (dbReady) {
      await purgeTestRecords(db, TEST_PREFIX);
    }
    await closeDb();
  });

  test('exposes incidents and stations with shared references and GeoJSON payloads', async () => {
    if (!requireDb()) {
      return;
    }
    const incidentsResponse = await request(app)
      .get('/api/incidents')
      .query({ pageSize: 25, isActive: true, typeCodes: 'FIRE_STRUCTURE' })
      .expect(200);

    const incidentsPayload = incidentsResponse.body as unknown;
    assertIncidentsResponse(incidentsPayload);
    const incidentsBody: IncidentsResponse = incidentsPayload;
    expect(Array.isArray(incidentsBody.data)).toBe(true);
    expect(incidentsBody.data.length).toBeGreaterThanOrEqual(1);

    const targetIncident = incidentsBody.data.find(
      (incident: IncidentListItem) =>
        incident.incidentNumber === dataset.incidents[0]?.incidentNumber
    );
    expect(targetIncident).toBeDefined();
    expect(targetIncident?.primaryStation?.stationCode).toBe(dataset.activeStation.stationCode);
    expect(targetIncident?.location.type).toBe('Feature');
    expect(targetIncident?.location.geometry.type).toBe('Point');

    const stationsResponse = await request(app).get('/api/stations').expect(200);
    const stationsPayload = stationsResponse.body as unknown;
    assertStationsResponse(stationsPayload);
    const stationsBody: StationsResponse = stationsPayload;
    expect(Array.isArray(stationsBody.data)).toBe(true);
    expect(stationsBody.data.length).toBeGreaterThanOrEqual(2);

    const activeStation = stationsBody.data.find(
      (station: StationSummary) => station.stationCode === dataset.activeStation.stationCode
    );
    expect(activeStation).toBeDefined();
    expect(activeStation?.location.geometry.type).toBe('Point');
    expect(activeStation?.responseZone?.boundary.geometry.type).toBe('MultiPolygon');
  });

  test('supports map filters for severity and station activity', async () => {
    if (!requireDb()) {
      return;
    }
    const filteredIncidentResponse = await request(app)
      .get('/api/incidents')
      .query({
        severityCodes: dataset.incidents[0]?.severityCode,
        isActive: true,
        pageSize: 10,
      })
      .expect(200);

    const filteredPayload = filteredIncidentResponse.body as unknown;
    assertIncidentsResponse(filteredPayload);
    const filteredBody: IncidentsResponse = filteredPayload;
    expect(filteredBody.data.length).toBe(1);
    expect(filteredBody.data[0]?.incidentNumber).toBe(dataset.incidents[0]?.incidentNumber);
    filteredBody.data.forEach((item: IncidentListItem) => {
      expect(item.severity.code).toBe(dataset.incidents[0]?.severityCode);
      expect(item.isActive).toBe(true);
    });

    const inactiveStationsResponse = await request(app)
      .get('/api/stations')
      .query({ isActive: false })
      .expect(200);

    const inactiveStationsPayload = inactiveStationsResponse.body as unknown;
    assertStationsResponse(inactiveStationsPayload);
    const inactiveStationsBody: StationsResponse = inactiveStationsPayload;
    expect(inactiveStationsBody.data.length).toBe(1);
    expect(inactiveStationsBody.data[0]?.stationCode).toBe(dataset.inactiveStation.stationCode);
    inactiveStationsBody.data.forEach((station: StationSummary) => {
      expect(station.isActive).toBe(false);
    });
  });
});

const seedDataset = async (db: Knex): Promise<SeededDataset> => {
  const suffix = Date.now().toString(36);

  const [zone] = await db('response_zones')
    .insert({
      zone_code: `${TEST_PREFIX}_ZONE_${suffix}`,
      name: `${TEST_PREFIX} Zone`,
      boundary: db.raw('ST_GeomFromText(?, 4326)', [polygonWkt]),
    })
    .returning<{ id: number }[]>('id');

  const [activeStation] = await db('stations')
    .insert({
      station_code: `${TEST_PREFIX}_ACTIVE_${suffix}`,
      name: `${TEST_PREFIX} Active Station`,
      is_active: true,
      response_zone_id: zone.id,
      location: db.raw('ST_GeomFromText(?, 4326)', [pointWkt(-122.41, 37.77)]),
      coverage_radius_meters: 4800,
    })
    .returning<{ id: number; station_code: string }[]>(['id', 'station_code']);

  const [inactiveStation] = await db('stations')
    .insert({
      station_code: `${TEST_PREFIX}_INACTIVE_${suffix}`,
      name: `${TEST_PREFIX} Inactive Station`,
      is_active: false,
      response_zone_id: zone.id,
      location: db.raw('ST_GeomFromText(?, 4326)', [pointWkt(-122.4, 37.75)]),
      coverage_radius_meters: 4200,
    })
    .returning<{ id: number; station_code: string }[]>(['id', 'station_code']);

  const typeStructure = await getLookupId(db, 'incident_types', 'type_code', 'FIRE_STRUCTURE');
  const typeMedical = await getLookupId(db, 'incident_types', 'type_code', 'MEDICAL');
  const severityCritical = await getLookupId(
    db,
    'incident_severities',
    'severity_code',
    'CRITICAL'
  );
  const severityModerate = await getLookupId(
    db,
    'incident_severities',
    'severity_code',
    'MODERATE'
  );
  const statusOnScene = await getLookupId(db, 'incident_statuses', 'status_code', 'ON_SCENE');
  const statusResolved = await getLookupId(db, 'incident_statuses', 'status_code', 'RESOLVED');
  const sourceId = await getLookupId(db, 'incident_sources', 'source_code', '911');
  const weatherId = await getLookupId(db, 'weather_conditions', 'condition_code', 'CLEAR');

  const activeIncidentNumber = `${TEST_PREFIX}-INC-A-${suffix}`;
  const inactiveIncidentNumber = `${TEST_PREFIX}-INC-B-${suffix}`;

  await db('incidents').insert([
    {
      incident_number: activeIncidentNumber,
      title: `${TEST_PREFIX} Critical Fire`,
      type_id: typeStructure,
      severity_id: severityCritical,
      status_id: statusOnScene,
      source_id: sourceId,
      weather_condition_id: weatherId,
      primary_station_id: activeStation.id,
      occurrence_at: iso('2025-09-20T10:00:00Z'),
      reported_at: iso('2025-09-20T10:05:00Z'),
      dispatch_at: iso('2025-09-20T10:07:00Z'),
      arrival_at: iso('2025-09-20T10:15:00Z'),
      resolved_at: null,
      is_active: true,
      casualty_count: 1,
      responder_injuries: 0,
      estimated_damage_amount: '250000.00',
      location: db.raw('ST_GeomFromText(?, 4326)', [pointWkt(-122.409, 37.771)]),
      location_geohash: '9q8yy',
      metadata: db.raw('?::jsonb', [JSON.stringify({ wind_speed: 12 })]),
    },
    {
      incident_number: inactiveIncidentNumber,
      title: `${TEST_PREFIX} Resolved Medical`,
      type_id: typeMedical,
      severity_id: severityModerate,
      status_id: statusResolved,
      source_id: sourceId,
      weather_condition_id: weatherId,
      primary_station_id: inactiveStation.id,
      occurrence_at: iso('2025-09-18T08:00:00Z'),
      reported_at: iso('2025-09-18T08:03:00Z'),
      dispatch_at: iso('2025-09-18T08:05:00Z'),
      arrival_at: iso('2025-09-18T08:12:00Z'),
      resolved_at: iso('2025-09-18T09:30:00Z'),
      is_active: false,
      casualty_count: 0,
      responder_injuries: 0,
      estimated_damage_amount: null,
      location: db.raw('ST_GeomFromText(?, 4326)', [pointWkt(-122.403, 37.769)]),
      location_geohash: '9q8yx',
      metadata: db.raw('?::jsonb', [JSON.stringify({ wind_speed: 6 })]),
    },
  ]);

  return {
    activeStation: { id: activeStation.id, stationCode: activeStation.station_code },
    inactiveStation: { id: inactiveStation.id, stationCode: inactiveStation.station_code },
    incidents: [
      { incidentNumber: activeIncidentNumber, severityCode: 'CRITICAL', isActive: true },
      { incidentNumber: inactiveIncidentNumber, severityCode: 'MODERATE', isActive: false },
    ],
  };
};
