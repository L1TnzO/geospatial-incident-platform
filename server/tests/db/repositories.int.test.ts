import type { Knex } from 'knex';
import { closeDb, getDb, IncidentRepository, StationRepository } from '../../src/db';
import { getLookupId, iso, pointWkt, polygonWkt, purgeTestRecords } from './testUtils';

const TEST_PREFIX = 'TEST_TASK_2_5';

const testContext: {
  responseZones: { id: number; zoneCode: string }[];
  stations: { id: number; stationCode: string }[];
  incidents: { id: number; incidentNumber: string; isActive: boolean; occurrenceAt: Date }[];
  dbReady: boolean;
} = {
  responseZones: [],
  stations: [],
  incidents: [],
  dbReady: true,
};

const seedTestData = async (db: Knex): Promise<void> => {
  await purgeTestRecords(db, TEST_PREFIX);

  const suffix = Date.now().toString(36);

  const [zone] = await db('response_zones')
    .insert({
      zone_code: `${TEST_PREFIX}_ZONE_${suffix}`,
      name: `Test Zone ${suffix}`,
      boundary: db.raw('ST_GeomFromText(?, 4326)', [polygonWkt]),
    })
    .returning<{ id: number; zone_code: string }[]>(['id', 'zone_code']);

  testContext.responseZones.push({ id: zone.id, zoneCode: zone.zone_code });

  const [activeStation] = await db('stations')
    .insert({
      station_code: `${TEST_PREFIX}_STATION_ACTIVE_${suffix}`,
      name: `Test Station Active ${suffix}`,
      battalion: 'B1',
      phone: '555-0100',
      is_active: true,
      response_zone_id: zone.id,
      location: db.raw('ST_GeomFromText(?, 4326)', [pointWkt(-122.41, 37.77)]),
      coverage_radius_meters: 5000,
    })
    .returning<{ id: number; station_code: string }[]>(['id', 'station_code']);

  const [inactiveStation] = await db('stations')
    .insert({
      station_code: `${TEST_PREFIX}_STATION_INACTIVE_${suffix}`,
      name: `Test Station Inactive ${suffix}`,
      battalion: 'B2',
      phone: '555-0101',
      is_active: false,
      response_zone_id: zone.id,
      location: db.raw('ST_GeomFromText(?, 4326)', [pointWkt(-122.4, 37.75)]),
      coverage_radius_meters: 4500,
    })
    .returning<{ id: number; station_code: string }[]>(['id', 'station_code']);

  testContext.stations.push(
    { id: activeStation.id, stationCode: activeStation.station_code },
    { id: inactiveStation.id, stationCode: inactiveStation.station_code }
  );

  const typeStructure = await getLookupId(db, 'incident_types', 'type_code', 'FIRE_STRUCTURE');
  const typeMedical = await getLookupId(db, 'incident_types', 'type_code', 'MEDICAL');
  const severityCritical = await getLookupId(
    db,
    'incident_severities',
    'severity_code',
    'CRITICAL'
  );
  const severityLow = await getLookupId(db, 'incident_severities', 'severity_code', 'LOW');
  const statusOnScene = await getLookupId(db, 'incident_statuses', 'status_code', 'ON_SCENE');
  const statusResolved = await getLookupId(db, 'incident_statuses', 'status_code', 'RESOLVED');
  const source911 = await getLookupId(db, 'incident_sources', 'source_code', '911');
  const weatherClear = await getLookupId(db, 'weather_conditions', 'condition_code', 'CLEAR');

  const occurrenceActive = new Date('2025-09-15T10:00:00Z');
  const occurrenceInactive = new Date('2025-08-20T09:00:00Z');

  const [activeIncident] = await db('incidents')
    .insert({
      incident_number: `${TEST_PREFIX}-INC-A-${suffix}`,
      external_reference: `EXT-${suffix}`,
      title: 'Structure Fire - Test',
      narrative: 'Initial narrative for active incident',
      type_id: typeStructure,
      severity_id: severityCritical,
      status_id: statusOnScene,
      source_id: source911,
      weather_condition_id: weatherClear,
      primary_station_id: activeStation.id,
      occurrence_at: occurrenceActive,
      reported_at: iso('2025-09-15T10:05:00Z'),
      dispatch_at: iso('2025-09-15T10:08:00Z'),
      arrival_at: iso('2025-09-15T10:15:00Z'),
      resolved_at: null,
      location: db.raw('ST_GeomFromText(?, 4326)', [pointWkt(-122.405, 37.776)]),
      location_geohash: '9q8yyk',
      casualty_count: 1,
      responder_injuries: 0,
      estimated_damage_amount: 150000,
      is_active: true,
      metadata: db.raw('?::jsonb', [JSON.stringify({ wind_speed: 12, visibility: 'moderate' })]),
      address_line_1: '123 Main St',
      city: 'San Francisco',
      region: 'CA',
      postal_code: '94103',
    })
    .returning<
      { id: number; incident_number: string; is_active: boolean; occurrence_at: Date | string }[]
    >(['id', 'incident_number', 'is_active', 'occurrence_at']);

  const [inactiveIncident] = await db('incidents')
    .insert({
      incident_number: `${TEST_PREFIX}-INC-B-${suffix}`,
      title: 'Medical Response - Test',
      type_id: typeMedical,
      severity_id: severityLow,
      status_id: statusResolved,
      source_id: source911,
      primary_station_id: inactiveStation.id,
      occurrence_at: occurrenceInactive,
      reported_at: iso('2025-08-20T09:05:00Z'),
      dispatch_at: iso('2025-08-20T09:07:00Z'),
      arrival_at: iso('2025-08-20T09:12:00Z'),
      resolved_at: iso('2025-08-20T10:30:00Z'),
      location: db.raw('ST_GeomFromText(?, 4326)', [pointWkt(-122.41, 37.74)]),
      location_geohash: '9q8yxh',
      casualty_count: 0,
      responder_injuries: 0,
      estimated_damage_amount: 0,
      is_active: false,
      metadata: db.raw('?::jsonb', [JSON.stringify({ transported: true })]),
    })
    .returning<
      { id: number; incident_number: string; is_active: boolean; occurrence_at: Date | string }[]
    >(['id', 'incident_number', 'is_active', 'occurrence_at']);

  testContext.incidents.push(
    {
      id: activeIncident.id,
      incidentNumber: activeIncident.incident_number,
      isActive: activeIncident.is_active,
      occurrenceAt: new Date(activeIncident.occurrence_at),
    },
    {
      id: inactiveIncident.id,
      incidentNumber: inactiveIncident.incident_number,
      isActive: inactiveIncident.is_active,
      occurrenceAt: new Date(inactiveIncident.occurrence_at),
    }
  );

  await db('incident_units').insert([
    {
      incident_id: activeIncident.id,
      station_id: activeStation.id,
      assignment_role: 'Primary Response',
      dispatched_at: iso('2025-09-15T10:08:00Z'),
      cleared_at: null,
    },
    {
      incident_id: inactiveIncident.id,
      station_id: inactiveStation.id,
      assignment_role: 'Support',
      dispatched_at: iso('2025-08-20T09:07:00Z'),
      cleared_at: iso('2025-08-20T10:40:00Z'),
    },
  ]);

  await db('incident_assets').insert({
    incident_id: activeIncident.id,
    asset_identifier: `ENGINE-${suffix}`,
    asset_type: 'Engine',
    status: 'In Service',
    notes: 'Deployed primary hose line',
  });

  await db('incident_notes').insert([
    {
      incident_id: activeIncident.id,
      author: 'Captain Smith',
      note: 'Evacuated adjacent building.',
      created_at: iso('2025-09-15T10:20:00Z'),
    },
    {
      incident_id: inactiveIncident.id,
      author: 'EMT Johnson',
      note: 'Patient stabilized and transported.',
      created_at: iso('2025-08-20T09:20:00Z'),
    },
  ]);
};

describe('Data Access Repositories', () => {
  let db: Knex;

  beforeAll(async () => {
    db = getDb();

    try {
      await db.raw('select 1');
    } catch (error) {
      testContext.dbReady = false;
      console.warn('Skipping repository integration tests: database connection failed', error);
      return;
    }

    await db.migrate.latest();
    await db.seed.run();
    await seedTestData(db);
  }, 30000);

  afterAll(async () => {
    if (testContext.dbReady) {
      await purgeTestRecords(db, TEST_PREFIX);
    }
    await closeDb();
  });

  test('lists incidents with filtering and pagination', async () => {
    if (!testContext.dbReady) {
      console.warn('Database unavailable for integration tests; skipping assertions.');
      return;
    }

    const repo = new IncidentRepository(db);

    const result = await repo.listIncidents({
      page: 1,
      pageSize: 10,
      severityCodes: ['CRITICAL'],
      isActive: true,
    });

    expect(result.total).toBeGreaterThanOrEqual(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);

    const target = result.data.find(
      (incident) => incident.incidentNumber === testContext.incidents[0]?.incidentNumber
    );

    expect(target).toBeDefined();
    expect(target?.severity.code).toBe('CRITICAL');
    expect(target?.status.code).toBe('ON_SCENE');
    expect(target?.location.geometry.type).toBe('Point');

    const inactiveResults = await repo.listIncidents({ isActive: false, page: 1, pageSize: 5 });
    expect(inactiveResults.data.every((incident) => incident.isActive === false)).toBe(true);

    const windowResults = await repo.listIncidents({
      startDate: iso('2025-09-10T00:00:00Z'),
      endDate: iso('2025-09-20T00:00:00Z'),
    });

    expect(
      windowResults.data.some(
        (incident) => incident.incidentNumber === testContext.incidents[0]?.incidentNumber
      )
    ).toBe(true);
    expect(
      windowResults.data.some(
        (incident) => incident.incidentNumber === testContext.incidents[1]?.incidentNumber
      )
    ).toBe(false);

    const severitySorted = await repo.listIncidents({
      page: 1,
      pageSize: 10,
      sortBy: 'severityPriority',
      sortDirection: 'asc',
    });

    const priorities = severitySorted.data.map((incident) => incident.severity.priority);
    const sortedPriorities = [...priorities].sort((a, b) => a - b);
    expect(priorities).toEqual(sortedPriorities);

    const occurrenceSortedDesc = await repo.listIncidents({
      page: 1,
      pageSize: 10,
      sortBy: 'occurrenceAt',
      sortDirection: 'desc',
    });

    const occurrenceTimes = occurrenceSortedDesc.data.map((incident) =>
      new Date(incident.occurrenceAt).getTime()
    );
    const sortedTimes = [...occurrenceTimes].sort((a, b) => b - a);
    expect(occurrenceTimes).toEqual(sortedTimes);
  });

  test('fetches incident detail with related collections', async () => {
    if (!testContext.dbReady) {
      console.warn('Database unavailable for integration tests; skipping assertions.');
      return;
    }

    const repo = new IncidentRepository(db);
    const incidentNumber = testContext.incidents[0]?.incidentNumber ?? '';

    const detail = await repo.getIncidentDetail(incidentNumber);
    expect(detail).toBeDefined();
    expect(detail?.incidentNumber).toBe(incidentNumber);
    expect(detail?.metadata).toEqual(expect.objectContaining({ wind_speed: 12 }));
    expect(detail?.units.length).toBeGreaterThan(0);
    expect(detail?.assets.length).toBeGreaterThan(0);
    expect(detail?.notes.length).toBeGreaterThan(0);
  });

  test('lists stations with optional activity filtering', async () => {
    if (!testContext.dbReady) {
      console.warn('Database unavailable for integration tests; skipping assertions.');
      return;
    }

    const repo = new StationRepository(db);

    const allStations = await repo.listStations();
    expect(allStations.length).toBeGreaterThanOrEqual(2);

    const activeStations = await repo.listStations({ isActive: true });
    expect(activeStations.every((station) => station.isActive)).toBe(true);

    const inactiveStations = await repo.listStations({ isActive: false });
    expect(inactiveStations.length).toBe(1);
    expect(inactiveStations[0]?.isActive).toBe(false);

    const target = allStations.find(
      (station) => station.stationCode === testContext.stations[0]?.stationCode
    );
    expect(target).toBeDefined();
    expect(target?.location.geometry.type).toBe('Point');
    expect(target?.responseZone?.boundary.geometry.type).toBe('MultiPolygon');
  });
});
