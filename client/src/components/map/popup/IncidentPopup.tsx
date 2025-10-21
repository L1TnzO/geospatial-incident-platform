import type { Incident } from '../../../types';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { resolveSeverityColor } from '../utils';

interface IncidentPopupProps {
  incident: Incident;
  onViewDetails: (incident: Incident) => void;
}

const formatDateTime = (value?: string) => {
  if (!value) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const IncidentPopup = ({ incident, onViewDetails }: IncidentPopupProps) => {
  const severityColor = resolveSeverityColor(incident);

  return (
    <div className="incident-popup" role="group" aria-label={`Incident ${incident.id}`}>
      <header className="incident-popup__header">
        <Badge
          variant="outline"
          className="incident-popup__severity"
          style={{
            backgroundColor: `${severityColor}22`,
            borderColor: `${severityColor}88`,
            color: '#0f172a',
          }}
        >
          {incident.severity}
        </Badge>
        <span className="incident-popup__status">{incident.status}</span>
      </header>

      <div className="incident-popup__body">
        <h3 className="incident-popup__title">{incident.type}</h3>
        <dl className="incident-popup__meta">
          <div>
            <dt>Incident ID</dt>
            <dd>{incident.id}</dd>
          </div>
          <div>
            <dt>Occurrence</dt>
            <dd>{formatDateTime(incident.occurrenceAt ?? incident.timestamp)}</dd>
          </div>
          <div>
            <dt>Reported</dt>
            <dd>{formatDateTime(incident.reportedAt ?? incident.date)}</dd>
          </div>
        </dl>
      </div>

      <footer className="incident-popup__footer">
        <Button size="sm" className="w-full" onClick={() => onViewDetails(incident)}>
          View details
        </Button>
      </footer>
    </div>
  );
};

export default IncidentPopup;
