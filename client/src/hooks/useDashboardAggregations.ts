import { useDashboardDailyTrend } from './useDashboardDailyTrend';
import { useDashboardLast24HoursKpi } from './useDashboardLast24HoursKpi';
import { useDashboardSeverityDistribution } from './useDashboardSeverityDistribution';
import { useDashboardTypeDistribution } from './useDashboardTypeDistribution';

export const useDashboardAggregations = () => {
  const kpi = useDashboardLast24HoursKpi();
  const typeDistribution = useDashboardTypeDistribution();
  const severityDistribution = useDashboardSeverityDistribution();
  const dailyTrend = useDashboardDailyTrend();

  return {
    kpi,
    typeDistribution,
    severityDistribution,
    dailyTrend,
  };
};
