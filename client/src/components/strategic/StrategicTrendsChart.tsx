import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { StrategicMonthlyTrendResponse } from '../../types/api/strategic';
import type { DailyTrendResponse } from '../../types/api/dashboard';

interface StrategicTrendsChartProps {
  data: StrategicMonthlyTrendResponse | DailyTrendResponse | null;
  trendType?: 'monthly' | 'daily';
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  onRefresh: () => void;
  onPeriodClick?: (period: string, startDate: string, endDate: string) => void;
  comparisonLabel: string;
  timeRange: '24h' | '7d' | '30d';
}

export function StrategicTrendsChart({
  data,
  trendType = 'monthly',
  isLoading,
  isError,
  error,
  onRefresh,
  onPeriodClick,
  comparisonLabel,
  timeRange,
}: StrategicTrendsChartProps) {
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
        previousEnd.setHours(end.getHours() - 24);
        previousStart.setHours(end.getHours() - 48);
        break;
      case '7d':
        start.setDate(end.getDate() - 7);
        previousEnd.setDate(end.getDate() - 7);
        previousStart.setDate(end.getDate() - 14);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        previousEnd.setDate(end.getDate() - 30);
        previousStart.setDate(end.getDate() - 60);
        break;
      default:
        start.setHours(end.getHours() - 24);
        previousEnd.setHours(end.getHours() - 24);
        previousStart.setHours(end.getHours() - 48);
    }

    return {
      currentWindow: { start, end },
      previousWindow: { start: previousStart, end: previousEnd },
    };
  };

  const { currentWindow, previousWindow } = calculateWindows();

  const normalizedData = useMemo(() => {
    if (!data) return null;

    if (trendType === 'daily' && 'points' in data) {
      const dailyData = data as DailyTrendResponse;
      return {
        series: dailyData.points.map((p) => ({
          label: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          count: p.count,
          start: p.date,
          end: p.date, // Daily points are single day
          period: p.date,
          change: null, // Daily points don't have individual change metrics in this response
          percentage: null,
        })),
        totals: {
          current: dailyData.trend.currentTotal,
          change: dailyData.trend.change,
          percentage: dailyData.trend.percentageChange,
        },
      };
    } else if ('series' in data) {
      const monthlyData = data as StrategicMonthlyTrendResponse;
      return {
        series: monthlyData.series.map((p) => ({
          label: p.label,
          count: p.count,
          start: p.start,
          end: p.end,
          period: p.month,
          change: p.monthOverMonthDelta,
          percentage: p.monthOverMonthPercentage,
        })),
        totals: {
          current: monthlyData.totals.currentPeriodTotal,
          change: monthlyData.totals.periodDelta,
          percentage: monthlyData.totals.periodPercentage,
        },
      };
    }
    return null;
  }, [data, trendType]);

  const maxCount = useMemo(() => {
    if (!normalizedData?.series) return 0;
    return Math.max(...normalizedData.series.map((point) => point.count));
  }, [normalizedData]);

  const chartHeight = 280;
  const chartPadding = useMemo(() => ({ top: 20, right: 20, bottom: 40, left: 50 }), []);
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const plotWidth = 800 - chartPadding.left - chartPadding.right;

  const points = useMemo(() => {
    if (!normalizedData?.series || normalizedData.series.length === 0) return [];

    const stepX = plotWidth / (normalizedData.series.length - 1 || 1);
    return normalizedData.series.map((point, index) => {
      const x = chartPadding.left + index * stepX;
      const y = chartPadding.top + plotHeight - (point.count / (maxCount || 1)) * plotHeight;
      return { x, y, data: point };
    });
  }, [normalizedData, maxCount, plotWidth, plotHeight, chartPadding]);

  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    const firstPoint = points[0];
    let path = `M ${firstPoint.x} ${firstPoint.y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  }, [points]);

  const handlePointClick = (point: (typeof points)[0]) => {
    if (onPeriodClick) {
      onPeriodClick(point.data.period, point.data.start, point.data.end);
    }
  };

  const formatPercentage = (value: number | null | undefined) => {
    if (value == null) return 'N/A';
    // const sign = value >= 0 ? '+' : ''; // Badge usually doesn't need explicit + if we have arrow, but let's keep it consistent with Dashboard which uses signedFormatter
    return `${Math.abs(value).toFixed(1)}%`; // Dashboard uses absolute in badge? No, it uses signedFormatter. Let's check Dashboard again.
    // Dashboard uses: data.deltaPercentage === null ? 'N/A' : `${percentageFormatter.format(data.deltaPercentage)}%`;
    // percentageFormatter has signDisplay: 'always'.
    // So it shows +5.0% or -5.0%.
  };

  const getTrendDirection = (value: number | null | undefined) => {
    if (value == null) return 'flat';
    if (value > 0) return 'up';
    if (value < 0) return 'down';
    return 'flat';
  };

  const getTrendIcon = (direction: 'up' | 'down' | 'flat') => {
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trend Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading trend data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trend Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64">
            <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              {error?.message || 'Failed to load trend data'}
            </p>
            <Button variant="secondary" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!normalizedData || normalizedData.series.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trend Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p>No trend data available</p>
            <p className="text-xs mt-2">Adjust filters or check back later</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Trend Analysis</CardTitle>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {/* Summary metrics */}
        {/* Summary metrics */}
        <div className="mb-6 space-y-4">
          <div className="text-4xl font-bold">
            {normalizedData.totals?.current?.toLocaleString() || '0'}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatWindow(currentWindow.start, currentWindow.end)}
          </p>

          <div className="flex items-center gap-2">
            <Badge
              variant={getTrendDirection(normalizedData.totals?.change) === 'up' ? 'destructive' : getTrendDirection(normalizedData.totals?.change) === 'down' ? 'default' : 'secondary'}
              className="flex items-center gap-1"
            >
              {getTrendIcon(getTrendDirection(normalizedData.totals?.change))}
              <span>
                {formatPercentage(normalizedData.totals?.percentage)}
              </span>
            </Badge>
            <span className="text-sm font-medium">
              {(normalizedData.totals?.change ?? 0) > 0 ? '+' : ''}
              {normalizedData.totals?.change?.toLocaleString() || '0'}
            </span>
            <span className="text-sm text-muted-foreground">{comparisonLabel}</span>
          </div>



          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Previous period: {((normalizedData.totals?.current || 0) - (normalizedData.totals?.change || 0)).toLocaleString()} incidents
            </p>
            <p className="text-xs text-muted-foreground">
              {formatWindow(previousWindow.start, previousWindow.end)}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="overflow-x-auto">
          <svg
            width="800"
            height={chartHeight}
            className="w-full"
            role="img"
            aria-label="Trend chart"
          >
            {/* Y-axis grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = chartPadding.top + plotHeight - ratio * plotHeight;
              return (
                <g key={ratio}>
                  <line
                    x1={chartPadding.left}
                    y1={y}
                    x2={chartPadding.left + plotWidth}
                    y2={y}
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-border opacity-30"
                  />
                  <text
                    x={chartPadding.left - 10}
                    y={y}
                    textAnchor="end"
                    alignmentBaseline="middle"
                    className="text-xs fill-muted-foreground"
                  >
                    {Math.round(maxCount * ratio)}
                  </text>
                </g>
              );
            })}

            {/* Line path */}
            <path
              d={pathD}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {points.map((point, index) => (
              <g key={index}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill="hsl(var(--primary))"
                  className="cursor-pointer hover:r-7 transition-all"
                  onClick={() => handlePointClick(point)}
                  role="button"
                  aria-label={`${point.data.label}: ${point.data.count} incidents`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handlePointClick(point);
                    }
                  }}
                >
                  <title>
                    {point.data.label}: {point.data.count} incidents
                    {point.data.percentage != null && `\nChange: ${formatPercentage(point.data.percentage)}`}
                  </title>
                </circle>
                {/* X-axis labels */}
                {index % Math.ceil(normalizedData.series.length / 12) === 0 && (
                  <text
                    x={point.x}
                    y={chartPadding.top + plotHeight + 20}
                    textAnchor="middle"
                    className="text-xs fill-muted-foreground"
                  >
                    {point.data.label}
                  </text>
                )}
              </g>
            ))}

            {/* Y-axis label */}
            <text
              x={15}
              y={chartHeight / 2}
              textAnchor="middle"
              className="text-xs fill-muted-foreground"
              transform={`rotate(-90, 15, ${chartHeight / 2})`}
            >
              Incident Count
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 text-xs text-muted-foreground">
          <p>
            Click any data point to filter dashboard and map to that period. Hover for
            comparisons.
          </p>
        </div>
      </CardContent>
    </Card >
  );
}
