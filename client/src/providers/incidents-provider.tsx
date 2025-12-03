import { createContext, useContext, ReactNode } from 'react';
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
        typeCodes: filters.typeCodes,
        severityCodes: filters.severityCodes,
        statusCodes: filters.statusCodes,
        startDate: filters.startDate,
        endDate: filters.endDate,
        incidentNumber: filters.incidentNumber,
        isActive: filters.isActive ?? true,
        renderLimit: filters.renderLimit,
    };

    const incidentsData = useIncidentsData({
        ...fetchParams,
    });

    return (
        <IncidentsContext.Provider value={incidentsData}>
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
