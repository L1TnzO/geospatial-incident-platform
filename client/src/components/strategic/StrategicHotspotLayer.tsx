import { useCallback, useMemo } from 'react';
import { GeoJSON } from 'react-leaflet';
import type { Feature } from 'geojson';
import type { PathOptions } from 'leaflet';
import L from 'leaflet';
import type { StrategicHotspotCell } from '@/types/strategic';
import {
  HOTSPOT_GRADIENT_STOPS,
  buildHotspotFeatureCollection,
  type HotspotFeatureProperties,
} from './StrategicHotspotLayer.utils';

interface StrategicHotspotLayerProps {
  cells: StrategicHotspotCell[];
  intensityScale: number;
}

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  const bigint = Number.parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

const interpolateColor = (value: number) => {
  const clamped = Math.min(1, Math.max(0, value));
  const upperIndex = HOTSPOT_GRADIENT_STOPS.findIndex((stop) => stop.stop >= clamped);

  if (upperIndex <= 0) {
    return HOTSPOT_GRADIENT_STOPS[0]?.color ?? '#0ea5e9';
  }

  const lower = HOTSPOT_GRADIENT_STOPS[upperIndex - 1];
  const upper = HOTSPOT_GRADIENT_STOPS[upperIndex];
  if (!lower || !upper) {
    return HOTSPOT_GRADIENT_STOPS[HOTSPOT_GRADIENT_STOPS.length - 1]?.color ?? '#dc2626';
  }

  const range = upper.stop - lower.stop;
  const factor = range === 0 ? 0 : (clamped - lower.stop) / range;
  const lowerRgb = hexToRgb(lower.color);
  const upperRgb = hexToRgb(upper.color);

  const mix = (start: number, end: number) => Math.round(start + (end - start) * factor);

  return `rgb(${mix(lowerRgb.r, upperRgb.r)}, ${mix(lowerRgb.g, upperRgb.g)}, ${mix(lowerRgb.b, upperRgb.b)})`;
};
const StrategicHotspotLayer = ({ cells, intensityScale }: StrategicHotspotLayerProps) => {
  const featureCollection = useMemo(
    () => buildHotspotFeatureCollection(cells, intensityScale),
    [cells, intensityScale]
  );

  const style = useCallback((feature?: Feature): PathOptions => {
    const baseColor = 'rgba(15, 23, 42, 0.35)';
    const properties = feature?.properties as HotspotFeatureProperties | undefined;
    if (!properties) {
      return {
        color: baseColor,
        weight: 1,
        fillColor: '#0ea5e9',
        fillOpacity: 0.25,
      };
    }

    const fillIntensity = properties.scaledIntensity ?? 0;
    const fillColor = interpolateColor(fillIntensity);
    const fillOpacity = 0.35 + fillIntensity * 0.55;

    return {
      color: baseColor,
      weight: 1,
      fillColor,
      fillOpacity,
    };
  }, []);

  const onEachFeature = useCallback((feature: Feature, layer: L.Layer) => {
    const properties = feature.properties as HotspotFeatureProperties | undefined;
    if (!properties) {
      return;
    }

    const { cellId, incidentCount, intensity } = properties;
    if ('bindTooltip' in layer && typeof layer.bindTooltip === 'function') {
      layer.bindTooltip(
        `<div class="strategic-hotspot-overlay__tooltip"><strong>Cell ${cellId}</strong><br />${incidentCount.toLocaleString()} incidents<br />Intensity ${intensity.toFixed(2)}</div>`,
        {
          direction: 'center',
          sticky: true,
          className: 'strategic-hotspot-overlay__tooltip-panel',
        }
      );
    }

    if ('on' in layer && typeof layer.on === 'function') {
      layer.on('mouseover', () => {
        if ('setStyle' in layer && typeof layer.setStyle === 'function') {
          layer.setStyle({ weight: 2, color: 'rgba(15, 23, 42, 0.6)' });
        }
      });
      layer.on('mouseout', () => {
        if ('setStyle' in layer && typeof layer.setStyle === 'function') {
          layer.setStyle({ weight: 1, color: 'rgba(15, 23, 42, 0.35)' });
        }
      });
    }
  }, []);

  if (!featureCollection.features.length) {
    return null;
  }

  return <GeoJSON data={featureCollection} style={style} onEachFeature={onEachFeature} />;
};

export default StrategicHotspotLayer;
