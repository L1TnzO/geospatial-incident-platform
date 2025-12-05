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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
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
          <SelectItem value="3m">Last 3 Months</SelectItem>
          <SelectItem value="1y">Last 12 Months</SelectItem>
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

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container mx-auto p-6 space-y-8">
        {/* KPI Row with Export */}
        <section>
          <DashboardHeader />

          <DashboardKPIRow
            kpiQuery={kpiQuery}
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
