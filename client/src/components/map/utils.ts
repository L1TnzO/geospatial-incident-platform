import { latLngBounds, type LatLngBounds } from 'leaflet';
import type { LiteIncident } from '../../types';

const FALLBACK_SEVERITY_COLORS: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#3b82f6',
};

export const resolveSeverityColor = (incident: LiteIncident) =>
  incident.severityColor ?? FALLBACK_SEVERITY_COLORS[incident.severity] ?? '#2563eb';

export const computeIncidentBounds = (incidents: LiteIncident[]): LatLngBounds | null => {
  const points = incidents
    .map((incident) => {
      const { lat, lng } = incident.location;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        return null;
      }
      return [lat, lng] as const;
    })
    .filter((value): value is readonly [number, number] => value !== null);

  if (points.length === 0) {
    return null;
  }

  return latLngBounds(points.map(([lat, lng]) => [lat, lng]));
};
