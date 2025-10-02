import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import '@/lib/leaflet';
import { useIncidents } from '@/hooks/useIncidents';
import { useMapStore } from '@/store/useMapStore';

const getLatLng = (incident: ReturnType<typeof useIncidents>['incidents'][number]) => {
  const coords = incident.location.geometry?.coordinates;
  if (!coords || coords.length < 2) {
    return undefined;
  }

  const [lng, lat] = coords;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return undefined;
  }

  return { lat, lng };
};

const MapView = () => {
  const { center, zoom } = useMapStore();
  const { incidents, isLoading, isError, error, refresh, lastUpdated } = useIncidents();

  const hasIncidents = incidents.length > 0;

  return (
    <section className="map-card" aria-label="Incident map">
      <div className="map-card__container">
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
          {incidents.map((incident) => {
            const position = getLatLng(incident);
            if (!position) {
              return null;
            }

            return (
              <Marker key={incident.incidentNumber} position={position}>
                <Popup>
                  <div className="map-popup">
                    <p className="map-popup__title">{incident.title}</p>
                    <dl className="map-popup__details">
                      <div>
                        <dt>Incident</dt>
                        <dd>{incident.incidentNumber}</dd>
                      </div>
                      <div>
                        <dt>Severity</dt>
                        <dd>{incident.severity.name}</dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>{incident.status.name}</dd>
                      </div>
                    </dl>
                  </div>
                </Popup>
              </Marker>
            );
          })}
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
  );
};

export default MapView;
