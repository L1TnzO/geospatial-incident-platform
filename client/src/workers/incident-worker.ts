import type { Incident } from '../types';

// Define message types
export type WorkerMessage =
    | { type: 'SET_DATA'; payload: { incidents: Incident[]; filters: FilterCriteria } }
    | { type: 'FILTER_DATA'; payload: { filters: FilterCriteria } };

export type WorkerResponse =
    | { type: 'DATA_UPDATED'; payload: { incidents: Incident[]; totalCount: number } }
    | { type: 'FILTER_COMPLETE'; payload: { incidents: Incident[]; totalCount: number } }
    | { type: 'ERROR'; payload: { message: string } };

export interface FilterCriteria {
    typeCodes?: string[];
    severityCodes?: string[];
    statusCodes?: string[];
    incidentNumber?: string;
}

let cachedIncidents: Incident[] = [];

const filterIncidents = (incidents: Incident[], filters: FilterCriteria): Incident[] => {
    let result = incidents;

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
                const filtered = filterIncidents(cachedIncidents, filters);

                self.postMessage({
                    type: 'DATA_UPDATED',
                    payload: {
                        incidents: filtered,
                        totalCount: filtered.length,
                    },
                });
                break;
            }

            case 'FILTER_DATA': {
                const { filters } = payload;
                const filtered = filterIncidents(cachedIncidents, filters);

                self.postMessage({
                    type: 'FILTER_COMPLETE',
                    payload: {
                        incidents: filtered,
                        totalCount: filtered.length,
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
