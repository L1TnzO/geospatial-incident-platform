
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { RefreshCw, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface IncidentProjectionTableProps {
    query: any; // Type from useStrategicProjections
}

export function IncidentProjectionTable({ query }: IncidentProjectionTableProps) {
    const { data, isLoading, isError, error, refresh } = query;

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Future Projections</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-48 text-muted-foreground">
                        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                        <span>Calculating projections...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (isError) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Future Projections</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center h-48">
                        <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
                        <p className="text-sm text-muted-foreground mb-4">
                            {error?.message || 'Failed to load projection data'}
                        </p>
                        <Button variant="secondary" size="sm" onClick={refresh}>
                            <RefreshCw className="h-4 w-4 mr-2" /> Retry
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data) {
        return null;
    }

    const { periods, metadata } = data;
    const isPositiveTrend = metadata.trendSlope > 0;

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                        <CardTitle>Incident Projections</CardTitle>
                        {metadata.trendSlope !== 0 && (
                            <Badge variant={isPositiveTrend ? "destructive" : "secondary"} className="flex items-center gap-1">
                                {isPositiveTrend ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {isPositiveTrend ? "Rising Trend" : "Falling Trend"}
                            </Badge>
                        )}
                    </div>
                    <CardDescription>
                        Estimated incident counts based on linear regression of historical data ({metadata.totalMonths} months).
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time Horizon</TableHead>
                            <TableHead className="text-right">Projected Cumulative Count</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {periods.map((period: any) => (
                            <TableRow key={period.label}>
                                <TableCell className="font-medium">{period.label}</TableCell>
                                <TableCell className="text-right font-bold text-lg">
                                    {period.projectedCount.toLocaleString()}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <div className="mt-4 text-xs text-muted-foreground">
                    Based on linear regression (y = {metadata.trendSlope}x + {metadata.trendIntercept}).
                    Data range: {new Date(metadata.baseStart).toLocaleDateString()} - {new Date(metadata.baseEnd).toLocaleDateString()}.
                </div>
            </CardContent>
        </Card>
    );
}
