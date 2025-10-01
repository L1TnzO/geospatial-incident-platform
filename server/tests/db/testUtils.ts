import type { Knex } from 'knex';

export const polygonWkt =
  'MULTIPOLYGON(((-122.52 37.70, -122.35 37.70, -122.35 37.83, -122.52 37.83, -122.52 37.70)))';

export const pointWkt = (lng: number, lat: number): string => `POINT(${lng} ${lat})`;

export const iso = (input: string | Date): string => {
  const date = input instanceof Date ? input : new Date(input);
  return date.toISOString();
};

export const getLookupId = async (
  db: Knex,
  table: string,
  codeColumn: string,
  code: string
): Promise<number> => {
  const row = await db(table).where(codeColumn, code).first<{ id: number }>('id');
  if (!row) {
    throw new Error(`Missing lookup value ${code} in ${table}`);
  }
  return row.id;
};

export const purgeTestRecords = async (db: Knex, prefix: string): Promise<void> => {
  const incidentIdSubquery = db('incidents')
    .select('id')
    .where('incident_number', 'like', `${prefix}%`);

  await db('incident_notes').whereIn('incident_id', incidentIdSubquery).del();
  await db('incident_assets').whereIn('incident_id', incidentIdSubquery).del();
  await db('incident_units').whereIn('incident_id', incidentIdSubquery).del();
  await db('incidents').where('incident_number', 'like', `${prefix}%`).del();
  await db('stations').where('station_code', 'like', `${prefix}%`).del();
  await db('response_zones').where('zone_code', 'like', `${prefix}%`).del();
};
