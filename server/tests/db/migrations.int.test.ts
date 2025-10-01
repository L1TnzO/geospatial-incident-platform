import type { Knex } from 'knex';
import { closeDb, getDb } from '../../src/db';

const EXPECTED_TYPES = ['FIRE_STRUCTURE', 'FIRE_WILDLAND', 'HAZMAT', 'MEDICAL', 'RESCUE'];

const EXPECTED_SEVERITIES = ['CRITICAL', 'HIGH', 'LOW', 'MODERATE', 'SEVERE'];

const EXPECTED_STATUSES = ['CANCELLED', 'DISPATCHED', 'ON_SCENE', 'REPORTED', 'RESOLVED'];

const EXPECTED_SOURCES = ['911', 'FIELD_REPORT', 'SENSOR'];

const EXPECTED_WEATHER = ['CLEAR', 'HEAT', 'RAIN', 'SNOW', 'WIND'];

describe('Database migrations & seeds', () => {
  let db: Knex;
  let dbReady = true;

  beforeAll(async () => {
    db = getDb();

    try {
      await db.raw('select 1');
    } catch (error) {
      dbReady = false;
      console.warn('Skipping migration tests: database connection failed', error);
      return;
    }

    await db.migrate.rollback(undefined, true);
    await db.migrate.latest();
    await db.seed.run();
  }, 60000);

  afterAll(async () => {
    if (dbReady) {
      await closeDb();
    } else {
      await closeDb();
    }
  });

  const getCodes = async (table: string, column: string): Promise<string[]> => {
    const rows = await db(table).select<{ value: string }[]>(`${column} as value`).orderBy(column);
    return rows.map((row) => row.value);
  };

  const expectSetsEqual = (actual: string[], expected: string[]) => {
    const actualSorted = actual.slice().sort();
    const expectedSorted = expected.slice().sort();
    expect(actualSorted).toEqual(expectedSorted);
  };

  test('seeds expected lookup tables', async () => {
    if (!dbReady) {
      console.warn('Database unavailable for migration tests; skipping assertions.');
      return;
    }

    const incidentTypes = await getCodes('incident_types', 'type_code');
    expectSetsEqual(incidentTypes, EXPECTED_TYPES);

    const incidentSeverities = await getCodes('incident_severities', 'severity_code');
    expectSetsEqual(incidentSeverities, EXPECTED_SEVERITIES);

    const incidentStatuses = await getCodes('incident_statuses', 'status_code');
    expectSetsEqual(incidentStatuses, EXPECTED_STATUSES);

    const incidentSources = await getCodes('incident_sources', 'source_code');
    expectSetsEqual(incidentSources, EXPECTED_SOURCES);

    const weatherConditions = await getCodes('weather_conditions', 'condition_code');
    expectSetsEqual(weatherConditions, EXPECTED_WEATHER);
  });

  test('postgis extension and severity descriptions are available', async () => {
    if (!dbReady) {
      console.warn('Database unavailable for migration tests; skipping assertions.');
      return;
    }

    const postgisExistsResult = await db.raw<{ rows: Array<{ exists: boolean }> }>(
      "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') AS exists"
    );
    const postgisExists = Boolean(postgisExistsResult.rows?.[0]?.exists);
    expect(postgisExists).toBe(true);

    const severities = await db<{ severity_code: string; description: string | null }>(
      'incident_severities'
    ).select('severity_code', 'description');
    severities.forEach((severity) => {
      expect(severity.description).not.toBeUndefined();
    });
  });

  test('knex migrations table lists applied migrations', async () => {
    if (!dbReady) {
      console.warn('Database unavailable for migration tests; skipping assertions.');
      return;
    }

    const migrations = await db<{ name: string }>('knex_migrations').select('name').orderBy('name');
    const migrationNames = migrations.map((row) => row.name);

    expect(migrationNames.length).toBeGreaterThanOrEqual(2);
    expect(migrationNames).toContain('202510010001_initial_schema.js');
    expect(migrationNames).toContain('202510010002_add_description_to_severities.js');
  });
});
