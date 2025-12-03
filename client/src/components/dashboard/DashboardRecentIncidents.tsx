import { useCallback } from 'react';
import { MapPin, FileText } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { useMapStore } from '../../store/map-store';
import { useIncidentDetailStore } from '../../store/incident-detail-store';
import type { UseDashboardRecentIncidentsResult } from '../../hooks/useDashboardRecentIncidents';
import type { RecentIncident } from '../../types/api/dashboard';
import type { Incident } from '../../types';

interface DashboardRecentIncidentsProps {
  recentQuery: UseDashboardRecentIncidentsResult;
}

const DEFAULT_DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

// Convert dashboard incident to legacy Incident format for detail modal
const toIncident = (incident: RecentIncident): Incident => {
  const coordinates = incident.location?.geometry?.coordinates;
  const [lng, lat] = Array.isArray(coordinates) ? coordinates : [0, 0];

  return {
    id: incident.incidentNumber,
    type: incident.type.name,
    severity: incident.severity.name,
    severityCode: incident.severity.code,
    severityColor: incident.severity.colorHex,
    date: incident.occurrenceAt,
    timestamp: incident.reportedAt,
    reportedAt: incident.reportedAt,
    occurrenceAt: incident.occurrenceAt,
    location: {
      lat: Number(lat) || 0,
      lng: Number(lng) || 0,
      address: '',
    },
    description: incident.title,
    status: incident.status.name,
    isActive: incident.isActive,
    narrative: null,
    metadata: {},
  };
};

export function DashboardRecentIncidents({ recentQuery }: DashboardRecentIncidentsProps) {
  const { data, isLoading, isError, error, refresh } = recentQuery;
  const setView = useMapStore((state) => state.setView);
  const openIncident = useIncidentDetailStore((state) => state.openIncident);

  const handleViewOnMap = useCallback(
    (incident: RecentIncident) => {
      const coordinates = incident.location?.geometry?.coordinates;
      if (Array.isArray(coordinates) && coordinates.length >= 2) {
        const [longitude, latitude] = coordinates.map(Number);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setView([latitude, longitude], 14);
          // Update selected incident in store for highlighting
          const legacyIncident = toIncident(incident);
          useIncidentDetailStore.setState({
            selectedIncident: legacyIncident,
            isOpen: false,
          });
        }
      }
    },
    [setView],
  );

  const handleOpenDetails = useCallback(
    (incident: RecentIncident) => {
      const legacyIncident = toIncident(incident);
      const coordinates = incident.location?.geometry?.coordinates;

      // Center map if coordinates available
      if (Array.isArray(coordinates) && coordinates.length >= 2) {
        const [longitude, latitude] = coordinates.map(Number);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setView([latitude, longitude], 14);
        }
      }

      openIncident(legacyIncident);
    },
    [openIncident, setView],
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between">
          <span>{error?.message || 'Failed to load recent incidents'}</span>
          <Button variant="outline" size="sm" onClick={() => refresh()}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No recent incidents match your filters. Try adjusting the filter criteria.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="overflow-y-auto pr-4 border rounded-md" style={{ height: '400px' }}>
      <div className="grid gap-3 p-1">
        {data.map((incident) => {
          const reportedDate = new Date(incident.reportedAt);
          const reportedLabel = Number.isNaN(reportedDate.getTime())
            ? 'Unknown'
            : DEFAULT_DATE_FORMAT.format(reportedDate);

          const coordinates = incident.location?.geometry?.coordinates;
          const hasCoordinates = Array.isArray(coordinates) && coordinates.length >= 2;

          const stationLabel = incident.primaryStation
            ? `${incident.primaryStation.name} (${incident.primaryStation.stationCode})`
            : 'No station assigned';

          return (
            <Card key={incident.incidentNumber} className="hover:bg-accent/50 transition-colors">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        style={{
                          backgroundColor: incident.severity.colorHex,
                          color: '#ffffff',
                        }}
                      >
                        {incident.severity.name}
                      </Badge>
                      <span className="text-sm font-mono text-muted-foreground">
                        {incident.incidentNumber}
                      </span>
                    </div>
                    <Badge variant="outline">{incident.status.name}</Badge>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-base leading-snug">{incident.title}</h3>

                  {/* Metadata */}
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{incident.type.name}</span>
                      <span>•</span>
                      <span>{stationLabel}</span>
                    </div>
                    <time dateTime={incident.reportedAt}>Reported {reportedLabel}</time>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewOnMap(incident)}
                      disabled={!hasCoordinates}
                      className="flex-1"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      View on Map
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleOpenDetails(incident)}
                      className="flex-1"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
