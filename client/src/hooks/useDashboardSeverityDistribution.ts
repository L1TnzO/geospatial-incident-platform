import { useDashboardQuery } from './useDashboardQuery';
import { fetchSeverityDistribution } from '@/services/dashboardService';
import type { DashboardSeverityDistribution } from '@/types/dashboard';

export const useDashboardSeverityDistribution = () =>
  useDashboardQuery<DashboardSeverityDistribution>(fetchSeverityDistribution, {
    errorMessage: 'Failed to load dashboard severity distribution',
  });
