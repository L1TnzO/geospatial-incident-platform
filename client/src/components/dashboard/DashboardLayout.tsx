import { DashboardKPIRow } from '../components/dashboard/DashboardKPIRow';
import { DashboardTypeDistributionChart } from '../components/dashboard/DashboardTypeDistributionChart';
import { DashboardSeverityDistributionChart } from '../components/dashboard/DashboardSeverityDistributionChart';
import { DashboardDailyTrendChart } from '../components/dashboard/DashboardDailyTrendChart';
import { DashboardRecentIncidents } from '../components/dashboard/DashboardRecentIncidents';
import { useDashboardLast24HoursKpi } from '../hooks/useDashboardLast24HoursKpi';
import { useDashboardTypeDistribution } from '../hooks/useDashboardTypeDistribution';
import { useDashboardSeverityDistribution } from '../hooks/useDashboardSeverityDistribution';
import { useDashboardDailyTrend } from '../hooks/useDashboardDailyTrend';
import { useDashboardRecentIncidents } from '../hooks/useDashboardRecentIncidents';
import { useDashboardExport } from '../hooks/useDashboardExport';
import { useIncidentFiltersStore } from '../store/incident-filters-store';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Download, X } from 'lucide-react';
import { useCallback } from 'react';

export function DashboardLayout() {
  // Get filter state from the incident filters store
  const filters = useIncidentFiltersStore((state) => ({
    typeCodes: state.typeCodes,
    severityCodes: state.severityCodes,
    statusCodes: state.statusCodes,
    startDate: state.startDate,
    endDate: state.endDate,
    isActive: state.isActive,
  }));

  // Initialize all dashboard hooks with filters
  const kpiQuery = useDashboardLast24HoursKpi(filters);
  const typeDistributionQuery = useDashboardTypeDistribution(filters);
  const severityDistributionQuery = useDashboardSeverityDistribution(filters);
  const dailyTrendQuery = useDashboardDailyTrend(filters);
  const recentIncidentsQuery = useDashboardRecentIncidents({ ...filters, limit: 10 });

  // Helper to determine labels
  const getTimeLabels = () => {
    if (!filters.startDate || !filters.endDate) return { label: 'Last 24 Hours', comparison: 'vs previous 24h' };

    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) return { label: 'Last 24 Hours', comparison: 'vs previous 24h' };
    if (diffDays <= 7) return { label: 'Last 7 Days', comparison: 'vs previous 7 days' };
    if (diffDays <= 30) return { label: 'Last 30 Days', comparison: 'vs previous 30 days' };
    return { label: `Last ${diffDays} Days`, comparison: `vs previous ${diffDays} days` };
  };

  const { label: timeRangeLabel, comparison: comparisonLabel } = getTimeLabels();

  // Export hook
  const {
    export: triggerExport,
    isExporting,
    exportError,
    reset: resetExport,
  } = useDashboardExport();

  const handleExport = useCallback(async () => {
    try {
      const result = await triggerExport(filters);

      // Trigger download
      const link = document.createElement('a');
      link.href = result.blobUrl;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL after download
      setTimeout(() => {
        URL.revokeObjectURL(result.blobUrl);
      }, 100);
    } catch (error) {
      // Error is handled by the export hook
      console.error('Export failed:', error);
    }
  }, [triggerExport, filters]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container mx-auto p-6 space-y-8">
        {/* Export Error Banner */}
        {exportError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold">Export Failed</p>
                <p className="text-sm">{exportError.message || 'Unable to export incidents'}</p>
                <p className="text-xs mt-1">
                  Check your filters or try narrowing the timeframe (exports cap at 5,000 records).
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Retry
                </Button>
                <Button variant="ghost" size="sm" onClick={resetExport}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* KPI Row with Export */}
        <section>
          <DashboardKPIRow
            kpiQuery={kpiQuery}
            onExport={handleExport}
            isExporting={isExporting}
            timeRangeLabel={timeRangeLabel}
            comparisonLabel={comparisonLabel}
          />
        </section>

        {/* Charts Grid */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Incident Distribution</h2>
            <p className="text-sm text-muted-foreground">
              Type, severity, and trends for active filters
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <DashboardTypeDistributionChart distributionQuery={typeDistributionQuery} />
            <DashboardSeverityDistributionChart distributionQuery={severityDistributionQuery} />
          </div>
        </section>

        {/* Daily Trend (Full Width) */}
        <section>
          <DashboardDailyTrendChart
            trendQuery={dailyTrendQuery}
            timeRangeLabel={timeRangeLabel}
          />
        </section>

        {/* Recent Incidents Panel */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Recent Incidents</h2>
            <p className="text-sm text-muted-foreground">
              Latest incidents matching your filter criteria
            </p>
          </div>
          <DashboardRecentIncidents recentQuery={recentIncidentsQuery} />
        </section>
      </div>
    </div>
  );
}
