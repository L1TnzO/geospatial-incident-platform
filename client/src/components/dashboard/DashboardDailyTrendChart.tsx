import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import type { UseDashboardDailyTrendResult } from '../../hooks/useDashboardDailyTrend';
import { subMonths, subYears } from 'date-fns';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { useState, useMemo } from 'react';
import { useDashboard } from '../../providers/dashboard-provider';
import { Button } from '../ui/button';

type TimeRange = '24h' | '7d' | '30d' | '3m' | '1y' | 'custom';


interface DashboardDailyTrendChartProps {
  trendQuery: UseDashboardDailyTrendResult;
  timeRangeLabel: string;
  comparisonLabel: string;
  timeRange: TimeRange;
  isYoY: boolean;
}


export function DashboardDailyTrendChart({ trendQuery, timeRangeLabel, comparisonLabel, timeRange, isYoY }: DashboardDailyTrendChartProps) {
  const { data, isLoading, isError, error, refresh, lastUpdated } = trendQuery;
  const { setCustomDateRange, setTimeRange: setGlobalTimeRange } = useDashboard();
  const [showPreviousPeriod, setShowPreviousPeriod] = useState(false);

  const isHourly = useMemo(() => {
    if (timeRange === '24h') return true;
    if (data?.points && data.points.length > 1) {
      const diff = new Date(data.points[1].date).getTime() - new Date(data.points[0].date).getTime();
      return diff < 23 * 60 * 60 * 1000;
    }
    return false;
  }, [timeRange, data]);

  const handlePointClick = (dateStr: string) => {
    if (isHourly) return;
    const date = new Date(dateStr);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    setCustomDateRange(start.toISOString(), end.toISOString());
  };

  const formatWindow = (start: Date, end: Date): string => {
    return `${start.toLocaleString()} – ${end.toLocaleString()}`;
  };

  const calculateWindows = () => {
    const end = new Date();
    const start = new Date();
    const previousEnd = new Date();
    const previousStart = new Date();

    switch (timeRange) {
      case '24h':
        start.setHours(end.getHours() - 24);
        break;
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '3m':
        {
          const start3m = subMonths(end, 3);
          start.setTime(start3m.getTime());
        }
        break;
      case '1y':
        {
          const start1y = subYears(end, 1);
          start.setTime(start1y.getTime());
        }
        break;
      default:
        start.setHours(end.getHours() - 24);
    }

    if (isYoY) {
      const prevStart = subYears(start, 1);
      const prevEnd = subYears(end, 1);
      previousStart.setTime(prevStart.getTime());
      previousEnd.setTime(prevEnd.getTime());
    } else {
      // Default behavior: previous period of same duration
      const durationMs = end.getTime() - start.getTime();
      previousEnd.setTime(start.getTime());
      previousStart.setTime(start.getTime() - durationMs);
    }

    return {
      currentWindow: { start, end },
      previousWindow: { start: previousStart, end: previousEnd },
    };
  };

  const { currentWindow, previousWindow } = calculateWindows();

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
        <CardContent className="space-y-6">
          {/* Back Button */}
          {timeRange === 'custom' && (
            <div className="mb-2">
              <Button variant="outline" size="sm" onClick={() => setGlobalTimeRange('30d')} className="h-8">
                ← Back to Overview
              </Button>
            </div>
          )}

          <div className="h-[300px] w-full" />
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
  // Calculate Y-axis range
  const counts = points.map((p) => p.count);
  const previousCounts = (showPreviousPeriod && !isHourly && data?.previousPoints) ? data.previousPoints.map(p => p.count) : [];

  // Yes, otherwise they might go out of bounds.

  const allCounts = [...counts, ...previousCounts];
  const effectiveMin = allCounts.length ? Math.min(...allCounts) : 0;
  const effectiveMax = allCounts.length ? Math.max(...allCounts) : 0;

  const yRange = effectiveMax === effectiveMin ? 1 : effectiveMax - effectiveMin;

  // Map points to SVG coordinates
  const svgPoints = points.map((point, index) => {
    const x = paddingX + (index / Math.max(points.length - 1, 1)) * usableWidth;
    const y = paddingY + (1 - (point.count - effectiveMin) / yRange) * usableHeight;

    const dateObj = new Date(point.date);
    const label = isHourly
      ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    return { ...point, x, y, label };
  });

  const svgPreviousPoints = (showPreviousPeriod && !isHourly && data?.previousPoints)
    ? data.previousPoints.map((point, index) => {
      // Assume same length/alignment for simplicity as per previous component
      const x = paddingX + (index / Math.max((data.previousPoints?.length || 1) - 1, 1)) * usableWidth;
      const y = paddingY + (1 - (point.count - effectiveMin) / yRange) * usableHeight;
      return { ...point, x, y };
    })
    : [];

  // Build path for the line
  const pathD = svgPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const previousPathD = svgPreviousPoints
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
            <p className="text-xs text-muted-foreground mt-1">
              {formatWindow(currentWindow.start, currentWindow.end)}
            </p>
          </div>
          {!isHourly && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dashboard-show-previous"
                checked={showPreviousPeriod}
                onCheckedChange={(checked: boolean | 'indeterminate') => setShowPreviousPeriod(checked === true)}
              />
              <Label htmlFor="dashboard-show-previous" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Compare
              </Label>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Back Button */}
        {timeRange === 'custom' && (
          <div className="mb-2">
            <Button variant="outline" size="sm" onClick={() => setGlobalTimeRange('30d')} className="h-8">
              ← Back to Overview
            </Button>
          </div>
        )}

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

            {/* Previous Period Ghost Line */}
            {showPreviousPeriod && previousPathD && (
              <>
                <path
                  d={previousPathD}
                  fill="none"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  strokeOpacity="0.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {svgPreviousPoints.map((point) => (
                  <g key={`prev-${point.date}`}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={3}
                      fill="hsl(var(--muted-foreground))"
                      opacity="0.5"
                    >
                      <title>
                        Previous Period: {point.count.toLocaleString()} incidents
                      </title>
                    </circle>
                  </g>
                ))}
              </>
            )}

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
            {svgPoints.map((point, index) => (
              <g key={point.date}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={4}
                  fill="hsl(var(--primary))"
                  className={isHourly ? "cursor-default" : "cursor-pointer hover:r-6 transition-all"}
                  onClick={() => handlePointClick(point.date)}
                >
                  <title>
                    {point.label}: {point.count.toLocaleString()} incidents
                  </title>
                </circle>
                {/* X-axis labels (show sparsely) */}
                {index % Math.ceil(points.length / 10) === 0 && (
                  <text
                    x={point.x}
                    y={height - 5}
                    textAnchor="middle"
                    fontSize={10}
                    fill="hsl(var(--muted-foreground))"
                  >
                    {point.label}
                  </text>
                )}
              </g>
            ))}

            {/* Highlight last 7 days (only in daily view) */}
            {!isHourly && highlightPoints.length > 1 && (
              <path
                d={highlightPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                fill="none"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                strokeDasharray="4 2"
                opacity="0.7"
              />
            )}
          </svg>
        </div>

        {/* Trend Summary */}
        <div className="space-y-4">
          <div className="text-4xl font-bold">{trend.currentTotal.toLocaleString()}</div>

          <div className="flex items-center gap-2">
            <Badge variant={trendVariant} className="flex items-center gap-1">
              {trend.direction === 'up' ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 14l5-5 5 5z" />
                </svg>
              ) : trend.direction === 'down' ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 12h8" stroke="currentColor" strokeWidth="2" />
                </svg>
              )}
              <span>{percentageDisplay}</span>
            </Badge>
            <span className="text-sm font-medium">
              {trend.change >= 0 ? '+' : ''}
              {trend.change.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">{timeRangeLabel === 'Last 24 Hours' ? 'vs previous 24h' : comparisonLabel}</span>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Previous period: {trend.previousTotal.toLocaleString()} incidents
            </p>
            <p className="text-xs text-muted-foreground">
              {formatWindow(previousWindow.start, previousWindow.end)}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground justify-end">
        {lastUpdated && <span>Updated {new Date(lastUpdated).toLocaleTimeString()}</span>}
      </CardFooter>
    </Card>
  );
}
