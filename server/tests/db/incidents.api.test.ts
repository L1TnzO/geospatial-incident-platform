import request from 'supertest';
import type { Knex } from 'knex';
import createApp from '../../src/app';
import {
  closeDb,
  getDb,
  type IncidentDetail,
  type IncidentListItem,
  type PaginationMeta,
} from '../../src/db';
import { getLookupId, iso, pointWkt, purgeTestRecords } from './testUtils';

const TEST_PREFIX = 'TEST_TASK_3_1';
const INCIDENT_COUNT = 12;

interface SeededIncident {
  incidentNumber: string;
  occurrenceAt: Date;
  severityCode: string;
  isActive: boolean;
}

interface IncidentsListResponse {
  data: IncidentListItem[];
  pagination: PaginationMeta;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

describe('Incidents API', () => {
  let db: Knex;
  let app: ReturnType<typeof createApp>;
  let seededIncidents: SeededIncident[] = [];

  beforeAll(async () => {
    app = createApp();
    db = getDb();

    await db.migrate.latest();
    await db.seed.run();
    await purgeTestRecords(db, TEST_PREFIX);

    seededIncidents = await seedIncidents(db);
  }, 60000);

  afterAll(async () => {
    await purgeTestRecords(db, TEST_PREFIX);
    await closeDb();
  });

  test('returns paginated incidents list with default parameters', async () => {
    const response = await request(app).get('/api/incidents');

    expect(response.status).toBe(200);
    const body = response.body as IncidentsListResponse;
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('pagination');

    const { data, pagination } = body;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(seededIncidents.length);
    expect(pagination.page).toBe(1);
    expect(pagination.pageSize).toBeGreaterThanOrEqual(seededIncidents.length);
    expect(pagination.total).toBeGreaterThanOrEqual(seededIncidents.length);

    const sortedIncidents = [...seededIncidents].sort(
      (a, b) => b.occurrenceAt.getTime() - a.occurrenceAt.getTime()
    );
    expect(data[0]?.incidentNumber).toBe(sortedIncidents[0]?.incidentNumber);
    expect(data[0]?.location).toMatchObject({ type: 'Feature' });
  });

  test('supports pagination and filters', async () => {
    const response = await request(app)
      .get('/api/incidents')
      .query({ page: 2, pageSize: 5, severityCodes: 'CRITICAL', isActive: true });

    expect(response.status).toBe(200);

    const { data, pagination } = response.body as IncidentsListResponse;
    expect(pagination.page).toBe(2);
    expect(pagination.pageSize).toBe(5);
    expect(Array.isArray(data)).toBe(true);
    data.forEach((item: IncidentListItem) => {
      expect(item.severity.code).toBe('CRITICAL');
      expect(item.isActive).toBe(true);
    });
  });

  test('rejects requests exceeding the 5,000 record window', async () => {
    const response = await request(app).get('/api/incidents').query({ page: 51, pageSize: 100 });

    expect(response.status).toBe(400);
    const body = response.body as ErrorResponse;
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  test('returns incident detail with related collections', async () => {
    const targetIncident = seededIncidents[0];
    const response = await request(app).get(`/api/incidents/${targetIncident.incidentNumber}`);

    expect(response.status).toBe(200);
    const detail = response.body as IncidentDetail;
    expect(detail.incidentNumber).toBe(targetIncident.incidentNumber);
    expect(Array.isArray(detail.units)).toBe(true);
    expect(Array.isArray(detail.assets)).toBe(true);
    expect(Array.isArray(detail.notes)).toBe(true);
    expect(detail.location).toMatchObject({ type: 'Feature' });
  });

  test('returns 404 when incident is missing', async () => {
    const response = await request(app).get('/api/incidents/UNKNOWN-INCIDENT');

    expect(response.status).toBe(404);
    const body = response.body as ErrorResponse;
    expect(body.error.code).toBe('NOT_FOUND');
  });

  test('returns 400 for invalid query parameters', async () => {
    const response = await request(app).get('/api/incidents').query({ page: 'abc' });

    expect(response.status).toBe(400);
    const body = response.body as ErrorResponse;
    expect(body.error.code).toBe('BAD_REQUEST');
  });
});

const seedIncidents = async (db: Knex): Promise<SeededIncident[]> => {
  const suffix = Date.now().toString(36);

  const [zone] = await db('response_zones')
    .insert({
      zone_code: `${TEST_PREFIX}_ZONE_${suffix}`,
      name: `${TEST_PREFIX} Zone ${suffix}`,
      boundary: db.raw('ST_GeomFromText(?, 4326)', [
        'MULTIPOLYGON(((-122.5 37.7, -122.3 37.7, -122.3 37.9, -122.5 37.9, -122.5 37.7)))',
      ]),
    })
    .returning<{ id: number }[]>('id');

  const stationConfigs = [
    { suffix: 'A', isActive: true, lng: -122.41, lat: 37.77 },
    { suffix: 'B', isActive: false, lng: -122.4, lat: 37.75 },
  ];

  const stations = [] as Array<{ id: number; stationCode: string; isActive: boolean }>;

  for (const config of stationConfigs) {
    const [station] = await db('stations')
      .insert({
        station_code: `${TEST_PREFIX}_STATION_${config.suffix}_${suffix}`,
        name: `${TEST_PREFIX} Station ${config.suffix}`,
        is_active: config.isActive,
        response_zone_id: zone.id,
        location: db.raw('ST_GeomFromText(?, 4326)', [pointWkt(config.lng, config.lat)]),
        coverage_radius_meters: 5000,
      })
      .returning<{ id: number; station_code: string; is_active: boolean }[]>([
        'id',
        'station_code',
        'is_active',
      ]);
    stations.push({
      id: station.id,
      stationCode: station.station_code,
      isActive: station.is_active,
    });
  }

  const typeCodes = ['FIRE_STRUCTURE', 'MEDICAL'];
  const severityCodes = ['LOW', 'MODERATE', 'CRITICAL'];
  const statusCodes = ['REPORTED', 'ON_SCENE', 'RESOLVED'];

  const typeIdMap = await buildLookupMap(db, 'incident_types', 'type_code', typeCodes);
  const severityIdMap = await buildLookupMap(
    db,
    'incident_severities',
    'severity_code',
    severityCodes
  );
  const statusIdMap = await buildLookupMap(db, 'incident_statuses', 'status_code', statusCodes);
  const sourceId = await getLookupId(db, 'incident_sources', 'source_code', '911');
  const weatherId = await getLookupId(db, 'weather_conditions', 'condition_code', 'CLEAR');

  const baseTime = new Date('2025-09-01T00:00:00Z').getTime();
  const incidents: SeededIncident[] = [];

  const unitsToInsert: Array<{
    incident_id: number;
    station_id: number;
    assignment_role: string;
    dispatched_at: string;
    cleared_at: string | null;
  }> = [];

  const notesToInsert: Array<{
    incident_id: number;
    author: string;
    note: string;
    created_at: string;
  }> = [];

  for (let i = 0; i < INCIDENT_COUNT; i += 1) {
    const severityCode = severityCodes[i % severityCodes.length];
    const statusCode = statusCodes[i % statusCodes.length];
    const typeCode = typeCodes[i % typeCodes.length];
    const station = stations[i % stations.length];
    const isActive = statusCode !== 'RESOLVED';
    const occurrenceAt = new Date(baseTime + i * 60 * 60 * 1000);
    const incidentNumber = `${TEST_PREFIX}-INC-${i.toString().padStart(3, '0')}-${suffix}`;

    const [inserted] = await db('incidents')
      .insert({
        incident_number: incidentNumber,
        title: `${severityCode} ${typeCode} Incident ${i}`,
        type_id: typeIdMap.get(typeCode),
        severity_id: severityIdMap.get(severityCode),
        status_id: statusIdMap.get(statusCode),
        source_id: sourceId,
        weather_condition_id: weatherId,
        primary_station_id: station.id,
        occurrence_at: occurrenceAt,
        reported_at: iso(new Date(occurrenceAt.getTime() + 5 * 60 * 1000)),
        dispatch_at: iso(new Date(occurrenceAt.getTime() + 8 * 60 * 1000)),
        arrival_at: iso(new Date(occurrenceAt.getTime() + 15 * 60 * 1000)),
        resolved_at: isActive ? null : iso(new Date(occurrenceAt.getTime() + 90 * 60 * 1000)),
        is_active: isActive,
        casualty_count: i % 3,
        responder_injuries: i % 2,
        location: db.raw('ST_GeomFromText(?, 4326)', [
          pointWkt(-122.41 + (i % 4) * 0.01, 37.74 + (i % 3) * 0.01),
        ]),
        location_geohash: `9q8y${(i % 10).toString(36)}`,
        metadata: db.raw('?::jsonb', [JSON.stringify({ checksum: i })]),
      })
      .returning<{ id: number }[]>('id');

    incidents.push({ incidentNumber, occurrenceAt, severityCode, isActive });

    unitsToInsert.push({
      incident_id: inserted.id,
      station_id: station.id,
      assignment_role: 'Primary',
      dispatched_at: iso(new Date(occurrenceAt.getTime() + 8 * 60 * 1000)),
      cleared_at: isActive ? null : iso(new Date(occurrenceAt.getTime() + 95 * 60 * 1000)),
    });

    notesToInsert.push({
      incident_id: inserted.id,
      author: 'Unit Test',
      note: `Note ${i}`,
      created_at: iso(new Date(occurrenceAt.getTime() + 20 * 60 * 1000)),
    });
  }

  await db('incident_units').insert(unitsToInsert);
  await db('incident_notes').insert(notesToInsert);

  return incidents;
};

const buildLookupMap = async (
  db: Knex,
  table: string,
  column: string,
  values: string[]
): Promise<Map<string, number>> => {
  const map = new Map<string, number>();
  for (const value of values) {
    map.set(value, await getLookupId(db, table, column, value));
  }
  return map;
};
