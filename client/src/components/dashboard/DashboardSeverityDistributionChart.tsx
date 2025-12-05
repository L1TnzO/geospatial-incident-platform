import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
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
        <CardContent className="h-[300px] flex items-center justify-center">
          <Skeleton className="h-[250px] w-[250px] rounded-full" />
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

  const chartData = buckets.map((bucket) => ({
    name: bucket.severity.name,
    value: bucket.count,
    color: bucket.severity.colorHex || '#6b7280',
    percentage: bucket.percentage,
  }));

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
      <CardContent>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string, props: any) => [
                  `${value.toLocaleString()} (${percentageFormatter.format(props.payload.percentage)}%)`,
                  name,
                ]}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Legend
                layout="vertical"
                verticalAlign="middle"
                align="right"
                wrapperStyle={{ fontSize: '12px' }}
              />
            </PieChart >
          </ResponsiveContainer >
        </div >
      </CardContent >
      <CardFooter className="text-xs text-muted-foreground justify-end">
        {lastUpdated && <span>Updated {new Date(lastUpdated).toLocaleTimeString()}</span>}
      </CardFooter>
    </Card >
  );
}
