import { MapContainer, TileLayer } from 'react-leaflet';
import '@/lib/leaflet';
import { useIncidents } from '@/hooks/useIncidents';
import { useMapStore } from '@/store/useMapStore';
import IncidentClusterLayer from './IncidentClusterLayer';
import IncidentDetailModal from './IncidentDetailModal';

const MapView = () => {
  const { center, zoom } = useMapStore();
  const {
    incidents,
    isLoading,
    isError,
    error,
    refresh,
    lastUpdated,
    totalCount,
    renderedCount,
    remainder,
  } = useIncidents();
  const hasIncidents = renderedCount > 0;
  const showCapIndicator = remainder > 0 && totalCount > 0;

  return (
    <>
      <section className="map-card" aria-label="Incident map">
        <div className="map-card__container">
          {showCapIndicator && (
            <div className="map-card__cap-indicator" role="status" aria-live="polite">
              Showing {renderedCount.toLocaleString()} of {totalCount.toLocaleString()} incidents.
            </div>
          )}
          <MapContainer
            center={center}
            zoom={zoom}
            className="map-container"
            aria-label="Incident map view"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <IncidentClusterLayer incidents={incidents} />
          </MapContainer>

          {(isLoading || isError || !hasIncidents) && (
            <div className="map-card__overlay" role="status" aria-live="polite">
              {isLoading && <p>Loading incidents…</p>}
              {!isLoading && isError && (
                <div className="map-card__message">
                  <p>{error ?? 'Something went wrong while loading incidents.'}</p>
                  <button type="button" className="map-card__button" onClick={refresh}>
                    Retry
                  </button>
                </div>
              )}
              {!isLoading && !isError && !hasIncidents && <p>No incidents available right now.</p>}
            </div>
          )}
        </div>
        {lastUpdated && !isLoading && !isError && (
          <p className="map-card__meta" aria-live="polite">
            Last updated {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </section>
      <IncidentDetailModal />
    </>
  );
};

export default MapView;
