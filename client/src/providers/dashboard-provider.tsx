import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { DashboardFilterParams } from '../types/api/dashboard';
import { subMonths, subYears } from 'date-fns';

export type TimeRange = '24h' | '7d' | '30d' | '3m' | '1y' | 'custom';

interface DashboardContextType {
    timeRange: TimeRange;
    setTimeRange: (range: TimeRange) => void;
    isActive: boolean;
    setIsActive: (active: boolean) => void;
    isYoY: boolean;
    setIsYoY: (yoy: boolean) => void;
    filters: DashboardFilterParams;
    timeRangeLabel: string;
    comparisonLabel: string;
    setCustomDateRange: (start: string, end: string) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
    const [timeRange, setTimeRange] = useState<TimeRange>(() => {
        const stored = localStorage.getItem('dashboard_timeRange');
        // If stored is 'custom', we revert to '24h' on reload as we don't persist custom dates yet
        // or check if it is a valid TimeRange excluding custom if we want simplicity
        if (stored === 'custom') return '24h';
        return (stored as TimeRange) || '24h';
    });

    const [customDateRange, setCustomRangeState] = useState<{ start: string; end: string } | null>(null);

    const [isYoY, setIsYoY] = useState(() => {
        const stored = localStorage.getItem('dashboard_isYoY');
        return stored === 'true';
    });

    // Local state for dashboard view, decoupled from global map filters
    // Default to showing ALL incidents (isActive = false) so historical data is visible by default
    const [isActive, setIsActive] = useState(() => {
        const stored = localStorage.getItem('dashboard_isActive');
        return stored !== null ? stored === 'true' : false;
    });

    useEffect(() => {
        if (timeRange !== 'custom') {
            localStorage.setItem('dashboard_timeRange', timeRange);
        }
    }, [timeRange]);

    useEffect(() => {
        localStorage.setItem('dashboard_isYoY', String(isYoY));
    }, [isYoY]);

    useEffect(() => {
        localStorage.setItem('dashboard_isActive', String(isActive));
    }, [isActive]);

    const setCustomDateRange = (start: string, end: string) => {
        setCustomRangeState({ start, end });
        setTimeRange('custom');
    };

    // Derived State: Date Range
    const { start, end } = useMemo(() => {
        if (timeRange === 'custom' && customDateRange) {
            return customDateRange;
        }

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
                // Fallback to 24h if custom is selected but no date range provided (shouldn't happen with correct usage)
                if (timeRange === 'custom') {
                    startDate.setHours(endDate.getHours() - 24);
                } else {
                    startDate.setHours(endDate.getHours() - 24);
                }
        }

        return {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
        };
    }, [timeRange, customDateRange]);

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
            case 'custom':
                return 'Custom Range';
            default:
                return 'Last 24 Hours';
        }
    }, [timeRange]);

    const comparisonLabel = useMemo(() => {
        if (isYoY) {
            return 'vs same period last year';
        }
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
            case 'custom':
                return 'vs previous period';
            default:
                return 'vs previous 24h';
        }
    }, [timeRange, isYoY]);

    // Derived State: Filters
    const filters = useMemo<DashboardFilterParams>(
        () => ({
            startDate: start,
            endDate: end,
            isActive: isActive ? true : undefined,
            compare: isYoY ? 'year' : 'previous',
            // Decoupled from global filters as requested
            typeCodes: [],
            severityCodes: [],
            statusCodes: [],
        }),
        [start, end, isActive, isYoY]
    );

    const value = {
        timeRange,
        setTimeRange,
        isActive,
        setIsActive,
        isYoY,
        setIsYoY,
        filters,
        timeRangeLabel,
        comparisonLabel,
        setCustomDateRange
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
