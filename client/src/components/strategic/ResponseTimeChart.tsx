import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { RefreshCw, AlertTriangle, Info } from 'lucide-react';
import type { StrategicResponseMetricsResponse } from '../../types/api/strategic';

interface ResponseTimeChartProps {
  data: StrategicResponseMetricsResponse | null;
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  onRefresh: () => void;
}

export function ResponseTimeChart({
  data,
  isLoading,
  isError,
  error,
  onRefresh,
}: ResponseTimeChartProps) {
  const sortedGroups = useMemo(() => {
    if (!data?.groups) return [];
    // Take top 15 groups by average response time (worst performers)
    return [...data.groups].sort((a, b) => b.averageSeconds - a.averageSeconds).slice(0, 15);
  }, [data]);

  const chartHeight = 400;
  const chartPadding = { top: 20, right: 20, bottom: 60, left: 180 };
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const plotWidth = 800 - chartPadding.left - chartPadding.right;

  const { minSeconds, maxSeconds } = useMemo(() => {
    if (!sortedGroups || sortedGroups.length === 0) return { minSeconds: 0, maxSeconds: 600 };

    const values = sortedGroups.map((g) => g.averageSeconds);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values); // Use average for max since we focus on average now

    // Dynamic scaling: Start at 90% of min to show differences
    // But ensure we don't zoom in too much on very small values (keep 0 if min is small)
    const lowerBound = minVal > 60 ? minVal * 0.9 : 0;
    const upperBound = maxVal * 1.05; // 5% buffer on top

    return { minSeconds: lowerBound, maxSeconds: upperBound };
  }, [sortedGroups]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Response Time Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading response time data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Response Time Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64">
            <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              {error?.message || 'Failed to load response time data'}
            </p>
            <Button variant="secondary" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || sortedGroups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Response Time Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p>No response time data available</p>
            <p className="text-xs mt-2">Adjust filters or check back later</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const barHeight = Math.max(20, Math.min(30, plotHeight / sortedGroups.length - 4));
  const groupSpacing = plotHeight / sortedGroups.length;
  const timeRange = maxSeconds - minSeconds;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Response Time Analysis</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Top 15 {data.metadata.groupBy === 'station' ? 'stations' : 'zones'} by average response time
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <svg
            width="800"
            height={chartHeight}
            className="w-full"
            role="img"
            aria-label="Response time chart"
          >
            {/* X-axis grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const x = chartPadding.left + ratio * plotWidth;
              const timeValue = minSeconds + timeRange * ratio;
              return (
                <g key={ratio}>
                  <line
                    x1={x}
                    y1={chartPadding.top}
                    x2={x}
                    y2={chartPadding.top + plotHeight}
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-border opacity-30"
                  />
                  <text
                    x={x}
                    y={chartPadding.top + plotHeight + 20}
                    textAnchor="middle"
                    className="text-xs fill-muted-foreground"
                  >
                    {formatTime(timeValue)}
                  </text>
                </g>
              );
            })}

            {/* Bars for each group */}
            {sortedGroups.map((group, index) => {
              const y = chartPadding.top + index * groupSpacing + groupSpacing / 2 - barHeight / 2;

              const getX = (val: number) => {
                const normalized = (val - minSeconds) / timeRange;
                return chartPadding.left + Math.max(0, Math.min(1, normalized)) * plotWidth;
              };

              const avgX = getX(group.averageSeconds);
              const p90X = getX(group.p90Seconds);

              const label =
                group.groupType === 'station' && group.station
                  ? group.station.name
                  : group.groupType === 'grid' && group.cell
                    ? `Cell ${group.cell.cellId.slice(-8)}`
                    : 'Unknown';

              const isInsufficient = group.insufficientSample;

              // Truncate long labels
              const displayLabel = label.length > 25 ? label.substring(0, 22) + '...' : label;

              return (
                <g key={index} opacity={isInsufficient ? 0.5 : 1}>
                  {/* Group label */}
                  <text
                    x={chartPadding.left - 10}
                    y={y + barHeight / 2}
                    textAnchor="end"
                    alignmentBaseline="middle"
                    className="text-xs fill-muted-foreground"
                  >
                    {displayLabel}
                    {isInsufficient && ' *'}
                  </text>

                  {/* Average Bar */}
                  <rect
                    x={chartPadding.left}
                    y={y}
                    width={Math.max(2, avgX - chartPadding.left)}
                    height={barHeight}
                    fill="hsl(var(--primary))"
                    fillOpacity="0.8"
                    rx="2"
                    className="cursor-pointer hover:fill-opacity-100 transition-all"
                  >
                    <title>
                      {label}
                      {'\n'}Average: {formatTime(group.averageSeconds)}
                      {'\n'}90th Percentile: {formatTime(group.p90Seconds)}
                      {'\n'}Sample size: {group.sampleSize}
                      {isInsufficient ? '\n(Insufficient sample)' : ''}
                    </title>
                  </rect>

                  {/* P90 Marker (Whisker) */}
                  {group.p90Seconds >= minSeconds && group.p90Seconds <= maxSeconds && (
                    <line
                      x1={p90X}
                      y1={y + barHeight * 0.2}
                      x2={p90X}
                      y2={y + barHeight * 0.8}
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                  )}

                  {/* P90 Connector Line */}
                  {group.p90Seconds >= minSeconds && group.p90Seconds <= maxSeconds && (
                    <line
                      x1={avgX}
                      y1={y + barHeight / 2}
                      x2={p90X}
                      y2={y + barHeight / 2}
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      opacity="0.5"
                    />
                  )}

                  {/* Value Label */}
                  <text
                    x={Math.min(avgX + 8, chartPadding.left + plotWidth - 30)}
                    y={y + barHeight / 2}
                    alignmentBaseline="middle"
                    className="text-[10px] font-medium fill-foreground"
                  >
                    {formatTime(group.averageSeconds)}
                  </text>
                </g>
              );
            })}

            {/* X-axis label */}
            <text
              x={chartPadding.left + plotWidth / 2}
              y={chartHeight - 10}
              textAnchor="middle"
              className="text-xs fill-muted-foreground"
            >
              Response Time (mm:ss)
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-start gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-4 bg-primary opacity-30 border border-primary rounded" />
            <span>Median to 90th percentile</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-destructive rounded" />
            <span>Average response time</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded-full" />
            <span>Median & 90th percentile markers</span>
          </div>
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <span>* Low sample size (n &lt; {data.metadata.sampleThreshold})</span>
          </div>
        </div>

        {sortedGroups.length < (data?.groups.length || 0) && (
          <div className="mt-2 text-xs text-muted-foreground italic">
            Showing top 15 of {data?.groups.length} total{' '}
            {data.metadata.groupBy === 'station' ? 'stations' : 'zones'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
