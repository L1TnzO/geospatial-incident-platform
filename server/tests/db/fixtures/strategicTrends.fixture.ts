import type { Knex } from 'knex';
import { getLookupId, iso, pointWkt } from '../testUtils';

export interface StrategicTrendExpectations {
  monthlyCounts: Record<string, number>;
  quarterlyCounts: Record<string, number>;
  typeMonthlyCounts: Record<string, number>;
}

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

const formatMonthKey = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const formatQuarterKey = (date: Date): string => {
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${date.getUTCFullYear()}-Q${quarter}`;
};

export const seedStrategicTrendsFixture = async (
  db: Knex,
  testPrefix: string
): Promise<StrategicTrendExpectations> => {
  const suffix = Date.now().toString(36);

  const [zone] = await db('response_zones')
    .insert({
      zone_code: `${testPrefix}_STRAT_ZONE_${suffix}`,
      name: `${testPrefix} Strategic Zone ${suffix}`,
      boundary: db.raw('ST_GeomFromText(?, 4326)', [
        'MULTIPOLYGON(((-122.6 37.6, -122.2 37.6, -122.2 38.0, -122.6 38.0, -122.6 37.6)))',
      ]),
    })
    .returning<{ id: number }[]>('id');

  const [station] = await db('stations')
    .insert({
      station_code: `${testPrefix}_STRAT_STATION_${suffix}`,
      name: `${testPrefix} Strategic Station`,
      is_active: true,
      response_zone_id: zone.id,
      location: db.raw('ST_GeomFromText(?, 4326)', [pointWkt(-122.4, 37.8)]),
      coverage_radius_meters: 7500,
    })
    .returning<{ id: number }[]>('id');

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

  const baseDate = new Date(Date.UTC(2024, 0, 1, 8, 0, 0, 0));
  const monthlyCounts: Record<string, number> = {};
  const quarterlyCounts: Record<string, number> = {};
  const typeMonthlyCounts: Record<string, number> = {};

  for (let monthOffset = 0; monthOffset < 24; monthOffset += 1) {
    const monthStart = new Date(baseDate);
    monthStart.setUTCMonth(baseDate.getUTCMonth() + monthOffset);
    const monthKey = formatMonthKey(monthStart);
    const quarterKey = formatQuarterKey(monthStart);
    const incidentsThisMonth = monthOffset + 1;

    for (let index = 0; index < incidentsThisMonth; index += 1) {
      const severityCode = severityCodes[(monthOffset + index) % severityCodes.length];
      const statusCode = statusCodes[(monthOffset + index) % statusCodes.length];
      const typeCode = typeCodes[(monthOffset + index) % typeCodes.length];
      const isActive = statusCode !== 'RESOLVED';

      const occurrenceAt = new Date(monthStart.getTime());
      occurrenceAt.setUTCDate(Math.min(index + 1, 28));
      occurrenceAt.setUTCHours(8 + (index % 6), (index * 10) % 60, 0, 0);

      const incidentNumber = `${testPrefix}-STRAT-${monthOffset.toString().padStart(2, '0')}-${index
        .toString()
        .padStart(2, '0')}-${suffix}`.toUpperCase();

      await db('incidents').insert({
        incident_number: incidentNumber,
        title: `${severityCode} ${typeCode} Strategic Incident ${monthOffset}-${index}`,
        type_id: typeIdMap.get(typeCode),
        severity_id: severityIdMap.get(severityCode),
        status_id: statusIdMap.get(statusCode),
        source_id: sourceId,
        weather_condition_id: weatherId,
        primary_station_id: station.id,
        occurrence_at: iso(occurrenceAt),
        reported_at: iso(new Date(occurrenceAt.getTime() + 6 * 60 * 1000)),
        dispatch_at: iso(new Date(occurrenceAt.getTime() + 9 * 60 * 1000)),
        arrival_at: iso(new Date(occurrenceAt.getTime() + 18 * 60 * 1000)),
        resolved_at: isActive ? null : iso(new Date(occurrenceAt.getTime() + 2 * 60 * 60 * 1000)),
        is_active: isActive,
        casualty_count: index % 4,
        responder_injuries: index % 2,
        estimated_damage_amount: (index * 1000).toString(),
        location: db.raw('ST_GeomFromText(?, 4326)', [
          pointWkt(-122.45 + (index % 5) * 0.01, 37.75 + (index % 4) * 0.01),
        ]),
        location_geohash: `9q8y${(monthOffset + index).toString(36)}`,
        metadata: db.raw('?::jsonb', [JSON.stringify({ strategicWindow: monthKey })]),
      });

      monthlyCounts[monthKey] = (monthlyCounts[monthKey] ?? 0) + 1;
      quarterlyCounts[quarterKey] = (quarterlyCounts[quarterKey] ?? 0) + 1;
      const typeMonthKey = `${typeCode}:${monthKey}`;
      typeMonthlyCounts[typeMonthKey] = (typeMonthlyCounts[typeMonthKey] ?? 0) + 1;
    }
  }

  return {
    monthlyCounts,
    quarterlyCounts,
    typeMonthlyCounts,
  };
};
