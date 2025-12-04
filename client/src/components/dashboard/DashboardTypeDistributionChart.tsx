import { useState } from 'react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';
import type { UseDashboardTypeDistributionResult } from '../../hooks/useDashboardTypeDistribution';

interface DashboardTypeDistributionChartProps {
  distributionQuery: UseDashboardTypeDistributionResult;
}

type DisplayMode = 'count' | 'percentage';

const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

export function DashboardTypeDistributionChart({
  distributionQuery,
}: DashboardTypeDistributionChartProps) {
  const [mode, setMode] = useState<DisplayMode>('count');
  const { data, isLoading, isError, error, refresh, lastUpdated } = distributionQuery;

  const handleRefresh = async () => {
    await refresh(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div role="status" aria-live="polite">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div aria-hidden="true">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Incident Types</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error?.message || 'Failed to load type distribution'}</span>
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

  if (buckets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Incident Types</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>No type data available. Adjust filters if needed.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle>Incident Types</CardTitle>
            <CardDescription>Last 7 days · {total.toLocaleString()} incidents</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant={mode === 'count' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('count')}
            >
              Count
            </Button>
            <Button
              variant={mode === 'percentage' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('percentage')}
            >
              Percentage
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {buckets.map((bucket) => {
          const value = mode === 'count' ? bucket.count : bucket.percentage;
          const maxValue = mode === 'count' ? maxCount : 100;
          const widthPercent = (value / maxValue) * 100;
          const displayValue =
            mode === 'count' ? bucket.count.toLocaleString() : formatPercentage(bucket.percentage);

          return (
            <div key={bucket.type.code} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{bucket.type.name}</span>
                <span className="text-muted-foreground">{displayValue}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.max(widthPercent, 2)}%` }}
                  aria-label={`${bucket.type.name}: ${bucket.count.toLocaleString()} incidents (${formatPercentage(bucket.percentage)})`}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
      <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
        {lastUpdated && <span>Updated {new Date(lastUpdated).toLocaleTimeString()}</span>}
      </CardFooter>
    </Card>
  );
}
