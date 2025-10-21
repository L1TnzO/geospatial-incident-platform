import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { useIncidentDetailStore } from '../store/incident-detail-store';

const formatDateTime = (value?: string) => {
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

export function IncidentDetailModal() {
  const { selectedIncident, isOpen, closeIncident } = useIncidentDetailStore();

  if (!isOpen || !selectedIncident) {
    return null;
  }

  const severityColor = selectedIncident.severityColor
    ? {
        backgroundColor: `${selectedIncident.severityColor}22`,
        borderColor: selectedIncident.severityColor,
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Incident</span>
            <span className="text-xl font-semibold">{selectedIncident.id}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Incident type</p>
              <p className="font-medium">{selectedIncident.type}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Severity</p>
              <Badge variant="outline" style={severityColor}>
                {selectedIncident.severity}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Reported</p>
              <p>{formatDateTime(selectedIncident.reportedAt ?? selectedIncident.timestamp)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Occurrence</p>
              <p>{formatDateTime(selectedIncident.occurrenceAt)}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Location</p>
            <p>{selectedIncident.location.address}</p>
            <p className="text-xs text-muted-foreground">
              {selectedIncident.location.lat.toFixed(4)}, {selectedIncident.location.lng.toFixed(4)}
            </p>
          </div>

          <Separator />

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Description</p>
            <p>{selectedIncident.description}</p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant="outline">{selectedIncident.status}</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Active</p>
              <p>{selectedIncident.isActive ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {selectedIncident.zoneId && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Primary station</p>
                <p>{selectedIncident.zoneId}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
