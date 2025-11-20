import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Loader2, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { useIncidentDetailStore } from '../store/incident-detail-store';
import { useIncidentDetail } from '../hooks/useIncidentDetail';
import { useReverseGeocode } from '../hooks/useReverseGeocode';
import type {
  Incident,
  IncidentAssetSummary,
  IncidentNoteSummary,
  IncidentUnitSummary,
} from '../types';

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const resolveIncidentId = (incident: Incident | null): string | null => {
  if (!incident) {
    return null;
  }
  if (incident.id) {
    return incident.id;
  }
  const fallback = (incident as unknown as { incidentNumber?: string }).incidentNumber;
  return fallback ?? null;
};

export function IncidentDetailModal() {
  const { selectedIncident, isOpen, closeIncident } = useIncidentDetailStore();
  const incidentId = resolveIncidentId(selectedIncident ?? null);
  const detailQuery = useIncidentDetail(incidentId ?? undefined);

  const incident: Incident | null = useMemo(() => {
    if (detailQuery.data) {
      return detailQuery.data;
    }
    return selectedIncident ?? null;
  }, [detailQuery.data, selectedIncident]);

  const coordinates = incident?.location;
  const hasCoordinates =
    typeof coordinates?.lat === 'number' && typeof coordinates?.lng === 'number';
  const reportedAddress = coordinates?.address?.trim();
  const normalizedReportedAddress = reportedAddress &&
    !/unknown|unavailable|no data/i.test(reportedAddress)
      ? reportedAddress
      : '';

  const reverseGeocodeQuery = useReverseGeocode({
    lat: hasCoordinates ? coordinates?.lat : undefined,
    lng: hasCoordinates ? coordinates?.lng : undefined,
    enabled: isOpen && hasCoordinates,
  });

  const resolvedAddress =
    reverseGeocodeQuery.data?.shortLabel || reverseGeocodeQuery.data?.displayName || '';

  const locationLabel = (() => {
    if (normalizedReportedAddress) {
      return normalizedReportedAddress;
    }
    if (reverseGeocodeQuery.isLoading && hasCoordinates) {
      return 'Loading location…';
    }
    if (resolvedAddress) {
      return resolvedAddress;
    }
    return 'Location unavailable';
  })();

  const googleMapsUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${coordinates?.lat},${coordinates?.lng}`
    : null;

  const units = incident?.units ?? [];
  const assets = incident?.assets ?? [];
  const notes = incident?.notes ?? [];

  const isInitialLoading = detailQuery.isLoading && !detailQuery.data;
  const isRefetching = detailQuery.isFetching && !!detailQuery.data;
  const detailError = detailQuery.isError
    ? (detailQuery.error?.message ?? 'Unable to load details.')
    : undefined;

  if (!isOpen || !selectedIncident) {
    return null;
  }

  const severityColor = incident?.severityColor
    ? {
        backgroundColor: `${incident.severityColor}22`,
        borderColor: incident.severityColor,
      }
    : undefined;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) {
          closeIncident();
        }
      }}
    >
      <DialogContent className="w-[95vw] max-w-[1600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex flex-col gap-1">
              <span className="text-2xl font-bold">{incident?.id ?? incidentId ?? 'Incident'}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {incident?.type || 'Incident Details'}
              </span>
            </DialogTitle>
            {(isInitialLoading || isRefetching) && (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            )}
          </div>
        </DialogHeader>

        {isInitialLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>Loading incident detail…</p>
          </div>
        )}

        {!isInitialLoading && detailError && !incident?.metadata && (
          <div className="flex flex-col items-center gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Failed to load incident detail</p>
              <p className="text-sm text-muted-foreground">{detailError}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => detailQuery.refetch()}
            >
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
          </div>
        )}

        {incident && !isInitialLoading && (
          <div className="space-y-6">
            {/* Status and Severity - Prominent at top */}
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-base py-1 px-3">
                {incident.status}
              </Badge>
              <Badge variant="outline" style={severityColor} className="text-base py-1 px-3">
                {incident.severity}
              </Badge>
            </div>

            {/* Key Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-4 rounded-lg">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                  Time Reported
                </p>
                <p className="text-base font-medium">
                  {formatDateTime(incident.reportedAt ?? incident.timestamp)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                  Time Occurred
                </p>
                <p className="text-base font-medium">{formatDateTime(incident.occurrenceAt)}</p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                  Location
                </p>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-base font-medium">{locationLabel}</p>
                  {googleMapsUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                        Go to Location <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    Coordinates: {incident.location.lat.toFixed(4)},{' '}
                    {incident.location.lng.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">Description</p>
              <p className="text-base leading-relaxed">{incident.description}</p>
            </div>

            {/* Narrative - Most important for managers */}
            {incident.narrative && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Incident Narrative</p>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap text-base leading-relaxed">
                    {incident.narrative}
                  </p>
                </div>
              </div>
            )}

            {/* Response Units */}
            {units.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Response Units</p>
                <IncidentUnitsTable units={units} />
              </div>
            )}

            {/* Assets */}
            {assets.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Equipment & Assets</p>
                <IncidentAssetsTable assets={assets} />
              </div>
            )}

            {/* Field Notes */}
            {notes.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Field Notes</p>
                <IncidentNotesList notes={notes} />
              </div>
            )}

            {detailError && incident.metadata && (
              <>
                <Separator />
                <div className="flex items-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <div className="flex-1">
                    <p className="font-medium text-destructive">Some details may be stale</p>
                    <p className="text-muted-foreground">{detailError}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => detailQuery.refetch()}
                  >
                    <RefreshCw className="h-4 w-4" /> Retry
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const IncidentUnitsTable = ({ units }: { units: IncidentUnitSummary[] }) => (
  <div className="rounded-lg border overflow-hidden">
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold min-w-[200px]">Station</TableHead>
            <TableHead className="font-semibold min-w-[120px]">Role</TableHead>
            <TableHead className="font-semibold min-w-[150px]">Dispatched</TableHead>
            <TableHead className="font-semibold min-w-[150px]">Cleared</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {units.map((unit) => (
            <TableRow key={`${unit.stationCode}-${unit.assignmentRole ?? 'role'}`}>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{unit.stationName}</span>
                  <span className="text-xs text-muted-foreground">{unit.stationCode}</span>
                </div>
              </TableCell>
              <TableCell>{unit.assignmentRole ?? '—'}</TableCell>
              <TableCell className="text-sm whitespace-nowrap">
                {formatDateTime(unit.dispatchedAt)}
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap">
                {formatDateTime(unit.clearedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </div>
);

const IncidentAssetsTable = ({ assets }: { assets: IncidentAssetSummary[] }) => (
  <div className="rounded-lg border overflow-hidden">
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold min-w-[140px]">Equipment ID</TableHead>
            <TableHead className="font-semibold min-w-[120px]">Type</TableHead>
            <TableHead className="font-semibold min-w-[100px]">Status</TableHead>
            <TableHead className="font-semibold min-w-[200px]">Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => (
            <TableRow key={asset.assetIdentifier}>
              <TableCell className="font-medium">{asset.assetIdentifier}</TableCell>
              <TableCell>{asset.assetType}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs whitespace-nowrap">
                  {asset.status ?? 'Unknown'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                <div className="max-w-md break-words">{asset.notes ?? '—'}</div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </div>
);

const IncidentNotesList = ({ notes }: { notes: IncidentNoteSummary[] }) => (
  <div className="space-y-3">
    {notes.map((note) => (
      <div key={`${note.author}-${note.createdAt}`} className="rounded-lg border bg-muted/20 p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="font-medium text-sm">{note.author}</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDateTime(note.createdAt)}
          </span>
        </div>
        <p className="text-base leading-relaxed">{note.note}</p>
      </div>
    ))}
  </div>
);
