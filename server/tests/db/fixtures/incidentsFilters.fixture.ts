import type { Knex } from 'knex';
import { getLookupId, iso, pointWkt } from '../testUtils';

export interface SeededIncidentRecord {
  incidentNumber: string;
  occurrenceAt: Date;
  severityCode: string;
  statusCode: string;
  typeCode: string;
  isActive: boolean;
}

export interface SeededStationRecord {
  id: number;
  stationCode: string;
  isActive: boolean;
}

export interface SeededIncidentsDataset {
  incidents: SeededIncidentRecord[];
  stations: SeededStationRecord[];
}

export const INCIDENT_FIXTURE_COUNT = 12;

export const seedIncidentsFixture = async (
  db: Knex,
  testPrefix: string
): Promise<SeededIncidentsDataset> => {
  const suffix = Date.now().toString(36);

  const [zone] = await db('response_zones')
    .insert({
      zone_code: `${testPrefix}_ZONE_${suffix}`,
      name: `${testPrefix} Zone ${suffix}`,
      boundary: db.raw('ST_GeomFromText(?, 4326)', [
        'MULTIPOLYGON(((-122.5 37.7, -122.3 37.7, -122.3 37.9, -122.5 37.9, -122.5 37.7)))',
      ]),
    })
    .returning<{ id: number }[]>('id');

  const stationConfigs = [
    { suffix: 'A', isActive: true, lng: -122.41, lat: 37.77 },
    { suffix: 'B', isActive: false, lng: -122.4, lat: 37.75 },
  ];

  const stations: SeededStationRecord[] = [];

  for (const config of stationConfigs) {
    const [station] = await db('stations')
      .insert({
        station_code: `${testPrefix}_STATION_${config.suffix}_${suffix}`,
        name: `${testPrefix} Station ${config.suffix}`,
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
  const severityCodes = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
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
  const incidents: SeededIncidentRecord[] = [];

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

  for (let i = 0; i < INCIDENT_FIXTURE_COUNT; i += 1) {
    const severityCode = severityCodes[i % severityCodes.length];
    let statusCode = statusCodes[i % statusCodes.length];
    if (severityCode === 'CRITICAL') {
      statusCode = 'ON_SCENE';
    }
    const typeCode = typeCodes[i % typeCodes.length];
    const station = stations[i % stations.length];
    const isActive = statusCode !== 'RESOLVED';
    const occurrenceAt = new Date(baseTime + i * 60 * 60 * 1000);
    const incidentNumber =
      `${testPrefix}-INC-${i.toString().padStart(3, '0')}-${suffix}`.toUpperCase();

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

    incidents.push({
      incidentNumber,
      occurrenceAt,
      severityCode,
      statusCode,
      typeCode,
      isActive,
    });

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

  return { incidents, stations };
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
