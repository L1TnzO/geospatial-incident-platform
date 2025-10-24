import { useMemo } from 'react';
import { LayerGroup, Polygon, Tooltip } from 'react-leaflet';
import type { HotspotCell } from '../../types/api/strategic';

interface HotspotOverlayProps {
  cells: HotspotCell[];
  isVisible: boolean;
  intensityExponent?: number;
  priorityZonesVisible?: boolean;
}

export function HotspotOverlay({
  cells,
  isVisible,
  intensityExponent = 1,
  priorityZonesVisible = false,
}: HotspotOverlayProps) {
  // Pre-calculate styled cells for performance
  const styledCells = useMemo(() => {
    return cells
      .map((cell) => {
        // Apply intensity exponent for scaling
        const scaledIntensity = Math.pow(cell.intensity, intensityExponent);

        // Color gradient from yellow (low) to red (high)
        const hue = 60 - scaledIntensity * 60; // 60 (yellow) to 0 (red)
        const color = `hsl(${hue}, 100%, 50%)`;

        // Reduce opacity when priority zones are visible
        const baseOpacity = priorityZonesVisible ? 0.05 : 0.3;
        const fillOpacity = baseOpacity + scaledIntensity * (priorityZonesVisible ? 0.08 : 0.4);

        // Convert GeoJSON coordinates to Leaflet LatLng format
        // GeoJSON format: [[[lng, lat], [lng, lat], ...]]
        // Leaflet format: [[lat, lng], [lat, lng], ...]
        const coordinates = cell.geometry?.geometry?.coordinates;
        if (!coordinates || !coordinates[0]) {
          return null;
        }

        // Convert from GeoJSON [lng, lat] to Leaflet [lat, lng]
        // GeoJSON polygon coordinates: [[[lng, lat], [lng, lat], ...]]
        // Leaflet expects: [[lat, lng], [lat, lng], ...] as tuples
        const positions: [number, number][] = coordinates[0].map((coord): [number, number] => [
          coord[1],
          coord[0],
        ]);

        return {
          key: cell.cellId,
          positions,
          color,
          fillOpacity,
          cell,
        };
      })
      .filter(Boolean);
  }, [cells, intensityExponent, priorityZonesVisible]);

  if (!isVisible || styledCells.length === 0) {
    return null;
  }

  return (
    <LayerGroup>
      {styledCells.map((styledCell) => {
        if (!styledCell) return null;

        return (
          <Polygon
            key={styledCell.key}
            positions={styledCell.positions}
            pathOptions={{
              color: styledCell.color,
              fillColor: styledCell.color,
              fillOpacity: styledCell.fillOpacity,
              weight: priorityZonesVisible ? 0.5 : 2,
              opacity: priorityZonesVisible ? 0.15 : 0.8,
            }}
          >
            <Tooltip sticky className="hotspot-tooltip">
              <div>
                <strong>Hotspot</strong>
                <br />
                Incidents: {styledCell.cell.incidentCount}
                <br />
                Intensity: {(styledCell.cell.intensity * 100).toFixed(1)}%
                <br />
                Location: {styledCell.cell.centroid.latitude.toFixed(4)},{' '}
                {styledCell.cell.centroid.longitude.toFixed(4)}
              </div>
            </Tooltip>
          </Polygon>
        );
      })}
    </LayerGroup>
  );
}
