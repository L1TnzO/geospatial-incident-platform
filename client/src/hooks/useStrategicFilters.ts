import { useDashboardFilters } from './useDashboardFilters';
import type { DashboardFilterParams } from '@/types/dashboard';

export const useStrategicFilters = (): DashboardFilterParams => {
  return useDashboardFilters();
};
