import type { InfrastructureListResponse, InfrastructureSummary } from '../types/api/infrastructure';
import type { ObsoleteInfrastructure } from '../types';
import { apiClient } from './api-client';

export const listInfrastructure = async (): Promise<InfrastructureListResponse> =>
    apiClient.infrastructure.list();

export const mapInfrastructureToUi = (infra: InfrastructureSummary): ObsoleteInfrastructure | null => {
    const coordinates = infra.location.geometry?.coordinates;
    if (!coordinates || coordinates.length < 2) {
        return null;
    }

    const [lng, lat] = coordinates;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return null;
    }

    return {
        id: infra.infraCode,
        description: infra.description ?? '',
        status: infra.status,
        location: {
            lat,
            lng,
        },
        incidentNumber: infra.incidentNumber ?? undefined,
    };
};
