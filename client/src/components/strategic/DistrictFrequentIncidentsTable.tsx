import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Badge } from "../ui/badge";
import { Loader2 } from "lucide-react";
import { useStrategicDistrictFrequentIncidents } from "../../hooks/useStrategicDistrictFrequentIncidents";
import { Button } from "../ui/button";

interface DistrictFrequentIncidentsTableProps {
    query: ReturnType<typeof useStrategicDistrictFrequentIncidents>;
}

export function DistrictFrequentIncidentsTable({ query }: DistrictFrequentIncidentsTableProps) {
    const { data, isLoading, isError, error, refresh } = query;

    if (isError) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>District Frequent Incidents</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center">
                        <p className="text-sm text-red-500">
                            {(error as Error)?.message || "Failed to load data"}
                        </p>
                        <Button variant="outline" size="sm" onClick={() => refresh()}>
                            Try Again
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="col-span-1 lg:col-span-2 xl:col-span-3">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Frequent Incidents by District</CardTitle>
                        <CardDescription>
                            Most common incident type reported in each district/commune
                        </CardDescription>
                    </div>
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-y-auto pr-2" style={{ height: '400px' }}>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>District</TableHead>
                                <TableHead>Most Frequent Type</TableHead>
                                <TableHead className="text-right">Count</TableHead>
                                <TableHead className="text-right">Dominance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && !data
                                ? Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                                        <TableCell className="text-right"><div className="h-4 w-12 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                                        <TableCell className="text-right"><div className="h-4 w-12 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                                : data?.items.map((item) => (
                                    <TableRow key={item.district}>
                                        <TableCell className="font-medium">{item.district}</TableCell>
                                        <TableCell>{item.mostFrequentType}</TableCell>
                                        <TableCell className="text-right">{item.count}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="secondary" className="font-mono">
                                                {item.percentage}%
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            {!isLoading && data?.items.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No data available for the selected period
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
