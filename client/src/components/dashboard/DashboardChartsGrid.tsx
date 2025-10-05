import type { DashboardQueryState } from '@/hooks/useDashboardQuery';
import DashboardTypeDistributionChart from '@/components/dashboard/DashboardTypeDistributionChart';
import DashboardSeverityDistributionChart from '@/components/dashboard/DashboardSeverityDistributionChart';
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

const formatPercentage = (value: number): string => `${value.toFixed(1)}%`;

const renderTrendList = (trend: DashboardDailyTrend | null) => {
  if (!trend || trend.points.length === 0) {
    return <p className="dashboard-empty">Trend data will appear once incidents stream in.</p>;
  }

  const recentPoints = trend.points.slice(-7);

  return (
    <>
      <ul className="dashboard-trend" role="list">
        {recentPoints.map((point) => (
          <li key={point.date}>
            <span>{new Date(point.date).toLocaleDateString()}</span>
            <strong>{point.count.toLocaleString()}</strong>
          </li>
        ))}
      </ul>
      <p className="dashboard-trend__summary">
        Last 7 days: {trend.trend.currentTotal.toLocaleString()} incidents · Change:{' '}
        {trend.trend.change >= 0 ? '+' : ''}
        {trend.trend.change.toLocaleString()} (
        {trend.trend.percentageChange === null
          ? 'n/a'
          : formatPercentage(trend.trend.percentageChange)}
        )
      </p>
    </>
  );
};

const DashboardChartsGrid = ({
  typeDistribution,
  severityDistribution,
  dailyTrend,
}: DashboardChartsGridProps) => {
  const renderTrendSection = () => {
    if (dailyTrend.status === 'loading' || dailyTrend.status === 'idle') {
      return <p className="dashboard-loading">Loading daily trend…</p>;
    }

    if (dailyTrend.status === 'error') {
      return (
        <div className="dashboard-error">
          {dailyTrend.error ?? 'Unable to load daily trend data.'}
        </div>
      );
    }

    return renderTrendList(dailyTrend.data);
  };

  return (
    <div className="dashboard-charts-grid" role="list">
      <DashboardTypeDistributionChart distribution={typeDistribution} />
      <DashboardSeverityDistributionChart distribution={severityDistribution} />
      <section className="dashboard-chart-card" aria-label="Daily trend" role="listitem">
        <h3>Daily Trend</h3>
        {renderTrendSection()}
      </section>
    </div>
  );
};

export default DashboardChartsGrid;
