import { useDashboardQuery } from './useDashboardQuery';
import { fetchIncidentsByType } from '@/services/dashboardService';
import type { DashboardTypeDistribution } from '@/types/dashboard';

export const useDashboardTypeDistribution = () =>
  useDashboardQuery<DashboardTypeDistribution>(fetchIncidentsByType, {
    errorMessage: 'Failed to load dashboard incident type distribution',
  });
