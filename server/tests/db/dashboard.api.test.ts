import request from 'supertest';
import type { Knex } from 'knex';
import createApp from '../../src/app';
import { closeDb, getDb } from '../../src/db';
import { incidentService } from '../../src/services/incidentsService';
import { dashboardService } from '../../src/services/dashboardService';
import { purgeTestRecords } from './testUtils';
import {
  seedIncidentsFixture,
  type SeededIncidentRecord,
} from './fixtures/incidentsFilters.fixture';

const TEST_PREFIX = 'TEST_TASK_5_1';

interface DashboardErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

describe('Dashboard API', () => {
  jest.setTimeout(15000);

  let db: Knex;
  let app: ReturnType<typeof createApp>;
  let seededIncidents: SeededIncidentRecord[] = [];
  let dbReady = true;

  const requireDb = () => {
    if (!dbReady) {
      console.warn('Database unavailable for dashboard API tests; skipping assertions.');
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
      console.warn('Skipping dashboard API tests: database connection failed', error);
      return;
    }

    await db.migrate.latest();
    await db.seed.run();
    await purgeTestRecords(db, TEST_PREFIX);

    const dataset = await seedIncidentsFixture(db, TEST_PREFIX);
    seededIncidents = dataset.incidents;
  }, 60000);

  afterAll(async () => {
    if (dbReady) {
      await purgeTestRecords(db, TEST_PREFIX);
    }
    jest.useRealTimers();
    await closeDb();
  });

  beforeEach(() => {
    incidentService.clearCaches();
    dashboardService.clearCaches();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-09-01T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns last-24h KPI with delta and refresh bypass', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app).get('/api/dashboard/kpi/last-24h');
    expect(response.status).toBe(200);
    const body = response.body as {
      currentCount: number;
      previousCount: number;
      delta: number;
      deltaPercentage: number | null;
      window: { start: string; end: string };
      previousWindow: { start: string; end: string };
    };

    expect(body.currentCount).toBeGreaterThan(0);
    expect(body.currentCount).toBe(seededIncidents.length);
    expect(body.previousCount).toBe(0);
    expect(body.delta).toBe(body.currentCount);
    expect(body.deltaPercentage).toBeNull();

    const cached = await request(app).get('/api/dashboard/kpi/last-24h');
    expect(cached.status).toBe(200);

    const refreshed = await request(app)
      .get('/api/dashboard/kpi/last-24h')
      .query({ refresh: 'true' });
    expect(refreshed.status).toBe(200);
    const refreshedBody = refreshed.body as typeof body;
    expect(refreshedBody.currentCount).toBe(body.currentCount);
  });

  test('returns incidents grouped by type within weekly window', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app).get('/api/dashboard/incidents/by-type');
    expect(response.status).toBe(200);
    const body = response.body as {
      total: number;
      buckets: Array<{ type: { code: string }; count: number; percentage: number }>;
    };

    expect(body.total).toBe(seededIncidents.length);
    const typeCodes = body.buckets.map((bucket) => bucket.type.code);
    expect(typeCodes).toEqual(expect.arrayContaining(['FIRE_STRUCTURE', 'MEDICAL']));
    expect(body.buckets.every((bucket) => bucket.percentage >= 0)).toBe(true);
  });

  test('returns 30-day daily trend with trend metadata', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app).get('/api/dashboard/incidents/daily-trend');
    expect(response.status).toBe(200);
    const body = response.body as {
      points: Array<{ date: string; count: number }>;
      trend: { currentTotal: number; previousTotal: number; direction: string };
    };

    expect(body.points.length).toBe(30);
    const totalCounts = body.points.reduce((sum, point) => sum + point.count, 0);
    expect(totalCounts).toBe(seededIncidents.length);
    expect(['up', 'down', 'flat']).toContain(body.trend.direction);
  });

  test('returns severity distribution respecting filters', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app)
      .get('/api/dashboard/incidents/severity-distribution')
      .query({ severityCodes: 'CRITICAL' });

    expect(response.status).toBe(200);
    const body = response.body as {
      total: number;
      buckets: Array<{ severity: { code: string }; count: number }>;
    };

    expect(body.total).toBeGreaterThan(0);
    expect(body.buckets).toHaveLength(1);
    expect(body.buckets[0]?.severity.code).toBe('CRITICAL');
  });

  test('returns recent incidents list with limit parameter and validation', async () => {
    if (!requireDb()) {
      return;
    }

    jest.useRealTimers();

    const response = await request(app).get('/api/dashboard/incidents/recent').query({ limit: 5 });
    expect(response.status).toBe(200);
    const body = response.body as Array<{
      incidentNumber: string;
      reportedAt: string;
      severity: { code: string };
    }>;

    expect(body.length).toBe(5);
    const sorted = [...body].sort(
      (a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
    );
    expect(body).toEqual(sorted);

    const invalid = await request(app)
      .get('/api/dashboard/incidents/recent')
      .query({ limit: 'not-a-number' });
    expect(invalid.status).toBe(400);
    const error = invalid.body as DashboardErrorResponse;
    expect(error.error.code).toBe('BAD_REQUEST');
  });
});
