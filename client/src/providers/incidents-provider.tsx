import { createContext, useContext, ReactNode, useMemo } from 'react';
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

    // Client-side filtering
    const filteredIncidents = useMemo(() => {
        let result = incidentsData.incidents;

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
            // Assuming 'id' or another field holds the incident number if 'incidentNumber' doesn't exist
            // Checking 'id' as a fallback or primary field
            result = result.filter((i) => i.id.toUpperCase().includes(search));
        }

        return result;
    }, [
        incidentsData.incidents,
        filters.typeCodes,
        filters.severityCodes,
        filters.statusCodes,
        filters.incidentNumber
    ]);

    const value = useMemo(() => ({
        ...incidentsData,
        incidents: filteredIncidents,
        totalCount: filteredIncidents.length, // Update counts to reflect filtered view
        renderedCount: filteredIncidents.length,
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
