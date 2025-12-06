import { useMemo, useState, useEffect } from 'react';
import { LayerGroup, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { FireStation } from '../../types';

interface StationLayerProps {
  stations: FireStation[];
  isVisible: boolean;
}

/**
 * Calculate station icon size based on zoom level.
 * Invisible at country-level (zoom < 9), visible at city-level (zoom >= 9).
 * Scales from 32px at zoom 9 to 52px at zoom 14+.
 */
const getZoomBasedSize = (zoom: number): number => {
  const minZoom = 9;
  const maxZoom = 14;
  const minSize = 32;
  const maxSize = 52;

  if (zoom < minZoom) return 0; // Invisible
  if (zoom >= maxZoom) return maxSize;

  const normalizedZoom = (zoom - minZoom) / (maxZoom - minZoom);
  return Math.round(minSize + (maxSize - minSize) * normalizedZoom);
};

const createStationIcon = (size: number) => {
  const fontSize = Math.round(size * 0.7); // Font size ~70% of icon size
  return L.divIcon({
    html: `<span style="font-size: ${fontSize}px">🚒</span>`,
    className: 'station-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size - 2],
    popupAnchor: [0, -size + 4],
  });
};

const StationLayer = ({ stations, isVisible }: StationLayerProps) => {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const handleZoom = () => setZoom(map.getZoom());
    map.on('zoomend', handleZoom);
    return () => { map.off('zoomend', handleZoom); };
  }, [map]);

  const size = getZoomBasedSize(zoom);
  const icon = useMemo(() => createStationIcon(size), [size]);

  // Don't render if not visible or zoomed out too far
  if (!isVisible || size === 0) {
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

