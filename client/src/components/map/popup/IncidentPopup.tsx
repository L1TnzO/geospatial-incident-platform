import type { LiteIncident } from '../../../types';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { resolveSeverityColor } from '../utils';

interface IncidentPopupProps {
  incident: LiteIncident;
  onViewDetails: (incident: LiteIncident) => void;
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
    <div className="flex flex-col gap-4 min-w-[260px] text-slate-900 p-1" role="group" aria-label={`Incident ${incident.id}`}>
      <header className="flex items-center justify-between gap-2">
        <Badge
          variant="outline"
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border"
          style={{
            backgroundColor: `${severityColor}15`,
            borderColor: `${severityColor}60`,
            color: '#0f172a',
          }}
        >
          {incident.severity}
        </Badge>
        <span className="font-semibold text-xs text-slate-500 uppercase tracking-wide">{incident.status}</span>
      </header>

      <div className="flex flex-col gap-3">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1 block">
            Type
          </span>
          <h3 className="text-xl font-extrabold leading-tight text-slate-900 tracking-tight">
            {incident.type}
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-3">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-0.5">
              ID
            </span>
            <span className="text-xs font-mono text-slate-600">
              {incident.id}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-0.5">
              Occurrence
            </span>
            <span className="text-sm text-slate-700 font-medium">
              {formatDateTime(incident.occurrenceAt ?? incident.timestamp)}
            </span>
          </div>
        </div>
      </div>

      <footer className="mt-1">
        <Button size="sm" className="w-full text-xs font-semibold h-8" onClick={() => onViewDetails(incident)}>
          View details
        </Button>
      </footer>
    </div>
  );
};

export default IncidentPopup;
