import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { RefreshCw, AlertTriangle, Building2 } from 'lucide-react';
import type { StrategicStationVolumeResponse } from '../../types/api/strategic';

interface StationVolumeChartProps {
    data: StrategicStationVolumeResponse | null;
    isLoading: boolean;
    isError: boolean;
    error?: Error | null;
    onRefresh: () => void;
}

export function StationVolumeChart({
    data,
    isLoading,
    isError,
    error,
    onRefresh,
}: StationVolumeChartProps) {
    const sortedStations = useMemo(() => {
        if (!data?.stations) return [];
        // Take top 10 stations by volume
        return [...data.stations].sort((a, b) => b.count - a.count).slice(0, 10);
    }, [data]);

    const chartHeight = 400;
    const chartPadding = { top: 20, right: 20, bottom: 60, left: 180 };
    const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
    const plotWidth = 800 - chartPadding.left - chartPadding.right;

    const maxCount = useMemo(() => {
        if (!sortedStations || sortedStations.length === 0) return 100;
        const max = Math.max(...sortedStations.map((s) => s.count));
        return Math.ceil(max * 1.1); // 10% buffer
    }, [sortedStations]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Station Volume</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                        <span>Loading station volume data...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (isError) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Station Volume</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center h-64">
                        <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
                        <p className="text-sm text-muted-foreground mb-4">
                            {error?.message || 'Failed to load station volume data'}
                        </p>
                        <Button variant="secondary" size="sm" onClick={onRefresh}>
                            <RefreshCw className="h-4 w-4 mr-2" /> Retry
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data || sortedStations.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Station Volume</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <p>No station volume data available</p>
                        <p className="text-xs mt-2">Adjust filters or check back later</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const barHeight = Math.max(20, Math.min(30, plotHeight / sortedStations.length - 4));
    const groupSpacing = plotHeight / sortedStations.length;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Station Volume</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                        Top 10 stations by incident volume
                    </p>
                </div>
                <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <svg
                        width="800"
                        height={chartHeight}
                        className="w-full"
                        role="img"
                        aria-label="Station volume chart"
                    >
                        {/* X-axis grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                            const x = chartPadding.left + ratio * plotWidth;
                            const value = Math.round(maxCount * ratio);
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
                                        {value}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Bars for each station */}
                        {sortedStations.map((station, index) => {
                            const y = chartPadding.top + index * groupSpacing + groupSpacing / 2 - barHeight / 2;
                            const barWidth = (station.count / maxCount) * plotWidth;

                            // Truncate long labels
                            const label = station.stationName;
                            const displayLabel = label.length > 25 ? label.substring(0, 22) + '...' : label;

                            return (
                                <g key={index}>
                                    {/* Station label */}
                                    <text
                                        x={chartPadding.left - 10}
                                        y={y + barHeight / 2}
                                        textAnchor="end"
                                        alignmentBaseline="middle"
                                        className="text-xs fill-muted-foreground"
                                    >
                                        {displayLabel}
                                    </text>

                                    {/* Bar */}
                                    <rect
                                        x={chartPadding.left}
                                        y={y}
                                        width={Math.max(2, barWidth)}
                                        height={barHeight}
                                        fill="hsl(var(--primary))"
                                        fillOpacity="0.8"
                                        rx="2"
                                        className="cursor-pointer hover:fill-opacity-100 transition-all"
                                    >
                                        <title>
                                            {label}
                                            {'\n'}Incidents: {station.count}
                                            {'\n'}Percentage: {station.percentage}%
                                        </title>
                                    </rect>

                                    {/* Value Label */}
                                    <text
                                        x={Math.min(chartPadding.left + barWidth + 8, chartPadding.left + plotWidth - 30)}
                                        y={y + barHeight / 2}
                                        alignmentBaseline="middle"
                                        className="text-[10px] font-medium fill-foreground"
                                    >
                                        {station.count}
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
                            Incident Count
                        </text>
                    </svg>
                </div>

                {sortedStations.length < (data?.stations.length || 0) && (
                    <div className="mt-2 text-xs text-muted-foreground italic">
                        Showing top 10 of {data?.stations.length} total stations
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
