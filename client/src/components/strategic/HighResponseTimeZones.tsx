import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle, ArrowUpRight } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import type { UseStrategicResponseTimesResult } from '../../hooks/useStrategicResponseTimes';

interface HighResponseTimeZonesProps {
    query: UseStrategicResponseTimesResult;
}

export function HighResponseTimeZones({ query }: HighResponseTimeZonesProps) {
    const { data, isLoading, isError, error } = query;
    const [useAllTime, setUseAllTime] = useState(false);

    if (isError) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>High Response Time Zones</CardTitle>
                    <CardDescription>Zones exceeding average response time</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load response time data: {(error as Error).message}
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    const globalAverage = useAllTime
        ? (data?.metadata.allTimeAverageSeconds || 0)
        : (data?.metadata.globalAverageSeconds || 0);

    // Filter zones with average response time > selected average
    const highResponseZones = data?.groups
        .filter(g => g.groupType === 'zone' && g.averageSeconds > globalAverage)
        .sort((a, b) => b.averageSeconds - a.averageSeconds) || [];

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                    <CardTitle>High Response Time Zones</CardTitle>
                    <CardDescription>
                        Zones above {useAllTime ? 'all-time' : 'period'} average ({formatTime(globalAverage)})
                    </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                    <Switch
                        id="all-time-mode"
                        checked={useAllTime}
                        onCheckedChange={setUseAllTime}
                    />
                    <Label htmlFor="all-time-mode" className="text-xs">Global Avg</Label>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                ) : (
                    <div className="overflow-y-auto pr-4 border rounded-md" style={{ height: '400px' }}>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Zone</TableHead>
                                    <TableHead className="text-right">Avg Time</TableHead>
                                    <TableHead className="text-right">Diff</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {highResponseZones.map((group) => {
                                    const diff = group.averageSeconds - globalAverage;
                                    const diffPercent = globalAverage > 0 ? (diff / globalAverage) * 100 : 0;

                                    return (
                                        <TableRow key={group.zoneName}>
                                            <TableCell className="font-medium">{group.zoneName}</TableCell>
                                            <TableCell className="text-right">{formatTime(group.averageSeconds)}</TableCell>
                                            <TableCell className="text-right text-destructive">
                                                <div className="flex items-center justify-end gap-1">
                                                    +{formatTime(diff)} ({diffPercent.toFixed(0)}%)
                                                    <ArrowUpRight className="h-3 w-3" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {!highResponseZones.length && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                                            No zones found exceeding the {useAllTime ? 'all-time' : 'period'} average.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
