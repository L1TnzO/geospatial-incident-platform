import DashboardChartsGrid from '@/components/dashboard/DashboardChartsGrid';
import DashboardKPIRow from '@/components/dashboard/DashboardKPIRow';
import DashboardRecentIncidents from '@/components/dashboard/DashboardRecentIncidents';
import { useDashboardAggregations } from '@/hooks/useDashboardAggregations';
import { useDashboardRecentIncidents } from '@/hooks/useDashboardRecentIncidents';

const DashboardLayout = () => {
  const aggregations = useDashboardAggregations();
  const recent = useDashboardRecentIncidents();
  const generatedAt = aggregations.data?.generatedAt;

  return (
    <div className="dashboard-shell" role="region" aria-label="Dashboard analytics">
      <header className="dashboard-shell__header">
        <h1>Dashboard Analytics</h1>
        <p>
          Tactical metrics and trends for the current incident filters. Widgets will expand in
          upcoming milestones.
        </p>
        {generatedAt && (
          <p className="dashboard-shell__timestamp">
            Last updated{' '}
            <time dateTime={generatedAt}>{new Date(generatedAt).toLocaleString()}</time>
          </p>
        )}
      </header>
      <section aria-labelledby="dashboard-kpis" className="dashboard-shell__section">
        <div className="dashboard-section__header">
          <h2 id="dashboard-kpis">Key Performance Indicators</h2>
          <p>Snapshot metrics derived from the active incident filters.</p>
        </div>
        <DashboardKPIRow summary={aggregations} />
      </section>
      <section aria-labelledby="dashboard-charts" className="dashboard-shell__section">
        <div className="dashboard-section__header">
          <h2 id="dashboard-charts">Incident Distribution</h2>
          <p>Type, severity, and daily trend placeholders update with backend aggregations.</p>
        </div>
        <DashboardChartsGrid summary={aggregations} />
      </section>
      <section aria-labelledby="dashboard-recent" className="dashboard-shell__section">
        <div className="dashboard-section__header">
          <h2 id="dashboard-recent">Recent Incidents</h2>
          <p>Latest incidents aligned with the active filter set.</p>
        </div>
        <DashboardRecentIncidents recent={recent} />
      </section>
    </div>
  );
};

export default DashboardLayout;
