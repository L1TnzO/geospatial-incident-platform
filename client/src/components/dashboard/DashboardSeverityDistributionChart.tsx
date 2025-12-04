
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';
import type { UseDashboardSeverityDistributionResult } from '../../hooks/useDashboardSeverityDistribution';

interface DashboardSeverityDistributionChartProps {
  distributionQuery: UseDashboardSeverityDistributionResult;
  timeRangeLabel: string;
}

const percentageFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

export function DashboardSeverityDistributionChart({
  distributionQuery,
  timeRangeLabel,
}: DashboardSeverityDistributionChartProps) {
  const { data, isLoading, isError, error, refresh, lastUpdated } = distributionQuery;

  const handleRefresh = async () => {
    await refresh(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <Skeleton className="h-48 w-48 rounded-full" />
          <div className="space-y-2 w-full">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Severity Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error?.message || 'Failed to load severity distribution'}</span>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const buckets = data?.buckets || [];
  const total = data?.total || 0;

  if (buckets.length === 0 || total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Severity Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              No severity data available. Adjust timeframe filters if needed.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Build conic gradient segments
  let cursor = 0;
  const segments = buckets.map((bucket, index) => {
    const start = cursor;
    cursor += bucket.percentage;
    const end = index === buckets.length - 1 ? 100 : Math.min(100, cursor);
    return { start, end, bucket };
  });

  const gradientStops = segments
    .map(({ start, end, bucket }) => `${bucket.severity.colorHex || '#6b7280'} ${start}% ${end}%`)
    .join(', ');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle>Severity Distribution</CardTitle>
            <CardDescription>{timeRangeLabel} · {total.toLocaleString()} incidents</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-6">
        {/* Donut Chart */}
        <div className="relative">
          <div
            className="h-48 w-48 rounded-full"
            style={{
              background: `conic-gradient(${gradientStops})`,
            }}
            role="img"
            aria-label="Severity distribution donut chart"
          >
            {/* Center hole */}
            <div className="absolute inset-0 m-auto h-32 w-32 rounded-full bg-background flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{total.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">Incidents</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full space-y-2">
          {buckets.map((bucket) => {
            const percentageText = percentageFormatter.format(bucket.percentage);
            return (
              <div
                key={bucket.severity.code}
                className="flex items-center justify-between text-sm"
                title={`${bucket.severity.name}: ${bucket.count.toLocaleString()} incidents (${percentageText}%)`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: bucket.severity.colorHex || '#6b7280' }}
                    aria-hidden="true"
                  />
                  <span className="font-medium">{bucket.severity.name}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>{bucket.count.toLocaleString()}</span>
                  <span className="text-xs">·</span>
                  <span>{percentageText}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground justify-end">
        {lastUpdated && <span>Updated {new Date(lastUpdated).toLocaleTimeString()}</span>}
      </CardFooter>
    </Card>
  );
}
