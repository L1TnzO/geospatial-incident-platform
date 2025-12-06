import type { Feature, Point } from 'geojson';

export type InfraPoint = Feature<Point>;

export interface InfrastructureSummary {
    infraCode: string;
    description: string | null;
    status: string;
    location: InfraPoint;
    incidentNumber?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface InfrastructureListResponse {
    data: InfrastructureSummary[];
}
