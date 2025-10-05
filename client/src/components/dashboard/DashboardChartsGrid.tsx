import type { DashboardQueryState } from '@/hooks/useDashboardQuery';
import DashboardTypeDistributionChart from '@/components/dashboard/DashboardTypeDistributionChart';
import DashboardSeverityDistributionChart from '@/components/dashboard/DashboardSeverityDistributionChart';
import DashboardDailyTrendChart from '@/components/dashboard/DashboardDailyTrendChart';
import type {
  DashboardDailyTrend,
  DashboardSeverityDistribution,
  DashboardTypeDistribution,
} from '@/types/dashboard';

interface DashboardChartsGridProps {
  typeDistribution: DashboardQueryState<DashboardTypeDistribution>;
  severityDistribution: DashboardQueryState<DashboardSeverityDistribution>;
  dailyTrend: DashboardQueryState<DashboardDailyTrend>;
}

const DashboardChartsGrid = ({
  typeDistribution,
  severityDistribution,
  dailyTrend,
}: DashboardChartsGridProps) => {
  return (
    <div className="dashboard-charts-grid" role="list">
      <DashboardTypeDistributionChart distribution={typeDistribution} />
      <DashboardSeverityDistributionChart distribution={severityDistribution} />
      <DashboardDailyTrendChart trend={dailyTrend} />
    </div>
  );
};

export default DashboardChartsGrid;
