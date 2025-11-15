/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import request from 'supertest';
import type { Knex } from 'knex';
import createApp from '../../src/app';
import { closeDb, getDb, type IncidentDetail, type IncidentListItem } from '../../src/db';
import {
  incidentService,
  type IncidentListResponse,
  type IncidentMapListResponse,
} from '../../src/services/incidentsService';
import { purgeTestRecords } from './testUtils';
import {
  INCIDENT_FIXTURE_COUNT,
  seedIncidentsFixture,
  type SeededIncidentRecord,
  type SeededIncidentsDataset,
} from './fixtures/incidentsFilters.fixture';
import { INCIDENT_MAX_PAGE_SIZE } from '../../src/config/pagination';

const TEST_PREFIX = 'TEST_TASK_3_1';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

interface IncidentMetadataResponse {
  types: Array<{ code: string }>;
  severities: Array<{ code: string }>;
  statuses: Array<{ code: string }>;
  occurrenceRange: { start: string | null; end: string | null };
  reportedRange: { start: string | null; end: string | null };
  activeCount: number;
  limits: { maxPageSize: number; maxTotalResults: number };
}

const isIncidentMapListResponse = (value: unknown): value is IncidentMapListResponse => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as { data?: unknown; pagination?: unknown };
  if (!Array.isArray(candidate.data)) {
    return false;
  }

  if (typeof candidate.pagination !== 'object' || candidate.pagination === null) {
    return false;
  }

  const pagination = candidate.pagination as { pageSize?: unknown };
  return typeof pagination.pageSize === 'number';
};

describe('Incidents API', () => {
  let db: Knex;
  let app: ReturnType<typeof createApp>;
  let seededIncidents: SeededIncidentRecord[] = [];
  let dbReady = true;

  const requireDb = () => {
    if (!dbReady) {
      console.warn('Database unavailable for incidents API tests; skipping assertions.');
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
      console.warn('Skipping incidents API tests: database connection failed', error);
      return;
    }

    await db.migrate.latest();
    await db.seed.run();
    await purgeTestRecords(db, TEST_PREFIX);

    const dataset: SeededIncidentsDataset = await seedIncidentsFixture(db, TEST_PREFIX);
    seededIncidents = dataset.incidents;
  }, 60000);

  afterAll(async () => {
    if (dbReady) {
      await purgeTestRecords(db, TEST_PREFIX);
    }
    await closeDb();
  });

  beforeEach(() => {
    incidentService.clearCaches();
  });

  test('returns paginated incidents list with default parameters', async () => {
    if (!requireDb()) {
      return;
    }
    const response = await request(app).get('/api/incidents');

    expect(response.status).toBe(200);
    const body = response.body as IncidentListResponse;
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('pagination');

    const { data, pagination } = body;
    expect(Array.isArray(data)).toBe(true);
    expect(seededIncidents).toHaveLength(INCIDENT_FIXTURE_COUNT);
    expect(data.length).toBe(seededIncidents.length);
    expect(pagination.page).toBe(1);
    expect(pagination.pageSize).toBeGreaterThanOrEqual(seededIncidents.length);
    expect(pagination.total).toBeGreaterThanOrEqual(seededIncidents.length);
    expect(pagination.totalPages).toBe(1);
    expect(pagination.hasNext).toBe(false);
    expect(pagination.hasPrevious).toBe(false);
    expect(pagination.sortBy).toBe('reportedAt');
    expect(pagination.sortDirection).toBe('desc');

    const sortedIncidents = [...seededIncidents].sort(
      (a, b) => b.occurrenceAt.getTime() - a.occurrenceAt.getTime()
    );
    expect(data[0]?.incidentNumber).toBe(sortedIncidents[0]?.incidentNumber);
    expect(data[0]?.location).toMatchObject({ type: 'Feature' });
  });

  test('returns lightweight map incidents payload', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app)
      .get('/api/incidents/map')
      .query({ pageSize: INCIDENT_MAX_PAGE_SIZE, isActive: true });

    expect(response.status).toBe(200);
    const rawBody = response.body as unknown;
    expect(isIncidentMapListResponse(rawBody)).toBe(true);
    if (!isIncidentMapListResponse(rawBody)) {
      throw new Error('Invalid map list response shape');
    }
    const body = rawBody;
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination.pageSize).toBeLessThanOrEqual(INCIDENT_MAX_PAGE_SIZE);

    const first = body.data[0];
    if (first) {
      expect(first).not.toHaveProperty('casualtyCount');
      expect(first).not.toHaveProperty('estimatedDamageAmount');
      expect(first.location).toMatchObject({ type: 'Feature' });
      expect(first.type).toMatchObject({ code: expect.any(String), name: expect.any(String) });
      expect(first.severity).toHaveProperty('colorHex');
    }
  });

  test('supports pagination and filters', async () => {
    if (!requireDb()) {
      return;
    }
    const response = await request(app)
      .get('/api/incidents')
      .query({ page: 1, pageSize: 5, severityCodes: 'CRITICAL', isActive: true });

    expect(response.status).toBe(200);
    const { data, pagination } = response.body as IncidentListResponse;
    expect(pagination.page).toBe(1);
    expect(pagination.pageSize).toBe(5);
    expect(pagination.hasNext).toBe(false);
    expect(pagination.hasPrevious).toBe(false);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    data.forEach((item: IncidentListItem) => {
      expect(item.severity.code).toBe('CRITICAL');
      expect(item.isActive).toBe(true);
    });
  });

  test('supports combined filters and severity priority sorting', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app).get('/api/incidents').query({
      pageSize: 10,
      sortBy: 'severityPriority',
      sortDirection: 'asc',
      typeCodes: 'FIRE_STRUCTURE',
      startDate: '2025-09-01T00:00:00Z',
      endDate: '2025-09-02T00:00:00Z',
    });

    expect(response.status).toBe(200);
    const { data, pagination } = response.body as IncidentListResponse;

    expect(pagination.sortBy).toBe('severityPriority');
    expect(pagination.sortDirection).toBe('asc');

    const priorities = data.map((item) => item.severity.priority);
    const sortedPriorities = [...priorities].sort((a, b) => a - b);
    expect(priorities).toEqual(sortedPriorities);
    data.forEach((item) => {
      expect(item.type.code).toBe('FIRE_STRUCTURE');
    });
  });

  test('supports occurrence date sorting descending', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app)
      .get('/api/incidents')
      .query({ sortBy: 'occurrenceAt', sortDirection: 'desc', pageSize: 5 });

    expect(response.status).toBe(200);
    const { data } = response.body as IncidentListResponse;
    const occurrences = data.map((item) => new Date(item.occurrenceAt).getTime());
    const sorted = [...occurrences].sort((a, b) => b - a);
    expect(occurrences).toEqual(sorted);
  });

  test('rejects requests exceeding the 1,000,000 record window', async () => {
    if (!requireDb()) {
      return;
    }
    const response = await request(app)
      .get('/api/incidents')
      .query({ page: 10001, pageSize: 100 });

    expect(response.status).toBe(400);
    const body = response.body as ErrorResponse;
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  test('returns incident detail with related collections', async () => {
    if (!requireDb()) {
      return;
    }
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
    if (!requireDb()) {
      return;
    }
    const response = await request(app).get('/api/incidents/UNKNOWN-INCIDENT');

    expect(response.status).toBe(404);
    const body = response.body as ErrorResponse;
    expect(body.error.code).toBe('NOT_FOUND');
  });

  test('returns 400 for invalid query parameters', async () => {
    if (!requireDb()) {
      return;
    }
    const response = await request(app)
      .get('/api/incidents')
      .query({ page: 'abc', sortBy: 'unknown' });

    expect(response.status).toBe(400);
    const body = response.body as ErrorResponse;
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  test('rejects invalid sort direction', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app).get('/api/incidents').query({ sortDirection: 'upwards' });

    expect(response.status).toBe(400);
    const body = response.body as ErrorResponse;
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  test('returns incidents metadata for filter UI', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app).get('/api/incidents/meta');

    expect(response.status).toBe(200);
    const body = response.body as IncidentMetadataResponse;

    expect(body.types.map((t) => t.code)).toEqual(
      expect.arrayContaining(['FIRE_STRUCTURE', 'MEDICAL'])
    );
    expect(body.severities.map((s) => s.code)).toEqual(expect.arrayContaining(['CRITICAL']));
    expect(body.statuses.map((s) => s.code)).toEqual(
      expect.arrayContaining(['REPORTED', 'ON_SCENE'])
    );
    expect(body.occurrenceRange.start).not.toBeNull();
    expect(body.occurrenceRange.end).not.toBeNull();
    expect(body.reportedRange.start).not.toBeNull();
    expect(body.reportedRange.end).not.toBeNull();
    expect(body.activeCount).toBeGreaterThan(0);
  expect(body.limits.maxTotalResults).toBe(1_000_000);
  expect(body.limits.maxPageSize).toBe(INCIDENT_MAX_PAGE_SIZE);
  });

  test('metadata endpoint refresh parameter bypasses cache', async () => {
    if (!requireDb()) {
      return;
    }

    const initial = await request(app).get('/api/incidents/meta');
    expect(initial.status).toBe(200);
    const initialMetadata = initial.body as IncidentMetadataResponse;
    const originalCount = initialMetadata.types.length;

    const newTypeCode = `${TEST_PREFIX}_TYPE_${Date.now().toString(36)}`;

    await db('incident_types').insert({
      type_code: newTypeCode,
      name: `${TEST_PREFIX} Type`,
      description: 'Synthetic type for cache refresh test',
    });

    const cached = await request(app).get('/api/incidents/meta');
    expect(cached.status).toBe(200);
    const cachedMetadata = cached.body as IncidentMetadataResponse;
    const cachedCodes = cachedMetadata.types.map((t) => t.code);
    expect(cachedCodes).not.toContain(newTypeCode);

    const refreshed = await request(app).get('/api/incidents/meta').query({ refresh: 'true' });
    expect(refreshed.status).toBe(200);
    const refreshedMetadata = refreshed.body as IncidentMetadataResponse;
    const refreshedCodes = refreshedMetadata.types.map((t) => t.code);
    expect(refreshedCodes).toContain(newTypeCode);
    expect(refreshedCodes.length).toBe(originalCount + 1);

    await db('incident_types').where('type_code', newTypeCode).del();
    incidentService.clearCaches();
  });

  test('filters incidents by incidentNumber, ignoring case', async () => {
    if (!requireDb()) {
      return;
    }

    const targetIncident = seededIncidents[1];
    const response = await request(app)
      .get('/api/incidents')
      .query({ incidentNumber: targetIncident.incidentNumber.toLowerCase() });

    expect(response.status).toBe(200);
    const body = response.body as IncidentListResponse;
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.incidentNumber).toBe(targetIncident.incidentNumber);
    expect(body.pagination.total).toBe(1);
    expect(body.pagination.totalPages).toBe(1);
    expect(body.pagination.page).toBe(1);
  });

  test('search endpoint returns summary with coordinates', async () => {
    if (!requireDb()) {
      return;
    }

    const targetIncident = seededIncidents[0];
    const response = await request(app)
      .get('/api/incidents/search')
      .query({ incidentNumber: targetIncident.incidentNumber.toLowerCase() });

    expect(response.status).toBe(200);
    const body = response.body as {
      incidentNumber: string;
      location: { geometry: { coordinates: [number, number] } };
      severity: { code: string };
      status: { code: string };
      type: { code: string };
    };

    expect(body.incidentNumber).toBe(targetIncident.incidentNumber);
    expect(body.location.geometry.coordinates.length).toBe(2);
    expect(body.severity.code).toBe(targetIncident.severityCode);
  });

  test('search endpoint returns 404 for unknown incidents', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app)
      .get('/api/incidents/search')
      .query({ incidentNumber: 'UNKNOWN-INCIDENT' });

    expect(response.status).toBe(404);
    const body = response.body as ErrorResponse;
    expect(body.error.code).toBe('NOT_FOUND');
  });

  test('search endpoint validates query parameter', async () => {
    if (!requireDb()) {
      return;
    }

    const missing = await request(app).get('/api/incidents/search');
    expect(missing.status).toBe(400);

    const invalid = await request(app)
      .get('/api/incidents/search')
      .query({ incidentNumber: 'BAD VALUE' });
    expect(invalid.status).toBe(400);
  });
});
