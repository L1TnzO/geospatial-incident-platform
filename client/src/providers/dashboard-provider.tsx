import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useIncidentFiltersStore } from '../store/incident-filters-store';
import type { DashboardFilterParams } from '../types/api/dashboard';
import { subMonths, subYears } from 'date-fns';

type TimeRange = '24h' | '7d' | '30d' | '3m' | '1y';

interface DashboardContextType {
    timeRange: TimeRange;
    setTimeRange: (range: TimeRange) => void;
    isActive: boolean;
    setIsActive: (active: boolean) => void;
    filters: DashboardFilterParams;
    timeRangeLabel: string;
    comparisonLabel: string;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
    const [timeRange, setTimeRange] = useState<TimeRange>(() => {
        const stored = localStorage.getItem('dashboard_timeRange');
        return (stored as TimeRange) || '24h';
    });

    // Local state for dashboard view, decoupled from global map filters
    // Default to showing ALL incidents (isActive = false) so historical data is visible by default
    const [isActive, setIsActive] = useState(() => {
        const stored = localStorage.getItem('dashboard_isActive');
        return stored !== null ? stored === 'true' : false;
    });

    useEffect(() => {
        localStorage.setItem('dashboard_timeRange', timeRange);
    }, [timeRange]);

    useEffect(() => {
        localStorage.setItem('dashboard_isActive', String(isActive));
    }, [isActive]);

    // Derived State: Date Range
    const { start, end } = useMemo(() => {
        const now = new Date();
        // Round to nearest 5 minutes to stabilize query keys and leverage cache
        const coeff = 1000 * 60 * 5;
        const roundedNow = new Date(Math.ceil(now.getTime() / coeff) * coeff);

        const endDate = roundedNow;
        const startDate = new Date(roundedNow);

        switch (timeRange) {
            case '24h':
                startDate.setHours(endDate.getHours() - 24);
                break;
            case '7d':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(endDate.getDate() - 30);
                break;
            case '3m':
                return {
                    start: subMonths(endDate, 3).toISOString(),
                    end: endDate.toISOString(),
                };
            case '1y':
                return {
                    start: subYears(endDate, 1).toISOString(),
                    end: endDate.toISOString(),
                };
            default:
                startDate.setHours(endDate.getHours() - 24);
        }

        return {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
        };
    }, [timeRange]);

    // Derived State: Labels
    const timeRangeLabel = useMemo(() => {
        switch (timeRange) {
            case '24h':
                return 'Last 24 Hours';
            case '7d':
                return 'Last 7 Days';
            case '30d':
                return 'Last 30 Days';
            case '3m':
                return 'Last 3 Months';
            case '1y':
                return 'Last 12 Months';
            default:
                return 'Last 24 Hours';
        }
    }, [timeRange]);

    const comparisonLabel = useMemo(() => {
        switch (timeRange) {
            case '24h':
                return 'vs previous 24h';
            case '7d':
                return 'vs previous 7 days';
            case '30d':
                return 'vs previous 30 days';
            case '3m':
                return 'vs previous 3 months';
            case '1y':
                return 'vs previous year';
            default:
                return 'vs previous 24h';
        }
    }, [timeRange]);

    // Derived State: Filters
    const filters = useMemo<DashboardFilterParams>(
        () => ({
            startDate: start,
            endDate: end,
            isActive: isActive ? true : undefined,
            // We can include other global filters here if needed (typeCodes, etc.)
            // For now, mirroring previous behavior which included them
            typeCodes: useIncidentFiltersStore.getState().typeCodes,
            severityCodes: useIncidentFiltersStore.getState().severityCodes,
            statusCodes: useIncidentFiltersStore.getState().statusCodes,
        }),
        [start, end, isActive]
    );

    const value = {
        timeRange,
        setTimeRange,
        isActive,
        setIsActive,
        filters,
        timeRangeLabel,
        comparisonLabel,
    };

    return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
}
