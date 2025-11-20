import request from 'supertest';
import type { Knex } from 'knex';
import createApp from '../../src/app';
import { closeDb, getDb } from '../../src/db';
import { incidentService } from '../../src/services/incidentsService';
import { dashboardService } from '../../src/services/dashboardService';
import { getLookupId, iso, pointWkt, purgeTestRecords } from './testUtils';
import {
  INCIDENT_FIXTURE_COUNT,
  seedIncidentsFixture,
  type SeededIncidentsDataset,
  type SeededIncidentRecord,
} from './fixtures/incidentsFilters.fixture';

const TEST_PREFIX = 'TEST_TASK_5_11';
const CACHE_PREFIX = `${TEST_PREFIX}_CACHE`;
const BULK_PREFIX = `${TEST_PREFIX}_BULK`;
const FIXED_SYSTEM_TIME = new Date('2025-09-01T12:00:00Z');
const RealDate = Date;

interface DashboardErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

interface IncidentBatchOptions {
  prefix: string;
  count: number;
  baseTime?: Date;
  intervalMinutes?: number;
  statusCodes?: string[];
  typeCodes?: string[];
  severityCodes?: string[];
}

const truncateDashboardTables = async (connection: Knex): Promise<void> => {
  const tables = [
    'incident_notes',
    'incident_assets',
    'incident_units',
    'incidents',
    'stations',
    'response_zones',
  ];
  const tableList = tables.map((table) => `"${table}"`).join(', ');
  await connection.raw(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
};

const freezeSystemTime = (fixed: Date): void => {
  const fixedTime = fixed.getTime();
  const MockDate = class extends Date {
    constructor(...args: unknown[]) {
      if (args.length === 0) {
        super(fixedTime);
        return;
      }
      super(...(args as ConstructorParameters<typeof Date>));
    }

    static now(): number {
      return fixedTime;
    }

    static parse(input: string): number {
      return RealDate.parse(input);
    }

    static UTC(...args: Parameters<typeof Date.UTC>): number {
      return RealDate.UTC(...args);
    }
  };

  global.Date = MockDate as unknown as DateConstructor;
};

const restoreSystemTime = (): void => {
  global.Date = RealDate;
};

describe('Dashboard API', () => {
  jest.setTimeout(45000);

  let db: Knex;
  let app: ReturnType<typeof createApp>;
  let seededDataset: SeededIncidentsDataset | null = null;
  let dbReady = true;

  const requireDb = (): boolean => {
    if (!dbReady) {
      console.warn('Database unavailable for dashboard API tests; skipping assertions.');
    }
    return dbReady;
  };

  const ensureSeededDataset = (): SeededIncidentsDataset => {
    if (!seededDataset) {
      throw new Error('Seeded dataset not initialized. Ensure beforeAll completed successfully.');
    }
    return seededDataset;
  };

  const seededIncidents = (): SeededIncidentRecord[] => ensureSeededDataset().incidents;
  const seededStations = () => ensureSeededDataset().stations;

  const parseCount = (value: unknown): number => Number(value ?? 0);

  const insertIncidentBatch = async ({
    prefix,
    count,
    baseTime = new Date('2025-09-01T00:00:00Z'),
    intervalMinutes = 60,
    statusCodes = ['REPORTED', 'ON_SCENE', 'RESOLVED'],
    typeCodes = ['FIRE_STRUCTURE', 'HAZMAT'],
    severityCodes = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
  }: IncidentBatchOptions): Promise<string[]> => {
    if (!dbReady || count <= 0) {
      return [];
    }

    console.info('[dashboard-tests] insertIncidentBatch start', {
      prefix,
      count,
    });

    const stations = seededStations();
    if (!stations.length) {
      throw new Error('Stations are required to seed additional incidents');
    }
    const primaryStationId = stations[0].id;

    const uniqueTypeCodes = Array.from(new Set(typeCodes));
    const uniqueSeverityCodes = Array.from(new Set(severityCodes));
    const uniqueStatusCodes = Array.from(new Set(statusCodes));

    const typeIdMap = new Map<string, number>();
    for (const code of uniqueTypeCodes) {
      typeIdMap.set(code, await getLookupId(db, 'incident_types', 'type_code', code));
    }

    const severityIdMap = new Map<string, number>();
    for (const code of uniqueSeverityCodes) {
      severityIdMap.set(code, await getLookupId(db, 'incident_severities', 'severity_code', code));
    }

    const statusIdMap = new Map<string, number>();
    for (const code of uniqueStatusCodes) {
      statusIdMap.set(code, await getLookupId(db, 'incident_statuses', 'status_code', code));
    }

    const sourceId = await getLookupId(db, 'incident_sources', 'source_code', '911');
    const weatherId = await getLookupId(db, 'weather_conditions', 'condition_code', 'CLEAR');

    const rows: Array<Record<string, unknown>> = [];

    for (let i = 0; i < count; i += 1) {
      const typeCode = typeCodes[i % typeCodes.length];
      const severityCode = severityCodes[i % severityCodes.length];
      const statusCode = statusCodes[i % statusCodes.length];
      const isActive = statusCode !== 'RESOLVED';

      const occurrenceAt = new Date(baseTime.getTime() + i * intervalMinutes * 60 * 1000);
      const incidentNumber = `${prefix}-${i.toString().padStart(5, '0')}`.toUpperCase();

      rows.push({
        incident_number: incidentNumber,
        title: `${prefix} Generated Incident ${i}`,
        type_id: typeIdMap.get(typeCode),
        severity_id: severityIdMap.get(severityCode),
        status_id: statusIdMap.get(statusCode),
        source_id: sourceId,
        weather_condition_id: weatherId,
        primary_station_id: primaryStationId,
        occurrence_at: iso(occurrenceAt),
        reported_at: iso(new Date(occurrenceAt.getTime() + 5 * 60 * 1000)),
        dispatch_at: iso(new Date(occurrenceAt.getTime() + 8 * 60 * 1000)),
        arrival_at: iso(new Date(occurrenceAt.getTime() + 15 * 60 * 1000)),
        resolved_at: isActive ? null : iso(new Date(occurrenceAt.getTime() + 90 * 60 * 1000)),
        is_active: isActive,
        casualty_count: i % 3,
        responder_injuries: i % 2,
        location: db.raw('ST_GeomFromText(?, 4326)', [
          pointWkt(-122.45 + (i % 5) * 0.005, 37.75 + (i % 4) * 0.005),
        ]),
        location_geohash: `9q8y${(i % 32).toString(36)}`,
        metadata: db.raw('?::jsonb', [
          JSON.stringify({ batch: prefix, index: i, severity: severityCode }),
        ]),
      });
    }

    if (rows.length) {
      console.info('[dashboard-tests] insertIncidentBatch inserting rows', rows.length);
      await db.batchInsert('incidents', rows, 200);
      console.info('[dashboard-tests] insertIncidentBatch insert complete');
    }

    return rows.map((row) => row.incident_number as string);
  };

  beforeAll(async () => {
    console.info('[dashboard-tests] beforeAll start');
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
    await truncateDashboardTables(db);
    await purgeTestRecords(db, TEST_PREFIX);
    await purgeTestRecords(db, CACHE_PREFIX);
    await purgeTestRecords(db, BULK_PREFIX);

    seededDataset = await seedIncidentsFixture(db, TEST_PREFIX);
    if (seededDataset.incidents.length !== INCIDENT_FIXTURE_COUNT) {
      throw new Error('Unexpected incident fixture count for dashboard analytics tests.');
    }
    console.info('[dashboard-tests] beforeAll complete');
  }, 60000);

  afterAll(async () => {
    if (dbReady) {
      await purgeTestRecords(db, CACHE_PREFIX);
      await purgeTestRecords(db, BULK_PREFIX);
      await purgeTestRecords(db, TEST_PREFIX);
    }
    restoreSystemTime();
    await closeDb();
  });

  beforeEach(() => {
    console.info('[dashboard-tests] beforeEach start');
    incidentService.clearCaches();
    dashboardService.clearCaches();
    freezeSystemTime(FIXED_SYSTEM_TIME);
  });

  afterEach(async () => {
    restoreSystemTime();

    if (dbReady) {
      await purgeTestRecords(db, CACHE_PREFIX);
      await purgeTestRecords(db, BULK_PREFIX);
    }
  });

  test('returns last-24h KPI with delta and refresh bypass', async () => {
    if (!requireDb()) {
      return;
    }

    console.info('[dashboard-tests] running KPI baseline test');
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

    expect(body.currentCount).toBe(seededIncidents().length);
    expect(body.previousCount).toBe(0);
    expect(body.delta).toBe(body.currentCount);
    expect(body.deltaPercentage).toBeNull();
    expect(new Date(body.window.start).toISOString()).toBe(body.window.start);
    expect(new Date(body.window.end).toISOString()).toBe(body.window.end);

    const cached = await request(app).get('/api/dashboard/kpi/last-24h');
    expect(cached.status).toBe(200);
    expect((cached.body as typeof body).currentCount).toBe(body.currentCount);

    const refreshed = await request(app)
      .get('/api/dashboard/kpi/last-24h')
      .query({ refresh: 'true' });
    expect(refreshed.status).toBe(200);
    expect((refreshed.body as typeof body).currentCount).toBe(body.currentCount);
  });

  test('refresh flag bypasses cache for KPI counts', async () => {
    if (!requireDb()) {
      return;
    }

    console.info('[dashboard-tests] KPI refresh test baseline request');
    const baseline = await request(app).get('/api/dashboard/kpi/last-24h');
    expect(baseline.status).toBe(200);
    const initialCount = (baseline.body as { currentCount: number }).currentCount;

    console.info('[dashboard-tests] KPI refresh inserting extra incident');
    await insertIncidentBatch({
      prefix: CACHE_PREFIX,
      count: 1,
      baseTime: new Date('2025-09-01T10:00:00Z'),
      statusCodes: ['REPORTED'],
      severityCodes: ['HIGH'],
      typeCodes: ['FIRE_STRUCTURE'],
    });

    console.info('[dashboard-tests] KPI refresh reading cached response');
    const cached = await request(app).get('/api/dashboard/kpi/last-24h');
    expect(cached.status).toBe(200);
    expect((cached.body as { currentCount: number }).currentCount).toBe(initialCount);

    console.info('[dashboard-tests] KPI refresh reading refreshed response');
    const refreshed = await request(app)
      .get('/api/dashboard/kpi/last-24h')
      .query({ refresh: 'true' });
    expect(refreshed.status).toBe(200);
    expect((refreshed.body as { currentCount: number }).currentCount).toBe(initialCount + 1);
  });

  test('returns incidents grouped by type within weekly window with percentages', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app).get('/api/dashboard/incidents/by-type');
    expect(response.status).toBe(200);
    const body = response.body as {
      total: number;
      buckets: Array<{ type: { code: string }; count: number; percentage: number }>;
    };

    expect(body.total).toBe(seededIncidents().length);
    const typeCodes = body.buckets.map((bucket) => bucket.type.code);
    expect(typeCodes).toEqual(expect.arrayContaining(['FIRE_STRUCTURE', 'HAZMAT']));
    const totalPercent = body.buckets.reduce((sum, bucket) => sum + bucket.percentage, 0);
    expect(totalPercent).toBeGreaterThanOrEqual(100);
    expect(totalPercent).toBeLessThanOrEqual(100.01);
  });

  test('filters type distribution by severity and type', async () => {
    if (!requireDb()) {
      return;
    }

    console.info('[dashboard-tests] type distribution filtered request');
    const expected = seededIncidents().filter(
      (incident) => incident.severityCode === 'CRITICAL' && incident.typeCode === 'HAZMAT'
    ).length;

    console.info('[dashboard-tests] type distribution hitting endpoint');
    const response = await request(app)
      .get('/api/dashboard/incidents/by-type')
      .query({ severityCodes: 'CRITICAL', typeCodes: 'HAZMAT' });

    expect(response.status).toBe(200);

    const body = response.body as {
      total: number;
      buckets: Array<{ type: { code: string }; count: number; percentage: number }>;
    };

    expect(body.total).toBe(expected);
    if (expected > 0) {
      expect(body.buckets).toHaveLength(1);
      expect(body.buckets[0]?.type.code).toBe('HAZMAT');
      expect(body.buckets[0]?.percentage).toBe(100);
    } else {
      expect(body.buckets).toEqual([]);
    }
  });

  test('returns zero totals when filters match no incidents', async () => {
    if (!requireDb()) {
      return;
    }

    console.info('[dashboard-tests] zero totals query start');
    const response = await request(app)
      .get('/api/dashboard/incidents/by-type')
      .query({ severityCodes: 'CRITICAL', typeCodes: 'FIRE_STRUCTURE' });

    expect(response.status).toBe(200);

    const body = response.body as {
      total: number;
      buckets: Array<{ type: { code: string }; count: number; percentage: number }>;
    };

    expect(body.total).toBe(0);
    expect(body.buckets).toEqual([]);
  });

  test('returns 30-day daily trend with trend metadata', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app).get('/api/dashboard/incidents/daily-trend');
    expect(response.status).toBe(200);
    const body = response.body as {
      points: Array<{ date: string; count: number }>;
      trend: {
        currentTotal: number;
        previousTotal: number;
        change: number;
        percentageChange: number | null;
        direction: string;
      };
    };

    expect(body.points.length).toBe(30);
    const totalCounts = body.points.reduce((sum, point) => sum + point.count, 0);
    expect(totalCounts).toBe(seededIncidents().length);
    expect(body.trend.currentTotal).toBe(seededIncidents().length);
    expect(body.trend.previousTotal).toBe(0);
    expect(body.trend.change).toBe(seededIncidents().length);
    expect(body.trend.percentageChange).toBeNull();
    expect(body.trend.direction).toBe('up');

    const dateValues = body.points.map((point) => new Date(point.date).getTime());
    expect(dateValues.slice(1).every((value, index) => value >= dateValues[index])).toBe(true);
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
      buckets: Array<{ severity: { code: string }; count: number; percentage: number }>;
    };

    const expected = seededIncidents().filter(
      (incident) => incident.severityCode === 'CRITICAL'
    ).length;

    expect(body.total).toBe(expected);
    if (expected > 0) {
      expect(body.buckets).toHaveLength(1);
      expect(body.buckets[0]?.severity.code).toBe('CRITICAL');
      expect(body.buckets[0]?.percentage).toBe(100);
    } else {
      expect(body.buckets).toEqual([]);
    }
  });

  test('returns recent incidents list with limit parameter and validation', async () => {
    if (!requireDb()) {
      return;
    }

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

  test('refresh invalidates recent incidents cache', async () => {
    if (!requireDb()) {
      return;
    }

    console.info('[dashboard-tests] recent incidents baseline');
    const baseline = await request(app).get('/api/dashboard/incidents/recent').query({ limit: 3 });
    expect(baseline.status).toBe(200);

    console.info('[dashboard-tests] recent incidents inserting fresh record');
    const inserted = await insertIncidentBatch({
      prefix: CACHE_PREFIX,
      count: 1,
      baseTime: new Date('2025-09-01T11:55:00Z'),
      intervalMinutes: 1,
      statusCodes: ['REPORTED'],
      severityCodes: ['MODERATE'],
      typeCodes: ['HAZMAT'],
    });

    console.info('[dashboard-tests] recent incidents cached fetch');
    const cached = await request(app).get('/api/dashboard/incidents/recent').query({ limit: 3 });
    expect(cached.status).toBe(200);
    expect(
      (cached.body as Array<{ incidentNumber: string }>).map((item) => item.incidentNumber)
    ).toEqual(
      (baseline.body as Array<{ incidentNumber: string }>).map((item) => item.incidentNumber)
    );

    console.info('[dashboard-tests] recent incidents refreshed fetch');
    const refreshed = await request(app)
      .get('/api/dashboard/incidents/recent')
      .query({ limit: 3, refresh: 'true' });
    expect(refreshed.status).toBe(200);
    const refreshedNumbers = (refreshed.body as Array<{ incidentNumber: string }>).map(
      (item) => item.incidentNumber
    );
    expect(refreshedNumbers[0]).toBe(inserted[0]);
  });

  test('streams CSV export with metadata and default columns', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app).get('/api/dashboard/export');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toMatch(
      /attachment; filename="incidents-export-/u
    );
    expect(response.headers['x-export-total']).toBeDefined();

    const lines = response.text.split(/\r?\n/u).filter((line) => line.length > 0);
    expect(lines[0]).toMatch(/^# Generated At:/u);
    expect(lines[1]).toMatch(/^# Record Count:/u);
    expect(lines[2]).toMatch(/^# Filters:/u);

    const headerLine = lines.find((line) => !line.startsWith('#'));
    expect(headerLine).toBeDefined();
    const headers = (headerLine as string).split(',');
    expect(headers).toEqual(
      expect.arrayContaining(['Incident Number', 'Severity Code', 'Primary Station Code'])
    );
  });

  test('applies filters when exporting incidents as CSV', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app)
      .get('/api/dashboard/export')
      .query({ severityCodes: 'CRITICAL' });

    expect(response.status).toBe(200);

    const lines = response.text.split(/\r?\n/u).filter((line) => line.length > 0);
    const filtersLine = lines.find((line) => line.startsWith('# Filters:'));
    expect(filtersLine).toBeDefined();
    expect(filtersLine as string).toContain('severityCodes=CRITICAL');

    const dataLines = lines.filter((line) => !line.startsWith('#'));

    const header = dataLines.shift();
    expect(header).toBeDefined();
    const headers = (header as string).split(',');
    const severityIndex = headers.indexOf('Severity Code');
    expect(severityIndex).toBeGreaterThan(-1);

    for (const line of dataLines) {
      const cells = line.split(',');
      expect(cells[severityIndex]).toBe('CRITICAL');
    }
  });

  test('enforces export limit guardrails', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app).get('/api/dashboard/export').query({ limit: 5 });

    expect(response.status).toBe(400);
    const body = response.body as DashboardErrorResponse;
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.message).toMatch(/exceeds the export limit of 5/u);
  });

  test('validates includeColumns parameter for export', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app)
      .get('/api/dashboard/export')
      .query({ includeColumns: 'incidentNumber,severityCode' });

    expect(response.status).toBe(200);
    const lines = response.text
      .split(/\r?\n/u)
      .filter((line) => line.length > 0 && !line.startsWith('#'));

    const header = lines[0];
    expect(header).toBe('Incident Number,Severity Code');
  });

  test('rejects unknown export columns', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app)
      .get('/api/dashboard/export')
      .query({ includeColumns: 'unknownColumn' });

    expect(response.status).toBe(400);
    const body = response.body as DashboardErrorResponse;
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.message).toMatch(/Unknown column 'unknownColumn'/u);
  });

  test('exports resolved incidents with large dataset within caps', async () => {
    if (!requireDb()) {
      return;
    }

    console.info('[dashboard-tests] export resolved seeding bulk incidents');
    await insertIncidentBatch({
      prefix: BULK_PREFIX,
      count: 120,
      baseTime: new Date('2025-08-15T00:00:00Z'),
      intervalMinutes: 15,
      statusCodes: ['RESOLVED'],
      severityCodes: ['LOW', 'HIGH'],
      typeCodes: ['HAZMAT'],
    });

    console.info('[dashboard-tests] export resolved hitting endpoint');
    const response = await request(app)
      .get('/api/dashboard/export')
      .query({ statusCodes: 'RESOLVED', includeColumns: 'incidentNumber,statusCode' });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');

    const [{ count }] = await db('incidents')
      .join('incident_statuses', 'incidents.status_id', 'incident_statuses.id')
      .where('incident_statuses.status_code', 'RESOLVED')
      .count<{ count: string }[]>({ count: '*' });

    const expectedTotal = parseCount(count);
    expect(Number(response.headers['x-export-total'])).toBe(expectedTotal);

    const lines = response.text.split(/\r?\n/u).filter((line) => line.length > 0);
    const filtersLine = lines.find((line) => line.startsWith('# Filters:'));
    expect(filtersLine).toBeDefined();
    expect(filtersLine as string).toContain('statusCodes=RESOLVED');

    const headerIndex = lines.findIndex((line) => !line.startsWith('#'));
    expect(headerIndex).toBeGreaterThan(-1);
    if (headerIndex < 0) {
      throw new Error('CSV header missing');
    }

    const headerRow = lines[headerIndex];
    expect(headerRow).toBe('Incident Number,Status Code');

    const dataLines = lines.slice(headerIndex + 1);
    expect(dataLines.length).toBe(expectedTotal);
  });

  test('returns empty CSV when filters exclude all incidents', async () => {
    if (!requireDb()) {
      return;
    }

    const response = await request(app)
      .get('/api/dashboard/export')
      .query({ statusCodes: 'NON_EXISTENT' });

    expect(response.status).toBe(200);
    expect(Number(response.headers['x-export-total'])).toBe(0);

    const lines = response.text.split(/\r?\n/u).filter((line) => line.length > 0);
    const headerIndex = lines.findIndex((line) => !line.startsWith('#'));
    expect(headerIndex).toBeGreaterThan(-1);
    if (headerIndex < 0) {
      throw new Error('CSV header missing');
    }

    const dataLines = lines.slice(headerIndex + 1);
    expect(dataLines).toHaveLength(0);
  });
});
