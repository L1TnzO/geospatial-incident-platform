import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

import { Button } from '../ui/button';
import { RefreshCw, AlertTriangle, MapPin, AlertCircle } from 'lucide-react';
import type { StrategicPriorityScoreResponse, PriorityScoreGroup } from '../../types/api/strategic';

interface PriorityZonesPanelProps {
  data: StrategicPriorityScoreResponse | null;
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  onRefresh: () => void;
  onViewOnMap?: (zone: PriorityScoreGroup) => void;
}

export function PriorityZonesPanel({
  data,
  isLoading,
  isError,
  error,
  onRefresh,
  onViewOnMap,
}: PriorityZonesPanelProps) {
  const topZones = useMemo(() => {
    if (!data?.groups) return [];
    return [...data.groups].sort((a, b) => b.normalizedScore - a.normalizedScore).slice(0, 10);
  }, [data]);

  const getRiskLevel = (normalizedScore: number): { level: string; className: string } => {
    if (normalizedScore >= 0.8) return { level: 'Critical', className: 'bg-red-600 text-white' };
    if (normalizedScore >= 0.6) return { level: 'High', className: 'bg-orange-500 text-white' };
    if (normalizedScore >= 0.4) return { level: 'Medium', className: 'bg-yellow-500 text-black' };
    return { level: 'Low', className: 'bg-green-600 text-white' };
  };

  const getRecommendation = (zone: PriorityScoreGroup): string => {
    if (zone.normalizedScore >= 0.8) {
      return 'Immediate resource allocation recommended. Consider temporary station or increased patrol frequency.';
    }
    if (zone.normalizedScore >= 0.6) {
      return 'Monitor closely. Plan for increased coverage during peak incident periods.';
    }
    if (zone.normalizedScore >= 0.4) {
      return 'Adequate coverage. Continue regular monitoring and resource planning.';
    }
    return 'Coverage appears sufficient. Maintain current allocation strategy.';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Priority Zones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading priority zones...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Priority Zones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64">
            <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              {error?.message || 'Failed to load priority zones'}
            </p>
            <Button variant="secondary" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || topZones.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Priority Zones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p>No priority zones identified</p>
            <p className="text-xs mt-2">Adjust filters or check back later</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Priority Zones</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Top 10 high-risk areas • Grouped by {data.metadata.groupBy}
            {data.metadata.decayHalfLifeDays &&
              ` • Decay: ${data.metadata.decayHalfLifeDays}d half-life`}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-y-auto pr-4 border rounded-md" style={{ height: '400px' }}>
          <div className="space-y-3">
            {topZones.map((zone, index) => {
              const risk = getRiskLevel(zone.normalizedScore);
              const label =
                zone.groupType === 'station' && zone.station
                  ? zone.station.name
                  : zone.groupType === 'grid' && zone.cell
                    ? `Grid Cell ${zone.cell.cellId.slice(-8)}`
                    : 'Unknown Zone';

              return (
                <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{label}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${risk.className}`}>
                          {risk.level}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm mt-2">
                        <div>
                          <p className="text-muted-foreground text-xs">Incidents</p>
                          <p className="font-medium">{zone.totalIncidents}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Risk Score</p>
                          <p className="font-medium">{(zone.normalizedScore * 100).toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Avg Severity</p>
                          <p className="font-medium">{zone.averageSeverity.toFixed(1)}</p>
                        </div>
                      </div>
                    </div>
                    {onViewOnMap && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewOnMap(zone)}
                        className="ml-4"
                      >
                        <MapPin className="h-4 w-4 mr-1" />
                        View on Map
                      </Button>
                    )}
                  </div>

                  {/* Recommendation */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p>{getRecommendation(zone)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary footer */}
        <div className="mt-6 pt-4 border-t text-xs text-muted-foreground">
          <p>
            Showing top 10 of {data.metadata.totalGroups} total zones. Risk scores are calculated
            using severity-weighted incident density
            {data.metadata.decayHalfLifeDays && ' with time decay'}.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
