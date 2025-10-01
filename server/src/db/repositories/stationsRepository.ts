import type { Knex } from 'knex';
import { getDb } from '../client';
import { geometryToFeature, parseGeometry } from '../utils';
import { type GeoJsonMultiPolygon, type GeoJsonPoint, type StationSummary } from '../types';

interface StationRow {
  stationCode: string;
  name: string;
  battalion: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  isActive: boolean;
  commissionedOn: string | null;
  decommissionedOn: string | null;
  coverageRadiusMeters: number | string | null;
  zoneCode: string | null;
  zoneName: string | null;
  locationGeoJson: unknown;
  responseZoneGeoJson: unknown;
}

export interface StationFilters {
  isActive?: boolean;
}

export class StationRepository {
  constructor(private readonly db: Knex = getDb()) {}

  public async listStations(filters: StationFilters = {}): Promise<StationSummary[]> {
    const query = this.db('stations as s')
      .leftJoin('response_zones as rz', 's.response_zone_id', 'rz.id')
      .select([
        's.station_code as stationCode',
        's.name as name',
        's.battalion as battalion',
        's.phone as phone',
        's.address_line_1 as addressLine1',
        's.address_line_2 as addressLine2',
        's.city as city',
        's.region as region',
        's.postal_code as postalCode',
        's.is_active as isActive',
        's.commissioned_on as commissionedOn',
        's.decommissioned_on as decommissionedOn',
        's.coverage_radius_meters as coverageRadiusMeters',
        'rz.zone_code as zoneCode',
        'rz.name as zoneName',
      ])
      .select(
        this.db.raw('ST_AsGeoJSON(s.location)::json as "locationGeoJson"'),
        this.db.raw('ST_AsGeoJSON(rz.boundary)::json as "responseZoneGeoJson"')
      )
      .orderBy('s.station_code', 'asc');

    if (typeof filters.isActive === 'boolean') {
      query.where('s.is_active', filters.isActive);
    }

    const rows = (await query) as StationRow[];

    return rows.map((row) => {
      const locationFeature = geometryToFeature(
        parseGeometry(row.locationGeoJson)
      ) as GeoJsonPoint | null;
      if (!locationFeature) {
        throw new Error('Station location geometry is missing');
      }
      const responseZone = row.zoneCode
        ? (() => {
            const boundary = geometryToFeature(
              parseGeometry(row.responseZoneGeoJson)
            ) as GeoJsonMultiPolygon | null;
            if (!boundary) {
              throw new Error('Response zone boundary geometry is missing');
            }
            return {
              zoneCode: row.zoneCode,
              name: row.zoneName ?? row.zoneCode,
              boundary,
            };
          })()
        : null;

      return {
        stationCode: row.stationCode,
        name: row.name,
        battalion: row.battalion ?? null,
        phone: row.phone ?? null,
        address: {
          line1: row.addressLine1 ?? null,
          line2: row.addressLine2 ?? null,
          city: row.city ?? null,
          region: row.region ?? null,
          postalCode: row.postalCode ?? null,
        },
        isActive: row.isActive,
        commissionedOn: row.commissionedOn ?? null,
        decommissionedOn: row.decommissionedOn ?? null,
        coverageRadiusMeters:
          row.coverageRadiusMeters == null ? null : Number(row.coverageRadiusMeters),
        location: locationFeature,
        responseZone,
      } satisfies StationSummary;
    });
  }
}

export const stationRepository = new StationRepository();
