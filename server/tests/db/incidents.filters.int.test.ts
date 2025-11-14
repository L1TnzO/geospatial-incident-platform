import request from 'supertest';
import type { Knex } from 'knex';
import createApp from '../../src/app';
import { closeDb, getDb } from '../../src/db';
import { incidentService } from '../../src/services/incidentsService';
import { purgeTestRecords } from './testUtils';
import {
  INCIDENT_FIXTURE_COUNT,
  seedIncidentsFixture,
  type SeededIncidentRecord,
  type SeededIncidentsDataset,
} from './fixtures/incidentsFilters.fixture';

const TEST_PREFIX = 'TEST_INC_FILTERS';

interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

describe('Incidents API – filters, pagination, and validation', () => {
  let db: Knex;
  let app: ReturnType<typeof createApp>;
  let seededIncidents: SeededIncidentRecord[] = [];
  let dbReady = true;

  beforeAll(async () => {
    app = createApp();
    db = getDb();

    try {
      await db.raw('select 1');
    } catch (error) {
      dbReady = false;
      console.warn('Skipping incidents filter tests: database connection failed', error);
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

  test('applies combined filters and sorting with pagination metadata', async () => {
    if (!dbReady) {
      return;
    }

    const filtered = seededIncidents.filter(
      (incident) =>
        incident.typeCode === 'MEDICAL' &&
        incident.severityCode === 'CRITICAL' &&
        incident.statusCode === 'ON_SCENE' &&
        incident.isActive
    );

    expect(filtered.length).toBeGreaterThan(0);

    const start = new Date(Math.min(...filtered.map((i) => i.occurrenceAt.getTime())));
    const end = new Date(Math.max(...filtered.map((i) => i.occurrenceAt.getTime())));

    const response = await request(app).get('/api/incidents').query({
      typeCodes: 'MEDICAL',
      severityCodes: 'CRITICAL',
      statusCodes: 'ON_SCENE',
      isActive: true,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      sortBy: 'occurrenceAt',
      sortDirection: 'asc',
      pageSize: 2,
    });

    expect(response.status).toBe(200);
    const { data, pagination } = response.body as {
      data: Array<{
        incidentNumber: string;
        severity: { code: string };
        status: { code: string };
        type: { code: string };
        isActive: boolean;
        occurrenceAt: string;
      }>;
      pagination: { total: number; pageSize: number; sortBy: string; sortDirection: string };
    };

    const expectedPageLength = Math.min(filtered.length, 2);

    expect(pagination.total).toBe(filtered.length);
    expect(pagination.pageSize).toBe(2);
    expect(pagination.sortBy).toBe('occurrenceAt');
    expect(pagination.sortDirection).toBe('asc');

    expect(data).toHaveLength(expectedPageLength);
    data.forEach((item) => {
      expect(item.type.code).toBe('MEDICAL');
      expect(item.severity.code).toBe('CRITICAL');
      expect(item.status.code).toBe('ON_SCENE');
      expect(item.isActive).toBe(true);
    });

    const occurrences = data.map((item) => new Date(item.occurrenceAt).getTime());
    expect(occurrences).toEqual([...occurrences].sort((a, b) => a - b));
  });

  test('filters inactive incidents when isActive=false and returns full count', async () => {
    if (!dbReady) {
      return;
    }

    const expected = seededIncidents.filter((incident) => !incident.isActive);
    expect(expected.length).toBeGreaterThan(0);

    const response = await request(app)
      .get('/api/incidents')
      .query({ isActive: false, pageSize: INCIDENT_FIXTURE_COUNT, sortBy: 'reportedAt' });

    expect(response.status).toBe(200);
    const body = response.body as {
      data: Array<{ isActive: boolean }>;
      pagination: { total: number; hasNext: boolean };
    };

    expect(body.pagination.total).toBe(expected.length);
    expect(body.data).toHaveLength(expected.length);
    expect(body.pagination.hasNext).toBe(false);
    body.data.forEach((item) => expect(item.isActive).toBe(false));
  });

  test('paginates across pages and reports hasNext/hasPrevious correctly', async () => {
    if (!dbReady) {
      return;
    }

    const response = await request(app)
      .get('/api/incidents')
      .query({ page: 2, pageSize: 3, sortBy: 'reportedAt', sortDirection: 'desc' });

    expect(response.status).toBe(200);
    const { data, pagination } = response.body as {
      data: Array<{ reportedAt: string }>;
      pagination: { page: number; pageSize: number; hasNext: boolean; hasPrevious: boolean };
    };

    expect(pagination.page).toBe(2);
    expect(pagination.pageSize).toBe(3);
    expect(pagination.hasPrevious).toBe(true);
    expect(pagination.hasNext).toBeTruthy();
    expect(data).toHaveLength(3);

    const reportedTimes = data.map((item) => new Date(item.reportedAt).getTime());
    expect(reportedTimes).toEqual([...reportedTimes].sort((a, b) => b - a));
  });

  test('rejects pagination requests exceeding 1,000,000 record window', async () => {
    if (!dbReady) {
      return;
    }

    const response = await request(app)
      .get('/api/incidents')
      .query({ page: 10001, pageSize: 100 });

    expect(response.status).toBe(400);
    const errorBody = response.body as ApiErrorResponse;
    expect(errorBody.error.code).toBe('BAD_REQUEST');
  });

  test('returns validation error for non-positive page', async () => {
    if (!dbReady) {
      return;
    }

    const response = await request(app).get('/api/incidents').query({ page: 0 });

    expect(response.status).toBe(400);
    const errorBody = response.body as ApiErrorResponse;
    expect(errorBody.error.code).toBe('BAD_REQUEST');
    expect(errorBody.error.message).toMatch(/page/);
  });

  test('returns validation error for malformed date filter', async () => {
    if (!dbReady) {
      return;
    }

    const response = await request(app).get('/api/incidents').query({ startDate: 'not-a-date' });

    expect(response.status).toBe(400);
    const errorBody = response.body as ApiErrorResponse;
    expect(errorBody.error.code).toBe('BAD_REQUEST');
    expect(errorBody.error.message).toMatch(/startDate/);
  });

  test('validates incident number pattern in filters', async () => {
    if (!dbReady) {
      return;
    }

    const response = await request(app)
      .get('/api/incidents')
      .query({ incidentNumber: 'INVALID VALUE' });

    expect(response.status).toBe(400);
    const errorBody = response.body as ApiErrorResponse;
    expect(errorBody.error.message).toMatch(/incidentNumber/);
  });
});
