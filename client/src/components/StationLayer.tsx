import { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { StationSummary } from '@/types/stations';

interface StationLayerProps {
  stations: StationSummary[];
  isVisible: boolean;
}

const createStationIcon = () =>
  L.divIcon({
    html: '<span>🚒</span>',
    className: 'station-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 32],
    popupAnchor: [0, -28],
  });

const getPosition = (station: StationSummary) => {
  const coords = station.location.geometry?.coordinates;
  if (!coords || coords.length < 2) {
    return undefined;
  }

  const [lng, lat] = coords;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return undefined;
  }

  return { lat, lng };
};

const formatPhone = (phone?: string | null) => {
  if (!phone) {
    return '—';
  }

  return phone;
};

const StationLayer = ({ stations, isVisible }: StationLayerProps) => {
  const icon = useMemo(() => createStationIcon(), []);

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {stations.map((station) => {
        const position = getPosition(station);
        if (!position) {
          return null;
        }

        return (
          <Marker
            key={station.stationCode}
            position={position}
            icon={icon}
            title={`${station.name} (${station.stationCode})`}
            alt={`${station.name} fire station`}
          >
            <Popup>
              <div className="station-popup">
                <h3 className="station-popup__title">{station.name}</h3>
                <dl className="station-popup__meta">
                  <div>
                    <dt>Station</dt>
                    <dd>{station.stationCode}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{station.isActive ? 'Active' : 'Inactive'}</dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd>{formatPhone(station.phone)}</dd>
                  </div>
                </dl>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

export default StationLayer;
