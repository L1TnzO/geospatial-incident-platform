import type { IncidentListItem } from '@/types/incidents';

interface IncidentPopupProps {
  incident: IncidentListItem;
  onViewDetails: (incident: IncidentListItem) => void;
}

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export const IncidentPopup = ({ incident, onViewDetails }: IncidentPopupProps) => {
  const { incidentNumber, title, severity, status, occurrenceAt, reportedAt } = incident;

  return (
    <div className="incident-popup">
      <header className="incident-popup__header">
        <span
          className="incident-popup__severity"
          style={{
            backgroundColor: severity.colorHex,
            color: '#fff',
          }}
        >
          {severity.name}
        </span>
        <span className="incident-popup__status">{status.name}</span>
      </header>

      <div className="incident-popup__body">
        <h3 className="incident-popup__title">{title}</h3>
        <dl className="incident-popup__meta">
          <div>
            <dt>Incident</dt>
            <dd>{incidentNumber}</dd>
          </div>
          <div>
            <dt>Occurred</dt>
            <dd>{formatDate(occurrenceAt)}</dd>
          </div>
          <div>
            <dt>Reported</dt>
            <dd>{formatDate(reportedAt)}</dd>
          </div>
        </dl>
      </div>

      <footer className="incident-popup__footer">
        <button
          type="button"
          className="incident-popup__button"
          onClick={() => onViewDetails(incident)}
        >
          View details
        </button>
      </footer>
    </div>
  );
};

export default IncidentPopup;
