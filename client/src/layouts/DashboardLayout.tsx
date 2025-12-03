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
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Download, X } from 'lucide-react';
import { useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { DashboardProvider, useDashboard } from '../providers/dashboard-provider';

function DashboardHeader() {
  const {
    timeRange,
    setTimeRange,
  } = useDashboard();

  return (
    <div className="flex justify-end mb-4 items-center gap-4">
      <Select value={timeRange} onValueChange={(val: any) => setTimeRange(val)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select time range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="24h">Last 24 Hours</SelectItem>
          <SelectItem value="7d">Last 7 Days</SelectItem>
          <SelectItem value="30d">Last 30 Days</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function DashboardContent() {
  const { filters, timeRangeLabel, comparisonLabel, timeRange } = useDashboard();

  // Initialize all dashboard hooks with filters from context
  const kpiQuery = useDashboardLast24HoursKpi(filters);
  const typeDistributionQuery = useDashboardTypeDistribution(filters);
  const severityDistributionQuery = useDashboardSeverityDistribution(filters);
  const dailyTrendQuery = useDashboardDailyTrend(filters);
  const recentIncidentsQuery = useDashboardRecentIncidents({ ...filters, limit: 20 });

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
          <DashboardHeader />

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
            <DashboardSeverityDistributionChart
              distributionQuery={severityDistributionQuery}
              timeRangeLabel={timeRangeLabel}
            />
          </div>
        </section>

        {/* Daily Trend (Full Width) */}
        <section>
          <DashboardDailyTrendChart trendQuery={dailyTrendQuery} timeRangeLabel={timeRangeLabel} comparisonLabel={comparisonLabel} timeRange={timeRange} />
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

export default function DashboardLayout() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}
