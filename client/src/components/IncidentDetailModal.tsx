import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Incident } from '../types';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

interface IncidentDetailModalProps {
  incident: Incident | null;
  open: boolean;
  onClose: () => void;
}

export function IncidentDetailModal({ incident, open, onClose }: IncidentDetailModalProps) {
  if (!incident) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'destructive';
      case 'High':
        return 'default';
      case 'Medium':
        return 'secondary';
      case 'Low':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Incident Details: {incident.id}</DialogTitle>
          <DialogDescription>Complete information for this incident</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Incident Type</p>
              <p>{incident.type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Severity</p>
              <Badge variant={getSeverityColor(incident.severity)}>{incident.severity}</Badge>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p>{incident.date}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Time</p>
              <p>{new Date(incident.timestamp).toLocaleTimeString()}</p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm text-muted-foreground">Location</p>
            <p>{incident.location.address}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Coordinates: {incident.location.lat.toFixed(4)}, {incident.location.lng.toFixed(4)}
            </p>
          </div>

          <Separator />

          <div>
            <p className="text-sm text-muted-foreground">Description</p>
            <p>{incident.description}</p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant="outline">{incident.status}</Badge>
            </div>
            {incident.responseTime && (
              <div>
                <p className="text-sm text-muted-foreground">Response Time</p>
                <p>{incident.responseTime} minutes</p>
              </div>
            )}
          </div>

          {incident.zoneId && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Zone</p>
                <p>{incident.zoneId}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
