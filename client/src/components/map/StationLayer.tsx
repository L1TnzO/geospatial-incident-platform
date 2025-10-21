import { useMemo } from 'react';
import { LayerGroup, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { FireStation } from '../../types';

interface StationLayerProps {
  stations: FireStation[];
  isVisible: boolean;
}

const createStationIcon = () =>
  L.divIcon({
    html: '<span>🚒</span>',
    className: 'station-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 30],
    popupAnchor: [0, -26],
  });

const StationLayer = ({ stations, isVisible }: StationLayerProps) => {
  const icon = useMemo(() => createStationIcon(), []);

  if (!isVisible) {
    return null;
  }

  return (
    <LayerGroup>
      {stations.map((station) => {
        const { lat, lng } = station.location;
        if (typeof lat !== 'number' || typeof lng !== 'number') {
          return null;
        }

        return (
          <Marker
            key={station.id}
            position={{ lat, lng }}
            icon={icon}
            title={`${station.name} (${station.id})`}
          >
            <Popup className="station-popup__container">
              <div className="station-popup">
                <h3 className="station-popup__title">{station.name}</h3>
                <dl className="station-popup__meta">
                  <div>
                    <dt>Station ID</dt>
                    <dd>{station.id}</dd>
                  </div>
                </dl>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </LayerGroup>
  );
};

export default StationLayer;
