
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import type { UseDashboardDailyTrendResult } from '../../hooks/useDashboardDailyTrend';

interface DashboardDailyTrendChartProps {
  trendQuery: UseDashboardDailyTrendResult;
  timeRangeLabel: string;
}

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

const formatLongDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

export function DashboardDailyTrendChart({ trendQuery, timeRangeLabel }: DashboardDailyTrendChartProps) {
  const { data, isLoading, isError, error, refresh, lastUpdated } = trendQuery;

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
        <CardContent className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <div className="flex gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error?.message || 'Failed to load daily trend'}</span>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const points = data?.points || [];
  const trend = data?.trend;

  if (points.length === 0 || !trend) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>Trend data will appear once incidents stream in.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Chart dimensions
  const paddingX = 32;
  const paddingY = 24;
  const width = 800;
  const height = 240;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;

  // Calculate Y-axis range
  const counts = points.map((p) => p.count);
  const minimum = Math.min(...counts);
  const maximum = Math.max(...counts);
  const yRange = maximum === minimum ? 1 : maximum - minimum;

  // Map points to SVG coordinates
  const svgPoints = points.map((point, index) => {
    const x = paddingX + (index / Math.max(points.length - 1, 1)) * usableWidth;
    const y = paddingY + (1 - (point.count - minimum) / yRange) * usableHeight;
    return { ...point, x, y };
  });

  // Build path for the line
  const pathD = svgPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  // Build area path
  const areaPathD = [
    `M ${svgPoints[0].x} ${height - paddingY}`,
    ...svgPoints.map((point) => `L ${point.x} ${point.y}`),
    `L ${svgPoints[svgPoints.length - 1].x} ${height - paddingY}`,
    'Z',
  ].join(' ');

  // Highlight last 7 days
  const highlightStartIndex = Math.max(svgPoints.length - 7, 0);
  const highlightPoints = svgPoints.slice(highlightStartIndex);

  const percentageDisplay =
    trend.percentageChange === null || !Number.isFinite(trend.percentageChange)
      ? 'N/A'
      : `${trend.percentageChange >= 0 ? '+' : ''}${trend.percentageChange.toFixed(1)}%`;

  const trendVariant =
    trend.direction === 'up' ? 'destructive' : trend.direction === 'down' ? 'default' : 'secondary';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle>Daily Incident Trend</CardTitle>
            <CardDescription>
              {timeRangeLabel} · {trend.currentTotal.toLocaleString()} incidents
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* SVG Chart */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto"
            role="img"
            aria-label="Daily incident trend chart"
          >
            <defs>
              <linearGradient id="trendArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Area fill */}
            <path d={areaPathD} fill="url(#trendArea)" />

            {/* Line path */}
            <path
              d={pathD}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points */}
            {svgPoints.map((point) => (
              <g key={point.date}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={3}
                  fill="hsl(var(--primary))"
                  className="hover:r-5 transition-all cursor-pointer"
                >
                  <title>
                    {formatLongDate(point.date)}: {point.count.toLocaleString()} incidents
                  </title>
                </circle>
              </g>
            ))}

            {/* Highlight last 7 days */}
            {highlightPoints.length > 1 && (
              <path
                d={highlightPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                fill="none"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                strokeDasharray="4 2"
                opacity="0.7"
              />
            )}

            {/* X-axis labels */}
            <text
              x={svgPoints[0].x}
              y={height - 8}
              fontSize="11"
              fill="currentColor"
              textAnchor="start"
              opacity="0.6"
            >
              {formatDate(points[0].date)}
            </text>
            <text
              x={svgPoints[Math.floor(svgPoints.length / 2)].x}
              y={height - 8}
              fontSize="11"
              fill="currentColor"
              textAnchor="middle"
              opacity="0.6"
            >
              {formatDate(points[Math.floor(points.length / 2)].date)}
            </text>
            <text
              x={svgPoints[svgPoints.length - 1].x}
              y={height - 8}
              fontSize="11"
              fill="currentColor"
              textAnchor="end"
              opacity="0.6"
            >
              {formatDate(points[points.length - 1].date)}
            </text>
          </svg>
        </div>

        {/* Trend Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">7-day Change</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {trend.change >= 0 ? '+' : ''}
                {trend.change.toLocaleString()}
              </span>
              <Badge variant={trendVariant}>{percentageDisplay}</Badge>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Current 7-day Total</p>
            <p className="text-2xl font-bold">{trend.currentTotal.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Previous 7-day Total</p>
            <p className="text-2xl font-bold">{trend.previousTotal.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Trend Direction:</span>
          <Badge variant={trendVariant} className="capitalize">
            {trend.direction === 'up' ? 'Upward' : trend.direction === 'down' ? 'Downward' : 'Flat'}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground justify-end">
        {lastUpdated && <span>Updated {new Date(lastUpdated).toLocaleTimeString()}</span>}
      </CardFooter>
    </Card>
  );
}
