import type { Feature, FeatureCollection, Polygon } from 'geojson';
import type { StrategicHotspotCell } from '@/types/strategic';

export interface HotspotFeatureProperties {
  cellId: string;
  intensity: number;
  scaledIntensity: number;
  incidentCount: number;
  centroid: {
    latitude: number;
    longitude: number;
  };
}

export const HOTSPOT_GRADIENT_STOPS: Array<{ stop: number; color: string }> = [
  { stop: 0, color: '#0ea5e9' },
  { stop: 0.25, color: '#6366f1' },
  { stop: 0.5, color: '#9333ea' },
  { stop: 0.75, color: '#f97316' },
  { stop: 1, color: '#dc2626' },
];

export const buildHotspotFeatureCollection = (
  cells: StrategicHotspotCell[],
  intensityScale: number
): FeatureCollection<Polygon, HotspotFeatureProperties> => {
  const features: Feature<Polygon, HotspotFeatureProperties>[] = cells.map((cell) => {
    const scaledIntensity = Math.min(1, Math.max(0, Math.pow(cell.intensity, intensityScale)));
    return {
      type: 'Feature',
      geometry: cell.geometry.geometry,
      properties: {
        ...(cell.geometry.properties ?? {}),
        cellId: cell.cellId,
        intensity: cell.intensity,
        scaledIntensity,
        incidentCount: cell.incidentCount,
        centroid: cell.centroid,
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
};
