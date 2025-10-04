import DashboardChartsGrid from '@/components/dashboard/DashboardChartsGrid';
import DashboardKPIRow from '@/components/dashboard/DashboardKPIRow';
import DashboardRecentIncidents from '@/components/dashboard/DashboardRecentIncidents';
import { useDashboardDailyTrend } from '@/hooks/useDashboardDailyTrend';
import { useDashboardLast24HoursKpi } from '@/hooks/useDashboardLast24HoursKpi';
import { useDashboardRecentIncidents } from '@/hooks/useDashboardRecentIncidents';
import { useDashboardSeverityDistribution } from '@/hooks/useDashboardSeverityDistribution';
import { useDashboardTypeDistribution } from '@/hooks/useDashboardTypeDistribution';

const DashboardLayout = () => {
  const kpi = useDashboardLast24HoursKpi();
  const typeDistribution = useDashboardTypeDistribution();
  const severityDistribution = useDashboardSeverityDistribution();
  const dailyTrend = useDashboardDailyTrend();
  const recent = useDashboardRecentIncidents();

  const lastUpdated =
    kpi.lastUpdated ||
    typeDistribution.lastUpdated ||
    severityDistribution.lastUpdated ||
    dailyTrend.lastUpdated ||
    recent.lastUpdated;

  const handleRefresh = () => {
    kpi.refresh();
    typeDistribution.refresh();
    severityDistribution.refresh();
    dailyTrend.refresh();
    recent.refresh();
  };

  return (
    <div className="dashboard-shell" role="region" aria-label="Dashboard analytics">
      <header className="dashboard-shell__header">
        <h1>Dashboard Analytics</h1>
        <p>
          Tactical metrics and trends for the current incident filters. Widgets will expand in
          upcoming milestones.
        </p>
        <div className="dashboard-shell__header-actions">
          <button type="button" className="dashboard-refresh" onClick={handleRefresh}>
            Refresh data
          </button>
          {lastUpdated && (
            <p className="dashboard-shell__timestamp">
              Last updated{' '}
              <time dateTime={lastUpdated}>{new Date(lastUpdated).toLocaleString()}</time>
            </p>
          )}
        </div>
      </header>
      <section aria-labelledby="dashboard-kpis" className="dashboard-shell__section">
        <div className="dashboard-section__header">
          <h2 id="dashboard-kpis">Key Performance Indicators</h2>
          <p>Snapshot metrics derived from the active incident filters.</p>
        </div>
        <DashboardKPIRow kpi={kpi} />
      </section>
      <section aria-labelledby="dashboard-charts" className="dashboard-shell__section">
        <div className="dashboard-section__header">
          <h2 id="dashboard-charts">Incident Distribution</h2>
          <p>Type, severity, and daily trend placeholders update with backend aggregations.</p>
        </div>
        <DashboardChartsGrid
          typeDistribution={typeDistribution}
          severityDistribution={severityDistribution}
          dailyTrend={dailyTrend}
        />
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
