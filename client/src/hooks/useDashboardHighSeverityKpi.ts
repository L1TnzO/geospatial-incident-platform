import { useDashboardLast24HoursKpi, type UseDashboardLast24HoursKpiResult, type DashboardLast24HoursKpiOptions } from './useDashboardLast24HoursKpi';
import type { DashboardFilterParams } from '../types/api/dashboard';

export const useDashboardHighSeverityKpi = (
    filters: DashboardFilterParams = {},
    options?: DashboardLast24HoursKpiOptions,
): UseDashboardLast24HoursKpiResult => {
    // Override severity codes to only include high severity
    const highSeverityFilters: DashboardFilterParams = {
        ...filters,
        severityCodes: ['HIGH', 'CRITICAL', 'SEVERE'],
    };

    return useDashboardLast24HoursKpi(highSeverityFilters, options);
};
