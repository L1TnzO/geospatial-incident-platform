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
import { AlertCircle } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { StrategicZoneFrequencyResponse } from '../../types/api/strategic';

interface ZoneFrequencyTableProps {
    query: UseQueryResult<StrategicZoneFrequencyResponse, unknown>;
}

export function ZoneFrequencyTable({ query }: ZoneFrequencyTableProps) {
    const { data, isLoading, isError, error } = query;

    if (isError) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Zone Frequency</CardTitle>
                    <CardDescription>Incidents by zone</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load zone frequency data: {(error as Error).message}
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Zone Frequency</CardTitle>
                <CardDescription>
                    Zones with the highest frequency of incidents
                </CardDescription>
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
                                    <TableHead className="text-right">Count</TableHead>
                                    <TableHead className="text-right">%</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.zones.map((zone) => (
                                    <TableRow key={zone.name}>
                                        <TableCell className="font-medium">{zone.name}</TableCell>
                                        <TableCell className="text-right">{zone.count}</TableCell>
                                        <TableCell className="text-right">
                                            {zone.percentage.toFixed(1)}%
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!data?.zones.length && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                                            No data available
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
