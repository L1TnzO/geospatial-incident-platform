import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { RefreshCw, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import type { StrategicMonthlyTrendResponse } from '../../types/api/strategic';

interface StrategicTrendsChartProps {
  data: StrategicMonthlyTrendResponse | null;
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  onRefresh: () => void;
  onPeriodClick?: (month: string, startDate: string, endDate: string) => void;
}

export function StrategicTrendsChart({
  data,
  isLoading,
  isError,
  error,
  onRefresh,
  onPeriodClick,
}: StrategicTrendsChartProps) {
  const maxCount = useMemo(() => {
    if (!data?.series) return 0;
    return Math.max(...data.series.map((point) => point.count));
  }, [data]);

  const chartHeight = 280;
  const chartPadding = useMemo(() => ({ top: 20, right: 20, bottom: 40, left: 50 }), []);
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const plotWidth = 800 - chartPadding.left - chartPadding.right;

  const points = useMemo(() => {
    if (!data?.series || data.series.length === 0) return [];

    const stepX = plotWidth / (data.series.length - 1 || 1);
    return data.series.map((point, index) => {
      const x = chartPadding.left + index * stepX;
      const y = chartPadding.top + plotHeight - (point.count / maxCount) * plotHeight;
      return { x, y, data: point };
    });
  }, [data, maxCount, plotWidth, plotHeight, chartPadding]);

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
      onPeriodClick(point.data.month, point.data.start, point.data.end);
    }
  };

  const formatPercentage = (value: number | null | undefined) => {
    if (value == null) return 'N/A';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Multi-Month Trend Analysis</CardTitle>
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
          <CardTitle>Multi-Month Trend Analysis</CardTitle>
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

  if (!data || data.series.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Multi-Month Trend Analysis</CardTitle>
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
        <CardTitle>Multi-Month Trend Analysis</CardTitle>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {/* Summary metrics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Current Period Total</p>
            <p className="text-2xl font-semibold">
              {data.totals?.currentPeriodTotal?.toLocaleString() || '0'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Period-over-Period Change</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-semibold">
                {(data.totals?.periodDelta ?? 0) >= 0 ? '+' : ''}
                {data.totals?.periodDelta?.toLocaleString() || '0'}
              </p>
              {(data.totals?.periodDelta ?? 0) >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Percentage Change</p>
            <p
              className={`text-2xl font-semibold ${
                (data.totals?.periodPercentage ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatPercentage(data.totals?.periodPercentage)}
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
                    {'\n'}MoM: {formatPercentage(point.data.monthOverMonthPercentage)}
                    {'\n'}YoY: {formatPercentage(point.data.yearOverYearPercentage)}
                  </title>
                </circle>
                {/* X-axis labels */}
                {index % Math.ceil(data.series.length / 12) === 0 && (
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
            month-over-month and year-over-year comparisons.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
