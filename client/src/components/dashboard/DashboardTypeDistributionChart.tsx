import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';
import type { UseDashboardTypeDistributionResult } from '../../hooks/useDashboardTypeDistribution';

interface DashboardTypeDistributionChartProps {
  distributionQuery: UseDashboardTypeDistributionResult;
}

export function DashboardTypeDistributionChart({
  distributionQuery,
}: DashboardTypeDistributionChartProps) {
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
        <CardContent className="h-[300px] flex items-center justify-center">
          <Skeleton className="h-[250px] w-full" />
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

  // Prepare data for Recharts
  const chartData = buckets.map((bucket) => ({
    name: bucket.type.name,
    count: bucket.count,
    percentage: bucket.percentage,
    percentageLabel: `${bucket.percentage.toFixed(1)}%`,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle>Incident Types</CardTitle>
            <CardDescription>Last 7 days · {total.toLocaleString()} incidents</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                width={100}
                tick={{ fontSize: 12 }}
                interval={0}
              />
              <Tooltip
                formatter={(value: number, _name: string, props: any) => [
                  `${value.toLocaleString()} (${props.payload.percentage.toFixed(1)}%)`,
                  'Incidents',
                ]}
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar
                dataKey="count"
                fill="hsl(var(--primary))"
                radius={4}
                barSize={32}
                background={{ fill: 'hsl(var(--muted))', radius: 4 }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
        {lastUpdated && <span>Updated {new Date(lastUpdated).toLocaleTimeString()}</span>}
      </CardFooter>
    </Card>
  );
}
