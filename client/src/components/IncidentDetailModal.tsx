import { useIncidentDetailStore } from '@/store/useIncidentDetailStore';
import type { IncidentAsset, IncidentNote, IncidentUnit } from '@/types/incidents';

const formatTimestamp = (value?: string | null): string => {
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

const IncidentDetailModal = () => {
  const {
    selectedIncident,
    isOpen,
    closeIncident,
    pendingIncidentNumber,
    error,
    refreshIncidentDetail,
    detailCache,
  } = useIncidentDetailStore();

  const detail = selectedIncident ? detailCache[selectedIncident.incidentNumber] : undefined;

  if (!isOpen || !selectedIncident) {
    return null;
  }

  const incidentNumber = selectedIncident.incidentNumber;
  const isLoading = pendingIncidentNumber === incidentNumber && !detail;

  return (
    <div
      className="incident-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incident-detail-heading"
    >
      <div className="incident-modal__backdrop" onClick={closeIncident} aria-hidden="true" />
      <div className="incident-modal__content">
        <header className="incident-modal__header">
          <h2 id="incident-detail-heading">Incident details</h2>
          <button type="button" className="incident-modal__close" onClick={closeIncident}>
            Close
          </button>
        </header>
        <section className="incident-modal__body" aria-live="polite">
          <p className="incident-modal__summary">
            <strong>{selectedIncident.title}</strong>
            <br />#{incidentNumber}
          </p>

          {isLoading && (
            <p className="incident-modal__helper" role="status">
              Loading incident detail…
            </p>
          )}

          {error && (
            <div className="incident-modal__message incident-modal__message--error" role="alert">
              <p>{error}</p>
              <button
                type="button"
                className="incident-modal__button"
                onClick={() => refreshIncidentDetail(incidentNumber)}
              >
                Retry
              </button>
            </div>
          )}

          {detail && !error && (
            <div className="incident-modal__detail">
              <dl className="incident-modal__meta">
                <div>
                  <dt>Status</dt>
                  <dd>{detail.status.name}</dd>
                </div>
                <div>
                  <dt>Severity</dt>
                  <dd>{detail.severity.name}</dd>
                </div>
                <div>
                  <dt>Reported</dt>
                  <dd>{formatTimestamp(detail.reportedAt)}</dd>
                </div>
                <div>
                  <dt>Occurrence</dt>
                  <dd>{formatTimestamp(detail.occurrenceAt)}</dd>
                </div>
                <div>
                  <dt>Dispatch</dt>
                  <dd>{formatTimestamp(detail.dispatchAt)}</dd>
                </div>
                <div>
                  <dt>Primary station</dt>
                  <dd>{detail.primaryStation?.name ?? '—'}</dd>
                </div>
              </dl>

              {detail.narrative && detail.narrative.trim().length > 0 && (
                <article className="incident-modal__narrative">
                  <h3>Narrative</h3>
                  <p>{detail.narrative}</p>
                </article>
              )}

              {detail.units.length > 0 && (
                <section>
                  <h3>Responding units</h3>
                  <ul className="incident-modal__list">
                    {detail.units.map((unit: IncidentUnit) => (
                      <li key={`${unit.stationCode}-${unit.assignmentRole ?? 'unit'}`}>
                        <strong>{unit.stationName}</strong>{' '}
                        {unit.assignmentRole ? `(${unit.assignmentRole})` : ''}
                        <br />
                        Dispatched: {formatTimestamp(unit.dispatchedAt)}
                        <br />
                        Cleared: {formatTimestamp(unit.clearedAt)}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {detail.assets.length > 0 && (
                <section>
                  <h3>Assets</h3>
                  <ul className="incident-modal__list">
                    {detail.assets.map((asset: IncidentAsset) => (
                      <li key={asset.assetIdentifier}>
                        <strong>{asset.assetIdentifier}</strong> – {asset.assetType}
                        {asset.status ? ` (${asset.status})` : ''}
                        {asset.notes ? <p>{asset.notes}</p> : null}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {detail.notes.length > 0 && (
                <section>
                  <h3>Notes</h3>
                  <ul className="incident-modal__list">
                    {detail.notes.map((note: IncidentNote, index: number) => (
                      <li key={`${note.author}-${index}`}>
                        <strong>{note.author}</strong> – {formatTimestamp(note.createdAt)}
                        <p>{note.note}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default IncidentDetailModal;
