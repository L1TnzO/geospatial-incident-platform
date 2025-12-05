import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';
import type { UseStrategicTimeOfDayResult } from '../../hooks/useStrategicTimeOfDay';

interface StrategicTimeOfDayChartProps {
    query: UseStrategicTimeOfDayResult;
}

export function StrategicTimeOfDayChart({ query }: StrategicTimeOfDayChartProps) {
    const { data, isLoading, isError, error, refresh, lastUpdated } = query;

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
                    <Skeleton className="h-[250px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (isError) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Time of Day</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertDescription className="flex items-center justify-between">
                            <span>{error?.message || 'Failed to load data'}</span>
                            <Button variant="outline" size="sm" onClick={handleRefresh}>
                                Retry
                            </Button>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    const total = data?.total || 0;
    const chartData = [
        { name: 'Morning (06-12)', count: data?.morning || 0 },
        { name: 'Afternoon (12-20)', count: data?.afternoon || 0 },
        { name: 'Night (20-06)', count: data?.night || 0 },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Time of Day Distribution</CardTitle>
                <CardDescription>Incidents by time slot · {total.toLocaleString()} total</CardDescription>
            </CardHeader>
            <CardContent>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
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
                                width={120}
                                tick={{ fontSize: 12 }}
                                interval={0}
                            />
                            <Tooltip
                                formatter={(value: number) => [value.toLocaleString(), 'Incidents']}
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
