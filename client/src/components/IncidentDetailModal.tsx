import { useIncidentDetailStore } from '@/store/useIncidentDetailStore';

const IncidentDetailModal = () => {
  const selectedIncident = useIncidentDetailStore((state) => state.selectedIncident);
  const isOpen = useIncidentDetailStore((state) => state.isOpen);
  const closeIncident = useIncidentDetailStore((state) => state.closeIncident);

  if (!isOpen || !selectedIncident) {
    return null;
  }

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
        <section className="incident-modal__body">
          <p className="incident-modal__summary">
            Detail view placeholder for <strong>{selectedIncident.incidentNumber}</strong>.
          </p>
          <p>
            Future tasks will fetch `/api/incidents/{selectedIncident.incidentNumber}` and render
            the full detail payload here. For now, this modal confirms the selection state wiring.
          </p>
        </section>
      </div>
    </div>
  );
};

export default IncidentDetailModal;
