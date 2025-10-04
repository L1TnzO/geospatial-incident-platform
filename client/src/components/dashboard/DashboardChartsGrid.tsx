import type { DashboardAggregationsState } from '@/hooks/useDashboardAggregations';
import type { DashboardDistributionDatum, DashboardTrendPoint } from '@/types/dashboard';

interface DashboardChartsGridProps {
  summary: DashboardAggregationsState;
}

const renderDistribution = (data: DashboardDistributionDatum[], emptyMessage: string) => {
  if (data.length === 0) {
    return <p className="dashboard-empty">{emptyMessage}</p>;
  }

  return (
    <ul className="dashboard-distribution" role="list">
      {data.map((datum) => (
        <li key={datum.id}>
          <span>{datum.label}</span>
          <strong>{datum.value.toLocaleString()}</strong>
        </li>
      ))}
    </ul>
  );
};

const renderTrend = (points: DashboardTrendPoint[]) => {
  if (points.length === 0) {
    return <p className="dashboard-empty">Trend data will appear once incidents stream in.</p>;
  }

  return (
    <ul className="dashboard-trend" role="list">
      {points.slice(0, 7).map((point) => (
        <li key={point.date}>
          <span>{new Date(point.date).toLocaleDateString()}</span>
          <strong>{point.count.toLocaleString()}</strong>
        </li>
      ))}
    </ul>
  );
};

const DashboardChartsGrid = ({ summary }: DashboardChartsGridProps) => {
  if (summary.status === 'loading' || summary.status === 'idle') {
    return (
      <div className="dashboard-charts-grid" role="status" aria-live="polite">
        <p className="dashboard-loading">Loading distribution data…</p>
        <div className="dashboard-placeholder" aria-hidden="true" />
        <div className="dashboard-placeholder" aria-hidden="true" />
        <div className="dashboard-placeholder" aria-hidden="true" />
      </div>
    );
  }

  if (summary.status === 'error') {
    return (
      <div className="dashboard-charts-grid" role="alert">
        <div className="dashboard-error">
          {summary.error ?? 'Unable to load distribution charts.'}
        </div>
      </div>
    );
  }

  const data = summary.data;

  if (!data) {
    return (
      <div className="dashboard-charts-grid" role="status">
        <div className="dashboard-empty">
          Distribution widgets will load once data is available.
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-charts-grid" role="list">
      <section className="dashboard-chart-card" aria-label="Type distribution" role="listitem">
        <h3>Incident Types</h3>
        {renderDistribution(data.typeDistribution, 'No type data yet. Configure filters to begin.')}
      </section>
      <section className="dashboard-chart-card" aria-label="Severity distribution" role="listitem">
        <h3>Severity Mix</h3>
        {renderDistribution(
          data.severityDistribution,
          'No severity data yet. Adjust timeframe filters if needed.'
        )}
      </section>
      <section className="dashboard-chart-card" aria-label="Daily trend" role="listitem">
        <h3>Daily Trend</h3>
        {renderTrend(data.dailyTrend)}
      </section>
    </div>
  );
};

export default DashboardChartsGrid;
