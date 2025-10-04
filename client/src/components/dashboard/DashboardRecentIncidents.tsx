import type { DashboardRecentIncidentsState } from '@/hooks/useDashboardRecentIncidents';

interface DashboardRecentIncidentsProps {
  recent: DashboardRecentIncidentsState;
}

const DashboardRecentIncidents = ({ recent }: DashboardRecentIncidentsProps) => {
  if (recent.status === 'loading' || recent.status === 'idle') {
    return (
      <div className="dashboard-recent" role="status" aria-live="polite">
        <p className="dashboard-loading">Loading recent incidents…</p>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="dashboard-placeholder" aria-hidden="true" />
        ))}
      </div>
    );
  }

  if (recent.status === 'error') {
    return (
      <div className="dashboard-recent" role="alert">
        <div className="dashboard-error">{recent.error ?? 'Unable to load recent incidents.'}</div>
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
        const reportedDate = new Date(incident.reportedAt).toLocaleString();
        return (
          <li key={incident.incidentNumber} className="dashboard-recent__item">
            <div>
              <p className="dashboard-recent__title">{incident.title}</p>
              <p className="dashboard-recent__meta">
                <span>{incident.incidentNumber}</span>
                <span>{incident.severity.name}</span>
                <span>{incident.status.name}</span>
              </p>
            </div>
            <time dateTime={incident.reportedAt}>{reportedDate}</time>
          </li>
        );
      })}
    </ul>
  );
};

export default DashboardRecentIncidents;
