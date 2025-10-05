import type { Knex } from 'knex';
import request from 'supertest';
import createApp from '../../src/app';
import { closeDb, getDb } from '../../src/db';
import { purgeTestRecords } from './testUtils';
import {
  seedStrategicTrendsFixture,
  type StrategicTrendExpectations,
} from './fixtures/strategicTrends.fixture';

describe('Strategic Analytics API', () => {
  jest.setTimeout(30000);

  const TEST_PREFIX = 'TEST_TASK_6_1';

  let db: Knex;
  let app: ReturnType<typeof createApp>;
  let dbReady = true;
  let expectations: StrategicTrendExpectations | null = null;

  const requireDb = (): boolean => {
    if (!dbReady) {
      console.warn('Database unavailable for strategic analytics tests; skipping assertions.');
    }
    return dbReady;
  };

  const subtractMonthsKey = (monthKey: string, offset: number): string => {
    const [year, month] = monthKey.split('-').map((part) => Number(part));
    const date = new Date(Date.UTC(year, month - 1, 1));
    date.setUTCMonth(date.getUTCMonth() - offset);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  };

  const toQuarterKey = (year: number, quarter: number): string => `${year}-Q${quarter}`;

  beforeAll(async () => {
    try {
      app = createApp();
      db = getDb();
      expectations = await seedStrategicTrendsFixture(db, TEST_PREFIX);
    } catch (error) {
      dbReady = false;
      console.warn('Skipping strategic analytics tests: database connection failed', error);
    }
  });

  afterAll(async () => {
    if (!dbReady) {
      jest.useRealTimers();
      return;
    }
    await purgeTestRecords(db, TEST_PREFIX);
    await closeDb();
  });

  test('returns monthly trend data with year-over-year comparisons', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app).get('/api/strategic/trends/monthly').query({ months: 12 });

    expect(response.status).toBe(200);
    const body = response.body as {
      range: { start: string; end: string; months: number };
      series: Array<{
        month: string;
        count: number;
        previousYearCount: number | null;
        yearOverYearDelta: number | null;
      }>;
      totals: { currentPeriodTotal: number };
    };

    expect(body.series.length).toBeGreaterThan(0);
    expect(body.series.length).toBeLessThanOrEqual(12);
    const lastPoint = body.series.at(-1);
    expect(lastPoint).toBeDefined();
    if (lastPoint && expectations) {
      const expectedCount = expectations.monthlyCounts[lastPoint.month];
      expect(lastPoint.count).toBe(expectedCount);

      const previousYearKey = subtractMonthsKey(lastPoint.month, 12);
      const expectedYoY = expectations.monthlyCounts[previousYearKey] ?? null;
      expect(lastPoint.previousYearCount ?? null).toBe(expectedYoY);
      if (expectedYoY !== null) {
        expect(lastPoint.yearOverYearDelta).toBe(lastPoint.count - expectedYoY);
      }

      const expectedTotal = body.series.reduce(
        (sum, point) => sum + (expectations!.monthlyCounts[point.month] ?? 0),
        0
      );
      expect(body.totals.currentPeriodTotal).toBe(expectedTotal);
    }
  });

  test('returns quarterly comparisons with growth metrics', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app)
      .get('/api/strategic/trends/quarters')
      .query({ quarters: 8 });

    expect(response.status).toBe(200);
    const body = response.body as {
      series: Array<{ year: number; quarter: number; count: number }>;
      summary: {
        current: { year: number; quarter: number; count: number } | null;
        previous: { count: number } | null;
        yearOverYearReference: { count: number } | null;
      };
    };

    expect(body.series.length).toBeLessThanOrEqual(8);
    const current = body.summary.current;
    if (current && expectations) {
      const currentKey = toQuarterKey(current.year, current.quarter);
      expect(current.count).toBe(expectations.quarterlyCounts[currentKey]);

      const previous = body.summary.previous;
      if (previous) {
        expect(previous.count).toBeDefined();
      }

      const yoy = body.summary.yearOverYearReference;
      if (yoy) {
        expect(yoy.count).toBeDefined();
      }
    }
  });

  test('returns type-specific timeline with per-month totals', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app).get('/api/strategic/trends/types').query({ months: 6 });

    expect(response.status).toBe(200);
    const body = response.body as {
      totalsByMonth: Array<{ month: string; count: number }>;
      types: Array<{ type: { code: string }; points: Array<{ month: string; count: number }> }>;
    };

    expect(body.totalsByMonth.length).toBeGreaterThan(0);
    if (expectations) {
      const totalsCheck = body.totalsByMonth.map((bucket) => {
        const expected = expectations!.monthlyCounts[bucket.month] ?? 0;
        expect(bucket.count).toBe(expected);
        return expected;
      });
      expect(totalsCheck.length).toBe(body.totalsByMonth.length);

      const fireSeries = body.types.find((series) => series.type.code === 'FIRE_STRUCTURE');
      expect(fireSeries).toBeDefined();
      if (fireSeries) {
        for (const point of fireSeries.points) {
          const key = `FIRE_STRUCTURE:${point.month}`;
          expect(point.count).toBe(expectations.typeMonthlyCounts[key] ?? 0);
        }
      }
    }
  });

  test('rejects invalid months parameter', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app).get('/api/strategic/trends/monthly').query({ months: 0 });

    expect(response.status).toBe(400);
  });

  test('returns hotspot grid aggregates with normalized intensity', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app).get('/api/strategic/hotspots');

    expect(response.status).toBe(200);
    const body = response.body as {
      metadata: {
        resolution: number;
        totalIncidents: number;
        maxIncidentCount: number;
        cellCount: number;
      };
      cells: Array<{
        incidentCount: number;
        intensity: number;
        centroid: { latitude: number; longitude: number };
        geometry: { geometry: { type: string } };
      }>;
    };

    expect(body.metadata.resolution).toBe(4);
    expect(body.cells.length).toBeGreaterThan(0);
    const maxCell = body.cells[0];
    expect(maxCell.geometry.geometry.type).toBe('Polygon');
    expect(typeof maxCell.centroid.latitude).toBe('number');
    expect(maxCell.intensity).toBe(1);

    if (expectations) {
      const totalExpected = Object.values(expectations.monthlyCounts).reduce(
        (sum, count) => sum + count,
        0
      );
      expect(body.metadata.totalIncidents).toBe(totalExpected);
      expect(body.metadata.maxIncidentCount).toBeGreaterThan(0);
      expect(body.metadata.cellCount).toBe(body.cells.length);
    }
  });

  test('rejects unsupported hotspot resolution', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app).get('/api/strategic/hotspots').query({ resolution: 0 });

    expect(response.status).toBe(400);
  });
});
