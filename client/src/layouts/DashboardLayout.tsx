import DashboardChartsGrid from '@/components/dashboard/DashboardChartsGrid';
import DashboardKPIRow from '@/components/dashboard/DashboardKPIRow';
import DashboardRecentIncidents from '@/components/dashboard/DashboardRecentIncidents';
import IncidentDetailModal from '@/components/IncidentDetailModal';
import { useDashboardDailyTrend } from '@/hooks/useDashboardDailyTrend';
import { useDashboardLast24HoursKpi } from '@/hooks/useDashboardLast24HoursKpi';
import { useDashboardRecentIncidents } from '@/hooks/useDashboardRecentIncidents';
import { useDashboardSeverityDistribution } from '@/hooks/useDashboardSeverityDistribution';
import { useDashboardTypeDistribution } from '@/hooks/useDashboardTypeDistribution';
import { useDashboardExport } from '@/hooks/useDashboardExport';

const DashboardLayout = () => {
  const kpi = useDashboardLast24HoursKpi();
  const typeDistribution = useDashboardTypeDistribution();
  const severityDistribution = useDashboardSeverityDistribution();
  const dailyTrend = useDashboardDailyTrend();
  const recent = useDashboardRecentIncidents();
  const {
    status: exportStatus,
    isExporting,
    error: exportError,
    filename: exportFilename,
    completedAt: exportCompletedAt,
    startExport,
    cancelExport,
    resetExport,
    downloadAgain,
  } = useDashboardExport();

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
          <button
            type="button"
            className="dashboard-export"
            onClick={startExport}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting…' : 'Export CSV'}
          </button>
          {isExporting && (
            <button type="button" className="dashboard-export-cancel" onClick={cancelExport}>
              Cancel export
            </button>
          )}
          {lastUpdated && (
            <p className="dashboard-shell__timestamp">
              Last updated{' '}
              <time dateTime={lastUpdated}>{new Date(lastUpdated).toLocaleString()}</time>
            </p>
          )}
        </div>
      </header>
      {(exportStatus === 'success' || exportStatus === 'error') && (
        <div
          className={`dashboard-export-banner${
            exportStatus === 'error' ? ' dashboard-export-banner--error' : ''
          }`}
          role={exportStatus === 'error' ? 'alert' : 'status'}
          aria-live={exportStatus === 'error' ? 'assertive' : 'polite'}
        >
          {exportStatus === 'success' ? (
            <>
              <div>
                <p>
                  Export ready: <strong>{exportFilename}</strong>
                </p>
                {exportCompletedAt && (
                  <p className="dashboard-export-banner__meta">
                    Generated {new Date(exportCompletedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="dashboard-export-banner__actions">
                <button type="button" onClick={downloadAgain}>
                  Download again
                </button>
                <button type="button" onClick={resetExport}>
                  Dismiss
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p>{exportError ?? 'Unable to export incidents.'}</p>
                <p className="dashboard-export-banner__meta">
                  Check your filters or try narrowing the timeframe (exports cap at 5,000 records).
                </p>
              </div>
              <div className="dashboard-export-banner__actions">
                <button type="button" onClick={startExport}>
                  Retry export
                </button>
                <button type="button" onClick={resetExport}>
                  Dismiss
                </button>
              </div>
            </>
          )}
        </div>
      )}
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
        <IncidentDetailModal />
      </section>
    </div>
  );
};

export default DashboardLayout;
