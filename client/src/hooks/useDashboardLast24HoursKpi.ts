import { useDashboardQuery } from './useDashboardQuery';
import { fetchLast24HoursKpi } from '@/services/dashboardService';
import type { DashboardLast24HoursKpi } from '@/types/dashboard';

export const useDashboardLast24HoursKpi = () =>
  useDashboardQuery<DashboardLast24HoursKpi>(fetchLast24HoursKpi, {
    errorMessage: 'Failed to load dashboard last-24-hours KPI',
  });
