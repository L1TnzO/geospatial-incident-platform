import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useIncidentDetailStore } from '../store/incident-detail-store';
import { useIncidentDetail } from '../hooks/useIncidentDetail';
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

const formatMetadataValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      console.warn('[IncidentDetailModal] Failed to stringify metadata value:', error);
      return String(value);
    }
  }
  return String(value);
};

const sortMetadataEntries = (entries: Array<[string, unknown]>) =>
  entries.sort(([a], [b]) => a.localeCompare(b));

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
  const metadataEntries = useMemo(() => {
    if (!incident?.metadata) {
      return [] as Array<[string, unknown]>;
    }
    return sortMetadataEntries(Object.entries(incident.metadata));
  }, [incident?.metadata]);

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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Incident</span>
              <span className="text-xl font-semibold">
                {incident?.id ?? incidentId ?? 'Incident'}
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
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Incident type</p>
                <p className="font-medium">{incident.type}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Severity</p>
                <Badge variant="outline" style={severityColor}>
                  {incident.severity}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Reported</p>
                <p>{formatDateTime(incident.reportedAt ?? incident.timestamp)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Occurrence</p>
                <p>{formatDateTime(incident.occurrenceAt)}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Location</p>
              <p>{incident.location.address}</p>
              <p className="text-xs text-muted-foreground">
                {incident.location.lat.toFixed(4)}, {incident.location.lng.toFixed(4)}
              </p>
            </div>

            <Separator />

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant="outline">{incident.status}</Badge>
            </div>

            {incident.narrative && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Narrative</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {incident.narrative}
                  </p>
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Description</p>
              <p>{incident.description}</p>
            </div>

            {metadataEntries.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Metadata</p>
                  <div className="max-h-48 overflow-y-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-48">Key</TableHead>
                          <TableHead>Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metadataEntries.map(([key, value]) => (
                          <TableRow key={key}>
                            <TableCell className="font-medium">{key}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatMetadataValue(value)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}

            {units.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Assigned Units</p>
                  <IncidentUnitsTable units={units} />
                </div>
              </>
            )}

            {assets.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Assets</p>
                  <IncidentAssetsTable assets={assets} />
                </div>
              </>
            )}

            {notes.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Notes</p>
                  <IncidentNotesList notes={notes} />
                </div>
              </>
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
  <div className="max-h-48 overflow-y-auto rounded-md border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Station</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Dispatched</TableHead>
          <TableHead>Cleared</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {units.map((unit) => (
          <TableRow key={`${unit.stationCode}-${unit.assignmentRole ?? 'role'}`}>
            <TableCell className="font-medium">
              {unit.stationCode} — {unit.stationName}
            </TableCell>
            <TableCell>{unit.assignmentRole ?? '—'}</TableCell>
            <TableCell>{formatDateTime(unit.dispatchedAt)}</TableCell>
            <TableCell>{formatDateTime(unit.clearedAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

const IncidentAssetsTable = ({ assets }: { assets: IncidentAssetSummary[] }) => (
  <div className="max-h-48 overflow-y-auto rounded-md border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Identifier</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assets.map((asset) => (
          <TableRow key={asset.assetIdentifier}>
            <TableCell className="font-medium">{asset.assetIdentifier}</TableCell>
            <TableCell>{asset.assetType}</TableCell>
            <TableCell>{asset.status ?? '—'}</TableCell>
            <TableCell>{asset.notes ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

const IncidentNotesList = ({ notes }: { notes: IncidentNoteSummary[] }) => (
  <div className="max-h-48 space-y-3 overflow-y-auto rounded-md border p-3">
    {notes.map((note) => (
      <div
        key={`${note.author}-${note.createdAt}`}
        className="space-y-1 rounded-md bg-muted/40 p-2"
      >
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{note.author}</span>
          <span>{formatDateTime(note.createdAt)}</span>
        </div>
        <p className="text-sm leading-relaxed">{note.note}</p>
      </div>
    ))}
  </div>
);
