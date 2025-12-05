import type { UseDashboardLast24HoursKpiResult } from '../../hooks/useDashboardLast24HoursKpi';
import { DashboardKPICard } from './DashboardKPICard';

interface DashboardKPIRowProps {
  kpiQuery: UseDashboardLast24HoursKpiResult;
  highSeverityKpiQuery: UseDashboardLast24HoursKpiResult;
  timeRangeLabel: string;
  comparisonLabel: string;
}

export function DashboardKPIRow({
  kpiQuery,
  highSeverityKpiQuery,
  timeRangeLabel,
  comparisonLabel,
}: DashboardKPIRowProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Key Performance Indicators</h2>
          <p className="text-sm text-muted-foreground">
            {timeRangeLabel} incident snapshot with trend comparison
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardKPICard
          kpiQuery={kpiQuery}
          title={`Incidents (${timeRangeLabel})`}
          description="Total incidents reported"
          comparisonLabel={comparisonLabel}
        />
        <DashboardKPICard
          kpiQuery={highSeverityKpiQuery}
          title={`High Severity (${timeRangeLabel})`}
          description="High, Critical, and Severe incidents"
          comparisonLabel={comparisonLabel}
        />
      </div>
    </div>
  );
}

