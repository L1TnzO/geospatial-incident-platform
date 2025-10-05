import { useCallback } from 'react';
import type { CSSProperties } from 'react';
import type { DashboardRecentIncidentsState } from '@/hooks/useDashboardRecentIncidents';
import { useIncidentDetailStore } from '@/store/useIncidentDetailStore';
import { useMapStore } from '@/store/useMapStore';
import type { IncidentListItem } from '@/types/incidents';
import type { DashboardRecentIncident } from '@/types/dashboard';

interface DashboardRecentIncidentsProps {
  recent: DashboardRecentIncidentsState;
}

const toIncidentListItem = (incident: DashboardRecentIncident): IncidentListItem => ({
  incidentNumber: incident.incidentNumber,
  title: incident.title,
  occurrenceAt: incident.occurrenceAt,
  reportedAt: incident.reportedAt,
  dispatchAt: null,
  arrivalAt: null,
  resolvedAt: null,
  isActive: incident.isActive,
  casualtyCount: 0,
  responderInjuries: 0,
  estimatedDamageAmount: null,
  location: incident.location,
  locationGeohash: undefined,
  externalReference: null,
  type: incident.type,
  severity: incident.severity,
  status: incident.status,
  source: null,
  weather: null,
  primaryStation: incident.primaryStation ?? null,
});

const DEFAULT_REPORT_FORMAT = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const DashboardRecentIncidents = ({ recent }: DashboardRecentIncidentsProps) => {
  const setView = useMapStore((state) => state.setView);
  const openIncident = useIncidentDetailStore((state) => state.openIncident);

  const highlightIncident = useCallback((incident: DashboardRecentIncident) => {
    const listItem = toIncidentListItem(incident);
    useIncidentDetailStore.setState({
      selectedIncident: listItem,
      isOpen: false,
    });
    return listItem;
  }, []);

  const handleViewOnMap = useCallback(
    (incident: DashboardRecentIncident) => {
      const coordinates = incident.location?.geometry?.coordinates;
      if (Array.isArray(coordinates) && coordinates.length >= 2) {
        const [longitude, latitude] = coordinates.map(Number);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setView([latitude, longitude], 14);
        }
      }
      highlightIncident(incident);
    },
    [setView, highlightIncident]
  );

  const handleOpenDetails = useCallback(
    (incident: DashboardRecentIncident) => {
      const listItem = highlightIncident(incident);
      const coordinates = incident.location?.geometry?.coordinates;
      if (Array.isArray(coordinates) && coordinates.length >= 2) {
        const [longitude, latitude] = coordinates.map(Number);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setView([latitude, longitude], 14);
        }
      }
      openIncident(listItem);
    },
    [highlightIncident, openIncident, setView]
  );

  if (recent.status === 'loading' || recent.status === 'idle') {
    return (
      <div className="dashboard-recent" role="status" aria-live="polite">
        <p className="dashboard-loading">Loading recent incidents…</p>
        <ul className="dashboard-recent__skeleton-list" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <li key={index} className="dashboard-recent__skeleton-item">
              <span className="dashboard-placeholder" />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (recent.status === 'error') {
    return (
      <div className="dashboard-recent" role="alert">
        <div className="dashboard-error">
          <p>{recent.error ?? 'Unable to load recent incidents.'}</p>
          <button type="button" className="dashboard-recent__retry" onClick={recent.refresh}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (recent.data.length === 0) {
    return (
      <div className="dashboard-recent" role="status" aria-live="polite">
        <div className="dashboard-empty">Recent incidents will surface here shortly.</div>
      </div>
    );
  }

  return (
    <ul className="dashboard-recent" role="list">
      {recent.data.map((incident) => {
        const reportedDate = new Date(incident.reportedAt);
        const reportedLabel = Number.isNaN(reportedDate.getTime())
          ? 'Unknown'
          : DEFAULT_REPORT_FORMAT.format(reportedDate);
        const coordinates = incident.location?.geometry?.coordinates;
        const hasCoordinates = Array.isArray(coordinates) && coordinates.length >= 2;
        const stationLabel = incident.primaryStation
          ? `${incident.primaryStation.name} (${incident.primaryStation.stationCode})`
          : 'No station assigned';
        const severityStyle = {
          '--recent-severity-color': incident.severity.colorHex,
        } as CSSProperties;

        return (
          <li
            key={incident.incidentNumber}
            className="dashboard-recent__item"
            aria-label={`${incident.incidentNumber}: ${incident.title}`}
          >
            <div className="dashboard-recent__content">
              <div className="dashboard-recent__header">
                <span
                  className="dashboard-recent__severity"
                  style={severityStyle}
                  aria-label={`${incident.severity.name} severity`}
                >
                  {incident.severity.name}
                </span>
                <span className="dashboard-recent__number">{incident.incidentNumber}</span>
              </div>
              <p className="dashboard-recent__title">{incident.title}</p>
              <div className="dashboard-recent__meta">
                <span
                  className="dashboard-recent__status"
                  aria-label={`Status: ${incident.status.name}`}
                >
                  {incident.status.name}
                </span>
                <span className="dashboard-recent__station">{stationLabel}</span>
              </div>
              <time dateTime={incident.reportedAt} className="dashboard-recent__timestamp">
                Reported {reportedLabel}
              </time>
            </div>
            <div className="dashboard-recent__actions">
              <button
                type="button"
                className="dashboard-recent__action"
                onClick={() => handleViewOnMap(incident)}
                disabled={!hasCoordinates}
              >
                View on map
              </button>
              <button
                type="button"
                className="dashboard-recent__action dashboard-recent__action--primary"
                onClick={() => handleOpenDetails(incident)}
              >
                Open details
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default DashboardRecentIncidents;
