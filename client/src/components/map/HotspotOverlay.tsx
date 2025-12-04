import { useMemo } from 'react';
import { GeoJSON, LayerGroup } from 'react-leaflet';
import type { HotspotCell } from '../../types/api/strategic';
import type { FeatureCollection, Geometry } from 'geojson';
import L from 'leaflet';

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
  // Convert cells to a single FeatureCollection
  const data: FeatureCollection<Geometry, any> = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: cells.map((cell) => ({
        type: 'Feature',
        geometry: cell.geometry.geometry,
        properties: {
          ...cell,
          // Pre-calculate derived values needed for styling if expensive,
          // but simple math is fine in the style function.
        },
      })),
    };
  }, [cells]);

  // Style function for the GeoJSON layer
  const style = (feature: any) => {
    if (!feature || !feature.properties) return {};

    const { intensity } = feature.properties;

    // Apply intensity exponent for scaling
    const scaledIntensity = Math.pow(intensity, intensityExponent);

    // Color gradient from yellow (low) to red (high)
    const hue = 60 - scaledIntensity * 60; // 60 (yellow) to 0 (red)
    const color = `hsl(${hue}, 100%, 50%)`;

    // Reduce opacity when priority zones are visible
    const baseOpacity = priorityZonesVisible ? 0.2 : 0.3;
    const fillOpacity = baseOpacity + scaledIntensity * (priorityZonesVisible ? 0.3 : 0.4);

    return {
      color: color,
      fillColor: color,
      fillOpacity: fillOpacity,
      weight: priorityZonesVisible ? 1 : 2,
      opacity: priorityZonesVisible ? 0.4 : 0.8,
    };
  };

  // OnEachFeature to bind tooltips
  const onEachFeature = (feature: any, layer: L.Layer) => {
    if (!feature.properties) return;

    const { incidentCount, intensity, centroid } = feature.properties;

    const tooltipContent = `
      <div>
        <strong>Hotspot</strong>
        <br />
        Incidents: ${incidentCount}
        <br />
        Intensity: ${(intensity * 100).toFixed(1)}%
        <br />
        Location: ${centroid.latitude.toFixed(4)}, ${centroid.longitude.toFixed(4)}
      </div>
    `;

    layer.bindTooltip(tooltipContent, {
      sticky: true,
      className: 'hotspot-tooltip',
    });
  };

  if (!isVisible || !cells || cells.length === 0) {
    return null;
  }

  return (
    <LayerGroup>
      <GeoJSON
        key={`hotspots-${cells.length}-${priorityZonesVisible}`}
        data={data}
        style={style}
        onEachFeature={onEachFeature}
      />
    </LayerGroup>
  );
}
