import { createContext, useContext, ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import type { Incident } from '../types';
import type { WorkerResponse } from '../workers/incident-worker';
import { useShallow } from 'zustand/react/shallow';
import { useIncidentFiltersStore } from '../store/incident-filters-store';
import { useIncidentsData, IncidentsDataResult } from '../hooks/useIncidentsData';

const IncidentsContext = createContext<IncidentsDataResult | undefined>(undefined);

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

    const [filteredIncidents, setFilteredIncidents] = useState<Incident[]>([]);
    const [isFiltering, setIsFiltering] = useState(false);
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
                setIsFiltering(false);
            }
        };

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    // Send data to worker when it changes
    useEffect(() => {
        if (workerRef.current && incidentsData.incidents.length > 0) {
            setIsFiltering(true);
            workerRef.current.postMessage({
                type: 'SET_DATA',
                payload: {
                    incidents: incidentsData.incidents,
                    filters: {
                        typeCodes: filters.typeCodes,
                        severityCodes: filters.severityCodes,
                        statusCodes: filters.statusCodes,
                        incidentNumber: filters.incidentNumber,
                    },
                },
            });
        } else if (incidentsData.incidents.length === 0) {
            setFilteredIncidents([]);
        }
    }, [incidentsData.incidents]);

    // Send filters to worker when they change
    useEffect(() => {
        if (workerRef.current && incidentsData.incidents.length > 0) {
            // Avoid double-triggering if data just updated (handled by SET_DATA)
            // But SET_DATA dependency array ensures it runs on data change.
            // This effect runs on filter change.
            // We might have a race condition or double update if both change, but React batches updates.
            // A simple optimization is to check if filters actually changed, but useShallow handles that.

            setIsFiltering(true);
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
        // If filtering, we might want to show a loading state or stale data
        // For now, we just show stale data until update comes
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
