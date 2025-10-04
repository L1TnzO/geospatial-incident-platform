import request from 'supertest';
import type { Knex } from 'knex';
import createApp from '../../src/app';
import { closeDb, getDb } from '../../src/db';
import { incidentService, type IncidentListResponse } from '../../src/services/incidentsService';
import { pointWkt, purgeTestRecords } from './testUtils';

const TEST_PREFIX = 'TEST_INC_CRUD';

interface CreateIncidentPayload {
  incidentNumber: string;
  title?: string;
  severityCode?: string;
  statusCode?: string;
  typeCode?: string;
  occurrenceAt?: string;
  reportedAt?: string;
  dispatchAt?: string | null;
  arrivalAt?: string | null;
  resolvedAt?: string | null;
  casualtyCount?: number;
  responderInjuries?: number;
  location?: { latitude: number; longitude: number };
  sourceCode?: string | null;
  weatherCode?: string | null;
  primaryStationCode?: string | null;
  externalReference?: string | null;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

describe('Incidents API – creation and validation', () => {
  let db: Knex;
  let app: ReturnType<typeof createApp>;
  let dbReady = true;

  const ensureDb = () => {
    if (!dbReady) {
      console.warn('Database unavailable for incident CRUD tests; skipping assertions.');
      return false;
    }
    return true;
  };

  beforeAll(async () => {
    app = createApp();
    db = getDb();

    try {
      await db.raw('select 1');
    } catch (error) {
      dbReady = false;
      console.warn('Skipping incidents CRUD tests: database connection failed', error);
      return;
    }

    await db.migrate.latest();
    await db.seed.run();
    await purgeTestRecords(db, TEST_PREFIX);
  }, 60000);

  afterEach(async () => {
    if (dbReady) {
      await purgeTestRecords(db, TEST_PREFIX);
    }
    incidentService.clearCaches();
  });

  afterAll(async () => {
    if (dbReady) {
      await purgeTestRecords(db, TEST_PREFIX);
    }
    await closeDb();
  });

  const createStation = async (suffix: string): Promise<string> => {
    const stationCode = `${TEST_PREFIX}_STATION_${suffix}_${Date.now().toString(36)}`.toUpperCase();
    await db('stations').insert({
      station_code: stationCode,
      name: `${TEST_PREFIX} Station ${suffix}`,
      is_active: true,
      location: db.raw('ST_GeomFromText(?, 4326)', [pointWkt(-122.42, 37.77)]),
      coverage_radius_meters: 4000,
    });
    return stationCode;
  };

  const buildPayload = async (overrides: Partial<CreateIncidentPayload> = {}) => {
    const incidentNumber =
      overrides.incidentNumber ?? `${TEST_PREFIX}-INC-${Date.now().toString(36)}`;
    const now = new Date();
    const occurrenceAt = overrides.occurrenceAt ?? now.toISOString();
    const reportedAt =
      overrides.reportedAt ?? new Date(now.getTime() + 5 * 60 * 1000).toISOString();

    return {
      incidentNumber,
      title: overrides.title ?? 'Test Incident',
      severityCode: overrides.severityCode ?? 'HIGH',
      statusCode: overrides.statusCode ?? 'REPORTED',
      typeCode: overrides.typeCode ?? 'FIRE_STRUCTURE',
      occurrenceAt,
      reportedAt,
      dispatchAt:
        overrides.dispatchAt ??
        new Date(new Date(reportedAt).getTime() + 3 * 60 * 1000).toISOString(),
      arrivalAt:
        overrides.arrivalAt ??
        new Date(new Date(reportedAt).getTime() + 10 * 60 * 1000).toISOString(),
      resolvedAt: overrides.resolvedAt ?? null,
      casualtyCount: overrides.casualtyCount ?? 0,
      responderInjuries: overrides.responderInjuries ?? 0,
      location: overrides.location ?? { latitude: 37.77, longitude: -122.42 },
      sourceCode: overrides.sourceCode ?? '911',
      weatherCode: overrides.weatherCode ?? 'CLEAR',
      primaryStationCode: overrides.primaryStationCode ?? (await createStation('PRIMARY')),
      externalReference: overrides.externalReference ?? null,
      metadata: overrides.metadata ?? { source: 'jest' },
      isActive: overrides.isActive,
    } satisfies CreateIncidentPayload;
  };

  test('creates a new incident and returns detail payload', async () => {
    if (!ensureDb()) {
      return;
    }

    const payload = await buildPayload();
    const response = await request(app).post('/api/incidents').send(payload);

    expect(response.status).toBe(201);
    expect(response.headers.location).toBe(
      `/api/incidents/${payload.incidentNumber.toUpperCase()}`
    );

    const detail = response.body as {
      incidentNumber: string;
      title: string;
      severity: { code: string };
      status: { code: string };
      location: { geometry: { type: string; coordinates: [number, number] } };
      metadata: Record<string, unknown>;
      isActive: boolean;
    };

    expect(detail.incidentNumber).toBe(payload.incidentNumber.toUpperCase());
    expect(detail.title).toBe(payload.title);
    expect(detail.severity.code).toBe(payload.severityCode);
    expect(detail.status.code).toBe(payload.statusCode);
    expect(detail.location.geometry.type).toBe('Point');
    expect(detail.metadata).toMatchObject(payload.metadata ?? {});

    const lookup = await request(app)
      .get('/api/incidents')
      .query({ incidentNumber: payload.incidentNumber });

    expect(lookup.status).toBe(200);
    const lookupBody = lookup.body as IncidentListResponse;
    expect(lookupBody.data).toHaveLength(1);
  });

  test('infers inactive flag when status is terminal', async () => {
    if (!ensureDb()) {
      return;
    }

    const payload = await buildPayload({ statusCode: 'RESOLVED', isActive: undefined });
    const response = await request(app).post('/api/incidents').send(payload);

    expect(response.status).toBe(201);
    const detailBody = response.body as { isActive: boolean };
    expect(detailBody.isActive).toBe(false);
  });

  test('returns validation error when required fields are missing', async () => {
    if (!ensureDb()) {
      return;
    }

    const response = await request(app).post('/api/incidents').send({});

    expect(response.status).toBe(400);
    const errorBody = response.body as ApiErrorResponse;
    expect(errorBody.error.code).toBe('BAD_REQUEST');
    expect(errorBody.error.message).toMatch(/incidentNumber/i);
  });

  test('returns validation error when coordinates are invalid', async () => {
    if (!ensureDb()) {
      return;
    }

    const payload = await buildPayload({ location: { latitude: 200, longitude: 10 } });
    const response = await request(app).post('/api/incidents').send(payload);

    expect(response.status).toBe(400);
    const errorBody = response.body as ApiErrorResponse;
    expect(errorBody.error.message).toMatch(/Location coordinates/);
  });

  test('returns validation error for inconsistent timeline', async () => {
    if (!ensureDb()) {
      return;
    }

    const now = new Date();
    const payload = await buildPayload({
      occurrenceAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
      reportedAt: now.toISOString(),
    });

    const response = await request(app).post('/api/incidents').send(payload);

    expect(response.status).toBe(400);
    const errorBody = response.body as ApiErrorResponse;
    expect(errorBody.error.message).toMatch(/reportedAt/);
  });

  test('returns conflict when incident already exists', async () => {
    if (!ensureDb()) {
      return;
    }

    const basePayload = await buildPayload();
    const first = await request(app).post('/api/incidents').send(basePayload);
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/incidents').send(basePayload);
    expect(second.status).toBe(409);
    const conflictBody = second.body as ApiErrorResponse;
    expect(conflictBody.error.code).toBe('CONFLICT');
  });

  test('returns validation error when lookup codes are unknown', async () => {
    if (!ensureDb()) {
      return;
    }

    const payload = await buildPayload({ typeCode: 'UNKNOWN_TYPE' });
    const response = await request(app).post('/api/incidents').send(payload);

    expect(response.status).toBe(400);
    const errorBody = response.body as ApiErrorResponse;
    expect(errorBody.error.message).toMatch(/Incident type/);
  });
});
