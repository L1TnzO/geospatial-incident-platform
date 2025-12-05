import type { LiteIncident } from '../types';
import Supercluster from 'supercluster';
import type { ClusterFeature, PointFeature } from 'supercluster';
import type { Feature as GeoJsonFeature, Point as GeoJsonPoint } from 'geojson';

// Define message types
export type WorkerMessage =
    | { type: 'SET_DATA'; payload: { incidents: LiteIncident[]; filters: FilterCriteria } }
    | { type: 'FILTER_DATA'; payload: { filters: FilterCriteria } }
    | { type: 'GET_CLUSTERS'; payload: { bbox: [number, number, number, number]; zoom: number } };

export type WorkerResponse =
    | { type: 'DATA_UPDATED'; payload: { incidents: LiteIncident[]; totalCount: number } }
    | { type: 'FILTER_COMPLETE'; payload: { incidents: LiteIncident[]; totalCount: number } }
    | { type: 'CLUSTERS_CALCULATED'; payload: { clusters: ClusterEntry[] } }
    | { type: 'ERROR'; payload: { message: string } };

export interface FilterCriteria {
    typeCodes?: string[];
    severityCodes?: string[];
    statusCodes?: string[];
    incidentNumber?: string;
    startDate?: string;
    endDate?: string;
}

type IncidentProperties = {
    type: 'incident';
    incident: LiteIncident;
};

type ClusterProperties = {
    type: 'cluster';
};

type IncidentFeature = GeoJsonFeature<GeoJsonPoint, IncidentProperties>;

export type ClusterEntry = ClusterFeature<ClusterProperties> | PointFeature<IncidentProperties>;

let cachedIncidents: LiteIncident[] = [];
let filteredIncidents: LiteIncident[] = [];
let clusterIndex: Supercluster<IncidentProperties, ClusterProperties> | null = null;

const incidentToFeature = (incident: LiteIncident): IncidentFeature | null => {
    const { lat, lng } = incident.location;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return null;
    }

    return {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [lng, lat],
        },
        properties: {
            type: 'incident',
            incident,
        },
    };
};

const updateClusterIndex = (incidents: LiteIncident[]) => {
    const features: IncidentFeature[] = [];
    for (const incident of incidents) {
        const feature = incidentToFeature(incident);
        if (feature) {
            features.push(feature);
        }
    }

    clusterIndex = new Supercluster<IncidentProperties, ClusterProperties>({
        radius: 60,
        maxZoom: 18,
    });
    clusterIndex.load(features);
};

const filterIncidents = (incidents: LiteIncident[], filters: FilterCriteria): LiteIncident[] => {
    let result = incidents;

    if (filters.startDate || filters.endDate) {
        const start = filters.startDate ? new Date(filters.startDate).getTime() : 0;
        const end = filters.endDate ? new Date(filters.endDate).getTime() : Infinity;

        result = result.filter((i) => {
            const time = new Date(i.date).getTime();
            return time >= start && time <= end;
        });
    }

    if (filters.typeCodes && filters.typeCodes.length > 0) {
        const typeSet = new Set(filters.typeCodes);
        result = result.filter((i) => i.typeCode && typeSet.has(i.typeCode));
    }

    if (filters.severityCodes && filters.severityCodes.length > 0) {
        const severitySet = new Set(filters.severityCodes);
        result = result.filter((i) => i.severityCode && severitySet.has(i.severityCode));
    }

    if (filters.statusCodes && filters.statusCodes.length > 0) {
        const statusSet = new Set(filters.statusCodes);
        result = result.filter((i) => i.statusCode && statusSet.has(i.statusCode));
    }

    if (filters.incidentNumber) {
        const search = filters.incidentNumber.toUpperCase();
        result = result.filter((i) => i.id.toUpperCase().includes(search));
    }

    return result;
};

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
    try {
        const { type, payload } = event.data;

        switch (type) {
            case 'SET_DATA': {
                const { incidents, filters } = payload;

                // Update cache
                cachedIncidents = incidents;

                // Apply initial filters
                filteredIncidents = filterIncidents(cachedIncidents, filters);

                // Update cluster index
                updateClusterIndex(filteredIncidents);

                self.postMessage({
                    type: 'DATA_UPDATED',
                    payload: {
                        incidents: filteredIncidents,
                        totalCount: filteredIncidents.length,
                    },
                });
                break;
            }

            case 'FILTER_DATA': {
                const { filters } = payload;
                filteredIncidents = filterIncidents(cachedIncidents, filters);

                // Update cluster index
                updateClusterIndex(filteredIncidents);

                self.postMessage({
                    type: 'FILTER_COMPLETE',
                    payload: {
                        incidents: filteredIncidents,
                        totalCount: filteredIncidents.length,
                    },
                });
                break;
            }

            case 'GET_CLUSTERS': {
                const { bbox, zoom } = payload;
                if (!clusterIndex) {
                    self.postMessage({
                        type: 'CLUSTERS_CALCULATED',
                        payload: {
                            clusters: [],
                        },
                    });
                    break;
                }

                const clusters = clusterIndex.getClusters(bbox, zoom);

                self.postMessage({
                    type: 'CLUSTERS_CALCULATED',
                    payload: {
                        clusters: clusters as ClusterEntry[],
                    },
                });
                break;
            }
        }
    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            payload: {
                message: error instanceof Error ? error.message : 'Unknown worker error',
            },
        });
    }
};
