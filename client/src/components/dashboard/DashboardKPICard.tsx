import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import type { UseDashboardLast24HoursKpiResult } from '../../hooks/useDashboardLast24HoursKpi';

interface DashboardKPICardProps {
    kpiQuery: UseDashboardLast24HoursKpiResult;
    title: string;
    description: string;
    comparisonLabel: string;
}

const countFormatter = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
});

const signedFormatter = new Intl.NumberFormat(undefined, {
    signDisplay: 'always',
    maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat(undefined, {
    signDisplay: 'always',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

type TrendDirection = 'up' | 'down' | 'flat';

const getTrendDirection = (delta: number): TrendDirection => {
    if (delta > 0) return 'up';
    if (delta < 0) return 'down';
    return 'flat';
};

const getTrendIcon = (direction: TrendDirection) => {
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

const formatWindow = (start: string, end: string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleString()} – ${endDate.toLocaleString()}`;
};

export function DashboardKPICard({
    kpiQuery,
    title,
    description,
    comparisonLabel,
}: DashboardKPICardProps) {
    const { data, isLoading, isError, error, refresh } = kpiQuery;

    const handleRefresh = async () => {
        await refresh(true);
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <div role="status" aria-live="polite">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div aria-hidden="true">
                        <Skeleton className="h-12 w-32" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (isError) {
        return (
            <Alert variant="destructive">
                <AlertDescription className="flex items-center justify-between">
                    <span>{error?.message || 'Failed to load KPI data'}</span>
                    <Button variant="outline" size="sm" onClick={handleRefresh}>
                        Retry
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    if (!data) {
        return (
            <Alert>
                <AlertDescription>No data available for this period.</AlertDescription>
            </Alert>
        );
    }

    const direction = getTrendDirection(data.delta);
    const deltaText = signedFormatter.format(data.delta);
    const percentageText =
        data.deltaPercentage === null ? 'N/A' : `${percentageFormatter.format(data.deltaPercentage)}%`;

    const trendVariant =
        direction === 'up' ? 'destructive' : direction === 'down' ? 'default' : 'secondary';

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="text-4xl font-bold">{countFormatter.format(data.currentCount)}</div>

                <div className="flex items-center gap-2">
                    <Badge variant={trendVariant} className="flex items-center gap-1">
                        {getTrendIcon(direction)}
                        <span>{percentageText}</span>
                    </Badge>
                    <span className="text-sm font-medium">{deltaText}</span>
                    <span className="text-sm text-muted-foreground">{comparisonLabel}</span>
                </div>

                <p className="text-sm text-muted-foreground">
                    Previous period: {countFormatter.format(data.previousCount)} incidents
                    <br />
                    {formatWindow(data.previousWindow.start, data.previousWindow.end)}
                </p>

                {kpiQuery.lastUpdated && (
                    <p className="text-xs text-muted-foreground">
                        Last updated: {new Date(kpiQuery.lastUpdated).toLocaleString()}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
