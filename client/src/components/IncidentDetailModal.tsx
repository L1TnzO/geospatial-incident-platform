import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Loader2, AlertTriangle, RefreshCw, ExternalLink, X } from 'lucide-react';
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
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch (e) {
    return value || '—';
  }
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

  // Protección robusta de coordenadas
  const lat = typeof coordinates?.lat === 'number' ? coordinates.lat : Number(coordinates?.lat);
  const lng = typeof coordinates?.lng === 'number' ? coordinates.lng : Number(coordinates?.lng);
  const hasCoordinates = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

  const reverseGeocodeQuery = useReverseGeocode({
    lat: hasCoordinates ? lat : undefined,
    lng: hasCoordinates ? lng : undefined,
    enabled: isOpen && hasCoordinates,
  });

  const resolvedAddress =
    reverseGeocodeQuery.data?.shortLabel || reverseGeocodeQuery.data?.displayName || '';

  const locationLabel = (() => {
    const metaAddress = (incident?.metadata as any)?.generated_address;
    if (metaAddress) return metaAddress;

    if (reverseGeocodeQuery.isLoading && hasCoordinates) {
      return 'Loading location…';
    }
    if (resolvedAddress) {
      return resolvedAddress;
    }
    return 'Location unavailable';
  })();

  const googleMapsUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : null;

  // --- ADAPTADORES DE DATOS ---
  const meta = (incident?.metadata as any) || {};

  const units: IncidentUnitSummary[] = useMemo(() => {
    if (incident?.units && incident.units.length > 0) return incident.units;
    if (meta.response_units && Array.isArray(meta.response_units)) {
      return meta.response_units.map((u: any) => ({
        stationCode: u.station_code,
        stationName: u.station_code,
        assignmentRole: u.role,
        dispatchedAt: u.dispatched_at,
        clearedAt: u.cleared_at
      }));
    }
    return [];
  }, [incident?.units, meta.response_units]);

  const assets: IncidentAssetSummary[] = useMemo(() => {
    if (incident?.assets && incident.assets.length > 0) return incident.assets;
    if (meta.equipment_assets && Array.isArray(meta.equipment_assets)) {
      return meta.equipment_assets.map((a: any) => ({
        assetIdentifier: a.assetIdentifier,
        assetType: a.assetType,
        status: a.status,
        notes: a.notes
      }));
    }
    if (typeof meta.equipment_assets === 'string' && meta.equipment_assets.length > 0) {
      return [{
        assetIdentifier: 'Legacy Assets',
        assetType: 'Equipment',
        status: 'Active',
        notes: meta.equipment_assets
      }];
    }
    return [];
  }, [incident?.assets, meta.equipment_assets]);

  const notes: IncidentNoteSummary[] = useMemo(() => {
    if (incident?.notes && incident.notes.length > 0) return incident.notes;
    if (meta.field_notes && Array.isArray(meta.field_notes)) {
      return meta.field_notes.map((n: any) => ({
        author: n.author || 'Operator',
        note: n.note,
        createdAt: n.createdAt || new Date().toISOString()
      }));
    }
    return [];
  }, [incident?.notes, meta.field_notes]);

  const displayTitle = (incident as any)?.title || (incident as any)?.description || incident?.id || 'Incident';
  const renderDescription = (incident as any)?.title || (incident as any)?.description;

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
      <DialogContent
        className="flex flex-col p-0 gap-0 rounded-xl overflow-hidden"
        style={{
          width: '85vw',
          maxWidth: '600px',
          maxHeight: '70vh',
          zIndex: 100000,
        }}
      >
        <div className="p-6 pb-2 shrink-0">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              {/* <--- CORRECCIÓN AQUÍ: Agregué el '<' faltante */}
              <DialogTitle className="flex flex-col gap-1 text-left">
                <span className="text-xl md:text-2xl font-bold break-words">{displayTitle}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {incident?.type?.name || (incident as any)?.type || 'Incident Details'}
                </span>
              </DialogTitle>
              <div className="flex items-center gap-2 shrink-0">
                {(isInitialLoading || isRefetching) && (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                )}
                {/* La X por defecto del DialogContent se encarga de cerrar */}
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="overflow-y-auto p-6 pt-2 flex-1 w-full">
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

              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-base py-1 px-3">
                  {incident.status?.name || (incident as any).status}
                </Badge>
                <Badge variant="outline" style={severityColor} className="text-base py-1 px-3">
                  {incident.severity?.name || (incident as any).severity}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-4 rounded-lg">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                    Time Reported
                  </p>
                  <p className="text-base font-medium">
                    {formatDateTime(incident.reportedAt || (incident as any).timestamp)}
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
                  {incident.location && (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        Coordinates: {lat.toFixed(4)}, {lng.toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Short Description */}
              {renderDescription && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Short Description</p>
                  <div className="bg-muted/10 p-3 rounded-md border border-border/50">
                    <p className="text-base leading-relaxed">{renderDescription}</p>
                  </div>
                </div>
              )}

              {/* Narrative */}
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
            </div>
          )}
        </div>

        <div className="p-6 pt-4 border-t shrink-0">
          <Button className="w-full md:w-auto md:ml-auto" onClick={closeIncident}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- SUBCOMPONENTES DE TABLA ---
const IncidentUnitsTable = ({ units }: { units: IncidentUnitSummary[] }) => (
  <div className="rounded-lg border overflow-hidden max-w-full">
    <div className="overflow-x-auto w-full">
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
          {units.map((unit, i) => (
            <TableRow key={`${unit.stationCode}-${unit.assignmentRole ?? 'role'}-${i}`}>
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
  <div className="rounded-lg border overflow-hidden max-w-full">
    <div className="overflow-x-auto w-full">
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
          {assets.map((asset, i) => (
            <TableRow key={`${asset.assetIdentifier}-${i}`}>
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
    {notes.map((note, i) => (
      <div key={`${note.author}-${note.createdAt}-${i}`} className="rounded-lg border bg-muted/20 p-4">
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