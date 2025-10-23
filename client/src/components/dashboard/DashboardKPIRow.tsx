import { RefreshCw, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import type { UseDashboardLast24HoursKpiResult } from '../../hooks/useDashboardLast24HoursKpi';

interface DashboardKPIRowProps {
  kpiQuery: UseDashboardLast24HoursKpiResult;
  onExport: () => void;
  isExporting: boolean;
}

const countFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const signedFormatter = new Intl.NumberFormat(undefined, {
  signDisplay: 'always',
  maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat(undefined, {
  signDisplay: 'always',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type TrendDirection = 'up' | 'down' | 'flat';

const getTrendDirection = (delta: number): TrendDirection => {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'flat';
};

const getTrendIcon = (direction: TrendDirection) => {
  const iconClass = 'h-4 w-4';
  switch (direction) {
    case 'up':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 14l5-5 5 5z" />
        </svg>
      );
    case 'down':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 10l5 5 5-5z" />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 12h8" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
  }
};

const formatWindow = (start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toLocaleString()} – ${endDate.toLocaleString()}`;
};

export function DashboardKPIRow({ kpiQuery, onExport, isExporting }: DashboardKPIRowProps) {
  const { data, isLoading, isError, error, refresh } = kpiQuery;

  const handleRefresh = async () => {
    await refresh(true);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <div role="status" aria-live="polite">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div aria-hidden="true">
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-8 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between">
          <span>{error?.message || 'Failed to load KPI data'}</span>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertDescription>No incidents recorded in the last 24 hours.</AlertDescription>
      </Alert>
    );
  }

  const direction = getTrendDirection(data.delta);
  const deltaText = signedFormatter.format(data.delta);
  const percentageText =
    data.deltaPercentage === null ? 'N/A' : `${percentageFormatter.format(data.deltaPercentage)}%`;

  const trendVariant =
    direction === 'up' ? 'destructive' : direction === 'down' ? 'default' : 'secondary';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Key Performance Indicators</h2>
          <p className="text-sm text-muted-foreground">
            24-hour incident snapshot with trend comparison
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="default" size="sm" onClick={onExport} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incidents (Last 24 Hours)</CardTitle>
          <CardDescription>{formatWindow(data.window.start, data.window.end)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-4xl font-bold">{countFormatter.format(data.currentCount)}</div>

          <div className="flex items-center gap-2">
            <Badge variant={trendVariant} className="flex items-center gap-1">
              {getTrendIcon(direction)}
              <span>{deltaText}</span>
            </Badge>
            <span className="text-sm font-medium">{percentageText}</span>
            <span className="text-sm text-muted-foreground">vs previous 24h</span>
          </div>

          <p className="text-sm text-muted-foreground">
            Previous window: {countFormatter.format(data.previousCount)} incidents
            <br />
            {formatWindow(data.previousWindow.start, data.previousWindow.end)}
          </p>

          {kpiQuery.lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(kpiQuery.lastUpdated).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
