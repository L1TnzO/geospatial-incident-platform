import { createContext, useContext, ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import type { LiteIncident } from '../types';
import type { WorkerResponse } from '../workers/incident-worker';
import { useShallow } from 'zustand/react/shallow';
import { useIncidentFiltersStore } from '../store/incident-filters-store';
import { useIncidentsData, IncidentsDataResult } from '../hooks/useIncidentsData';

interface IncidentsContextValue extends IncidentsDataResult {
    incidents: LiteIncident[];
    totalCount: number;
    renderedCount: number;
    worker: Worker | null;
}

const IncidentsContext = createContext<IncidentsContextValue | undefined>(undefined);

export function IncidentsProvider({ children }: { children: ReactNode }) {
    const filters = useIncidentFiltersStore(
        useShallow((state) => ({
            page: state.page,
            pageSize: state.pageSize,
            sortBy: state.sortBy,
            sortDirection: state.sortDirection,
            typeCodes: state.typeCodes,
            severityCodes: state.severityCodes,
            statusCodes: state.statusCodes,
            startDate: state.startDate,
            endDate: state.endDate,
            incidentNumber: state.incidentNumber,
            isActive: state.isActive,
            renderLimit: state.renderLimit,
        })),
    );

    const fetchParams = {
        page: filters.page,
        pageSize: filters.pageSize,
        sortBy: filters.sortBy,
        sortDirection: filters.sortDirection,
        // Only pass filters that require server-side fetching
        startDate: filters.startDate,
        endDate: filters.endDate,
        isActive: filters.isActive ?? true,
        renderLimit: filters.renderLimit,
        // We intentionally OMIT typeCodes, severityCodes, statusCodes, incidentNumber
        // to fetch the broader dataset and filter client-side
    };

    const incidentsData = useIncidentsData({
        ...fetchParams,
    });

    const [filteredIncidents, setFilteredIncidents] = useState<LiteIncident[]>([]);
    const workerRef = useRef<Worker | null>(null);

    // Initialize worker
    useEffect(() => {
        workerRef.current = new Worker(new URL('../workers/incident-worker.ts', import.meta.url), {
            type: 'module',
        });

        workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
            const { type, payload } = event.data;
            if (type === 'DATA_UPDATED' || type === 'FILTER_COMPLETE') {
                setFilteredIncidents(payload.incidents);
            }
        };

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const lastIncidentsRef = useRef<LiteIncident[]>([]);

    // Send data to worker when it changes
    useEffect(() => {
        const currentIncidents = incidentsData.incidents;

        // Simple check to avoid processing if reference is same (handled by dependency array)
        // But also check if length and content (shallowly) are same to avoid loop if reference changes but content is same
        const isSame =
            currentIncidents === lastIncidentsRef.current ||
            (currentIncidents.length === lastIncidentsRef.current.length &&
                currentIncidents[0]?.id === lastIncidentsRef.current[0]?.id);

        if (isSame && currentIncidents.length > 0) return;

        lastIncidentsRef.current = currentIncidents;

        if (workerRef.current && currentIncidents.length > 0) {
            workerRef.current.postMessage({
                type: 'SET_DATA',
                payload: {
                    incidents: currentIncidents,
                    filters: {
                        typeCodes: filters.typeCodes,
                        severityCodes: filters.severityCodes,
                        statusCodes: filters.statusCodes,
                        incidentNumber: filters.incidentNumber,
                    },
                },
            });
        } else if (currentIncidents.length === 0) {
            setFilteredIncidents([]);
        }
    }, [incidentsData.incidents]);

    // Send filters to worker when they change
    useEffect(() => {
        if (workerRef.current && incidentsData.incidents.length > 0) {
            workerRef.current.postMessage({
                type: 'FILTER_DATA',
                payload: {
                    filters: {
                        typeCodes: filters.typeCodes,
                        severityCodes: filters.severityCodes,
                        statusCodes: filters.statusCodes,
                        incidentNumber: filters.incidentNumber,
                    },
                },
            });
        }
    }, [
        filters.typeCodes,
        filters.severityCodes,
        filters.statusCodes,
        filters.incidentNumber,
    ]);

    const value = useMemo(() => ({
        ...incidentsData,
        incidents: filteredIncidents,
        totalCount: filteredIncidents.length,
        renderedCount: filteredIncidents.length,
        worker: workerRef.current,
    }), [incidentsData, filteredIncidents]);

    return (
        <IncidentsContext.Provider value={value}>
            {children}
        </IncidentsContext.Provider>
    );
}

export function useIncidentsContext() {
    const context = useContext(IncidentsContext);
    if (context === undefined) {
        throw new Error('useIncidentsContext must be used within an IncidentsProvider');
    }
    return context;
}
