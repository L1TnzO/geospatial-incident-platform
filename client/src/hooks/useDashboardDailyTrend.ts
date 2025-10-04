import { useDashboardQuery } from './useDashboardQuery';
import { fetchDailyTrend } from '@/services/dashboardService';
import type { DashboardDailyTrend } from '@/types/dashboard';

export const useDashboardDailyTrend = () =>
  useDashboardQuery<DashboardDailyTrend>(fetchDailyTrend, {
    errorMessage: 'Failed to load dashboard daily trend',
  });
