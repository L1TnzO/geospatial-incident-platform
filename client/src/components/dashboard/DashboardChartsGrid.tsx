import type { DashboardQueryState } from '@/hooks/useDashboardQuery';
import DashboardTypeDistributionChart from '@/components/dashboard/DashboardTypeDistributionChart';
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

const renderDistributionList = (
  items: { id: string; label: string; count: number; percentage: number }[],
  emptyMessage: string
) => {
  if (items.length === 0) {
    return <p className="dashboard-empty">{emptyMessage}</p>;
  }

  return (
    <ul className="dashboard-distribution" role="list">
      {items.map((item) => (
        <li key={item.id}>
          <span>{item.label}</span>
          <strong>
            {item.count.toLocaleString()}
            <span className="dashboard-distribution__percentage">
              {' '}
              ({formatPercentage(item.percentage)})
            </span>
          </strong>
        </li>
      ))}
    </ul>
  );
};

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
  const renderSeveritySection = () => {
    if (severityDistribution.status === 'loading' || severityDistribution.status === 'idle') {
      return <p className="dashboard-loading">Loading severity distribution…</p>;
    }

    if (severityDistribution.status === 'error') {
      return (
        <div className="dashboard-error">
          {severityDistribution.error ?? 'Unable to load severity distribution.'}
        </div>
      );
    }

    return renderDistributionList(
      (severityDistribution.data?.buckets ?? []).map((bucket) => ({
        id: bucket.severity.code,
        label: bucket.severity.name,
        count: bucket.count,
        percentage: bucket.percentage,
      })),
      'No severity data yet. Adjust timeframe filters if needed.'
    );
  };

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
      <section className="dashboard-chart-card" aria-label="Severity distribution" role="listitem">
        <h3>Severity Mix</h3>
        {renderSeveritySection()}
      </section>
      <section className="dashboard-chart-card" aria-label="Daily trend" role="listitem">
        <h3>Daily Trend</h3>
        {renderTrendSection()}
      </section>
    </div>
  );
};

export default DashboardChartsGrid;
