import type { Knex } from 'knex';
import { closeDb, getDb, IncidentRepository, StationRepository } from '../../src/db';
import { getLookupId, iso, pointWkt, purgeTestRecords } from './testUtils';

const TEST_PREFIX = 'TEST_TASK_2_8';
const BULK_INCIDENT_COUNT = 24;

interface BulkIncident {
  id: number;
  incidentNumber: string;
  severityCode: string;
  statusCode: string;
  isActive: boolean;
  occurrenceAt: Date;
}

describe('Data access integrity', () => {
  let db: Knex;
  let dbReady = true;
  const bulkIncidents: BulkIncident[] = [];
  const stations: { id: number; stationCode: string; isActive: boolean }[] = [];
  let responseZoneId: number | null = null;

  const severityCodes = ['LOW', 'MODERATE', 'CRITICAL'];
  const statusCodes = ['REPORTED', 'ON_SCENE', 'RESOLVED'];
  const typeCodes = ['FIRE_STRUCTURE', 'MEDICAL', 'HAZMAT'];

  beforeAll(async () => {
    db = getDb();

    try {
      await db.raw('select 1');
    } catch (error) {
      dbReady = false;
      console.warn('Skipping data access integrity tests: database connection failed', error);
      return;
    }

    await db.migrate.latest();
    await db.seed.run();
    await purgeTestRecords(db, TEST_PREFIX);

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

    responseZoneId = zone.id;

    const stationConfigs = [
      { codeSuffix: 'ALPHA', isActive: true, lng: -122.41, lat: 37.77, radius: 4800 },
      { codeSuffix: 'BRAVO', isActive: true, lng: -122.42, lat: 37.75, radius: 5200 },
      { codeSuffix: 'CHARLIE', isActive: false, lng: -122.39, lat: 37.73, radius: 4500 },
    ];

    for (const config of stationConfigs) {
      const [station] = await db('stations')
        .insert({
          station_code: `${TEST_PREFIX}_STATION_${config.codeSuffix}_${suffix}`,
          name: `${TEST_PREFIX} Station ${config.codeSuffix}`,
          battalion: 'B99',
          phone: '555-0199',
          is_active: config.isActive,
          response_zone_id: responseZoneId,
          location: db.raw('ST_GeomFromText(?, 4326)', [pointWkt(config.lng, config.lat)]),
          coverage_radius_meters: config.radius,
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

    const typeIdMap = new Map<string, number>();
    const severityIdMap = new Map<string, number>();
    const statusIdMap = new Map<string, number>();

    for (const code of typeCodes) {
      typeIdMap.set(code, await getLookupId(db, 'incident_types', 'type_code', code));
    }
    for (const code of severityCodes) {
      severityIdMap.set(code, await getLookupId(db, 'incident_severities', 'severity_code', code));
    }
    for (const code of statusCodes) {
      statusIdMap.set(code, await getLookupId(db, 'incident_statuses', 'status_code', code));
    }

    const sourceId = await getLookupId(db, 'incident_sources', 'source_code', '911');
    const weatherId = await getLookupId(db, 'weather_conditions', 'condition_code', 'CLEAR');

    const unitsToInsert: Array<{
      incident_id: number;
      station_id: number;
      assignment_role: string;
      dispatched_at: string;
      cleared_at: string | null;
    }> = [];

    const assetsToInsert: Array<{
      incident_id: number;
      asset_identifier: string;
      asset_type: string;
      status: string;
      notes: string | null;
    }> = [];

    const notesToInsert: Array<{
      incident_id: number;
      author: string;
      note: string;
      created_at: string;
    }> = [];

    const baseOccurrence = new Date('2025-09-01T00:00:00Z').getTime();

    for (let i = 0; i < BULK_INCIDENT_COUNT; i += 1) {
      const severityCode = severityCodes[i % severityCodes.length];
      const statusCode = statusCodes[i % statusCodes.length];
      const typeCode = typeCodes[i % typeCodes.length];
      const station = stations[i % stations.length];
      const isActive = statusCode !== 'RESOLVED';
      const occurrenceAt = new Date(baseOccurrence + i * 60 * 60 * 1000);
      const incidentNumber = `${TEST_PREFIX}-INC-${i.toString().padStart(3, '0')}`;

      const [inserted] = await db('incidents')
        .insert({
          incident_number: incidentNumber,
          title: `${severityCode} ${typeCode} scenario ${i}`,
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
          casualty_count: i % 4,
          responder_injuries: i % 2,
          estimated_damage_amount: isActive ? null : 50000 + i * 1000,
          location: db.raw('ST_GeomFromText(?, 4326)', [
            pointWkt(-122.4 + (i % 5) * 0.01, 37.7 + (i % 4) * 0.01),
          ]),
          location_geohash: `9q8y${(i % 10).toString(36)}`,
          metadata: db.raw('?::jsonb', [
            JSON.stringify({
              wind_speed: 5 + (i % 4) * 3,
              humidity: 40 + i,
            }),
          ]),
        })
        .returning<{ id: number; occurrence_at: Date }[]>(['id', 'occurrence_at']);

      bulkIncidents.push({
        id: inserted.id,
        incidentNumber,
        severityCode,
        statusCode,
        isActive,
        occurrenceAt: new Date(inserted.occurrence_at),
      });

      unitsToInsert.push({
        incident_id: inserted.id,
        station_id: station.id,
        assignment_role: 'Auto Assignment',
        dispatched_at: iso(new Date(occurrenceAt.getTime() + 8 * 60 * 1000)),
        cleared_at: isActive ? null : iso(new Date(occurrenceAt.getTime() + 95 * 60 * 1000)),
      });

      if (i % 3 === 0) {
        assetsToInsert.push({
          incident_id: inserted.id,
          asset_identifier: `${TEST_PREFIX}-ASSET-${i}`,
          asset_type: i % 2 === 0 ? 'Engine' : 'Truck',
          status: isActive ? 'In Service' : 'Released',
          notes: i % 2 === 0 ? 'Primary suppression asset' : null,
        });

        notesToInsert.push({
          incident_id: inserted.id,
          author: 'Integrity Bot',
          note: `Integrity check note ${i}`,
          created_at: iso(new Date(occurrenceAt.getTime() + 20 * 60 * 1000)),
        });
      }
    }

    if (unitsToInsert.length) {
      await db('incident_units').insert(unitsToInsert);
    }
    if (assetsToInsert.length) {
      await db('incident_assets').insert(assetsToInsert);
    }
    if (notesToInsert.length) {
      await db('incident_notes').insert(notesToInsert);
    }
  }, 60000);

  afterAll(async () => {
    if (dbReady) {
      await purgeTestRecords(db, TEST_PREFIX);
    }
    await closeDb();
  });

  const requireDb = () => {
    if (!dbReady) {
      console.warn('Database unavailable for data access integrity tests; skipping assertions.');
    }
    return dbReady;
  };

  test('paginates incidents with combined filters and preserves geometries', async () => {
    if (!requireDb()) {
      return;
    }

    const repo = new IncidentRepository(db);
    const result = await repo.listIncidents({
      page: 2,
      pageSize: 5,
      severityCodes: ['CRITICAL', 'MODERATE'],
      statusCodes: ['REPORTED', 'ON_SCENE'],
      isActive: true,
      startDate: iso('2025-09-01T00:00:00Z'),
      endDate: iso('2025-09-05T00:00:00Z'),
    });

    const expected = bulkIncidents.filter((incident) => {
      const inRange =
        incident.occurrenceAt >= new Date('2025-09-01T00:00:00Z') &&
        incident.occurrenceAt <= new Date('2025-09-05T00:00:00Z');
      return (
        incident.isActive &&
        inRange &&
        ['CRITICAL', 'MODERATE'].includes(incident.severityCode) &&
        ['REPORTED', 'ON_SCENE'].includes(incident.statusCode)
      );
    });

    expect(result.total).toBe(expected.length);
    expect(result.data.length).toBeLessThanOrEqual(5);
    result.data.forEach((incident) => {
      expect(incident.location.geometry.type).toBe('Point');
      expect(incident.type.code).toBeDefined();
    });

    const sortedExpected = expected
      .slice()
      .sort((a, b) => b.occurrenceAt.getTime() - a.occurrenceAt.getTime());
    const expectedPageTwo = sortedExpected.slice(5, 10).map((incident) => incident.incidentNumber);
    const actualIncidentNumbers = result.data.map((incident) => incident.incidentNumber);
    expect(actualIncidentNumbers).toEqual(expectedPageTwo);
  });

  test('fetches incident detail with assets, notes, and units', async () => {
    if (!requireDb()) {
      return;
    }

    const targetIncident = bulkIncidents.find((incident) =>
      incident.incidentNumber.endsWith('000')
    );
    if (!targetIncident) {
      throw new Error('Target incident for detail test is missing');
    }

    const repo = new IncidentRepository(db);
    const detail = await repo.getIncidentDetail(targetIncident.incidentNumber);

    expect(detail).toBeDefined();
    expect(detail?.incidentNumber).toBe(targetIncident.incidentNumber);
    expect(detail?.units.length).toBeGreaterThan(0);
    expect(detail?.assets.length).toBeGreaterThan(0);
    expect(detail?.notes.length).toBeGreaterThan(0);
  });

  test('station repository returns active/inactive stations with geometries', async () => {
    if (!requireDb()) {
      return;
    }

    const repo = new StationRepository(db);
    const allStations = await repo.listStations();
    const testStations = allStations.filter((station) =>
      station.stationCode.startsWith(TEST_PREFIX)
    );
    expect(testStations).toHaveLength(stations.length);
    testStations.forEach((station) => {
      expect(station.location.geometry.type).toBe('Point');
      expect(station.responseZone?.boundary.geometry.type).toBe('MultiPolygon');
    });

    const inactiveStations = await repo.listStations({ isActive: false });
    expect(inactiveStations.some((station) => station.stationCode.startsWith(TEST_PREFIX))).toBe(
      true
    );
  });

  test('passes referential integrity validation queries', async () => {
    if (!requireDb()) {
      return;
    }

    const incidentIdsForPrefix = () =>
      db('incidents').select('id').where('incident_number', 'like', `${TEST_PREFIX}%`);

    const incidentsMissingStation = await db('incidents as i')
      .leftJoin('stations as s', 's.id', 'i.primary_station_id')
      .where('i.incident_number', 'like', `${TEST_PREFIX}%`)
      .whereNull('s.id')
      .count<{ count: string }>('i.id as count')
      .first();
    expect(Number(incidentsMissingStation?.count ?? 0)).toBe(0);

    const unitsMissingStation = await db('incident_units as iu')
      .leftJoin('stations as s', 's.id', 'iu.station_id')
      .whereIn('iu.incident_id', incidentIdsForPrefix())
      .whereNull('s.id')
      .count<{ count: string }>('iu.id as count')
      .first();
    expect(Number(unitsMissingStation?.count ?? 0)).toBe(0);

    const unitsMissingIncident = await db('incident_units as iu')
      .leftJoin('incidents as i', 'i.id', 'iu.incident_id')
      .whereIn('iu.incident_id', incidentIdsForPrefix())
      .whereNull('i.id')
      .count<{ count: string }>('iu.id as count')
      .first();
    expect(Number(unitsMissingIncident?.count ?? 0)).toBe(0);

    const assetsMissingIncident = await db('incident_assets as ia')
      .leftJoin('incidents as i', 'i.id', 'ia.incident_id')
      .whereIn('ia.incident_id', incidentIdsForPrefix())
      .whereNull('i.id')
      .count<{ count: string }>('ia.id as count')
      .first();
    expect(Number(assetsMissingIncident?.count ?? 0)).toBe(0);

    const notesMissingIncident = await db('incident_notes as n')
      .leftJoin('incidents as i', 'i.id', 'n.incident_id')
      .whereIn('n.incident_id', incidentIdsForPrefix())
      .whereNull('i.id')
      .count<{ count: string }>('n.id as count')
      .first();
    expect(Number(notesMissingIncident?.count ?? 0)).toBe(0);

    const invalidStationGeometries = await db('stations')
      .where('station_code', 'like', `${TEST_PREFIX}%`)
      .whereRaw('NOT ST_IsValid(location)')
      .count<{ count: string }>('id as count')
      .first();
    expect(Number(invalidStationGeometries?.count ?? 0)).toBe(0);

    const invalidIncidentGeometries = await db('incidents')
      .where('incident_number', 'like', `${TEST_PREFIX}%`)
      .whereRaw('NOT ST_IsValid(location)')
      .count<{ count: string }>('id as count')
      .first();
    expect(Number(invalidIncidentGeometries?.count ?? 0)).toBe(0);

    const stationWrongSrid = await db('stations')
      .where('station_code', 'like', `${TEST_PREFIX}%`)
      .whereRaw('ST_SRID(location) <> 4326')
      .count<{ count: string }>('id as count')
      .first();
    expect(Number(stationWrongSrid?.count ?? 0)).toBe(0);

    const incidentWrongSrid = await db('incidents')
      .where('incident_number', 'like', `${TEST_PREFIX}%`)
      .whereRaw('ST_SRID(location) <> 4326')
      .count<{ count: string }>('id as count')
      .first();
    expect(Number(incidentWrongSrid?.count ?? 0)).toBe(0);

    const severityDistribution = await db('incidents as i')
      .join('incident_severities as sev', 'sev.id', 'i.severity_id')
      .where('i.incident_number', 'like', `${TEST_PREFIX}%`)
      .groupBy('sev.severity_code')
      .select<
        { severity_code: string; count: string }[]
      >('sev.severity_code', db.raw('COUNT(*)::int AS count'));
    const severityCodesSeen = severityDistribution.map((row) => row.severity_code).sort();
    expect(severityCodesSeen).toEqual(severityCodes.slice().sort());
    severityDistribution.forEach((row) => {
      expect(Number(row.count)).toBeGreaterThan(0);
    });
  });
});
