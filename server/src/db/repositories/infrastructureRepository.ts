import type { Knex } from 'knex';
import { getDb } from '../client';
import { geometryToFeature, parseGeometry } from '../utils';
import { type GeoJsonPoint, type ObsoleteInfrastructure } from '../types';

interface ObsoleteInfrastructureRow {
    infra_code: string;
    description: string | null;
    status: string;
    locationGeoJson: unknown;
    incident_number: string | null;
    created_at: string;
    updated_at: string;
}

export class InfrastructureRepository {
    constructor(private readonly db: Knex = getDb()) { }

    public async listInfrastructure(): Promise<ObsoleteInfrastructure[]> {
        const query = this.db('obsolete_infrastructure as oi')
            .leftJoin('incidents as i', 'oi.incident_id', 'i.id')
            .select([
                'oi.infra_code',
                'oi.description',
                'oi.status',
                'oi.created_at',
                'oi.updated_at',
                'i.incident_number',
            ])
            .select(
                this.db.raw('ST_AsGeoJSON(oi.location)::json as "locationGeoJson"')
            )
            .orderBy('oi.infra_code', 'asc');

        const rows = (await query) as ObsoleteInfrastructureRow[];

        return rows.map((row) => {
            const locationFeature = geometryToFeature(
                parseGeometry(row.locationGeoJson)
            ) as GeoJsonPoint | null;

            if (!locationFeature) {
                throw new Error('Infrastructure location geometry is missing');
            }

            return {
                infraCode: row.infra_code,
                description: row.description,
                status: row.status,
                location: locationFeature,
                incidentNumber: row.incident_number,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            } satisfies ObsoleteInfrastructure;
        });
    }
}

export const infrastructureRepository = new InfrastructureRepository();
