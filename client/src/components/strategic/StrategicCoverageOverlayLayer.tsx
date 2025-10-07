import { useCallback, useMemo } from 'react';
import { GeoJSON } from 'react-leaflet';
import type { Feature, Polygon } from 'geojson';
import type { PathOptions } from 'leaflet';
import L from 'leaflet';
import '@/lib/leaflet';
import type { StrategicCoverageStation } from '@/types/strategic';
import {
  COVERAGE_COLOR_PALETTE,
  buildCoverageFeatureCollection,
  formatTooltipContent,
  type CoverageFeatureProperties,
} from './StrategicCoverageOverlayLayer.utils';

interface StrategicCoverageOverlayLayerProps {
  stations: StrategicCoverageStation[];
  visibleStationCodes: Set<string>;
}

const StrategicCoverageOverlayLayer = ({
  stations,
  visibleStationCodes,
}: StrategicCoverageOverlayLayerProps) => {
  const featureCollection = useMemo(
    () => buildCoverageFeatureCollection(stations, visibleStationCodes),
    [stations, visibleStationCodes]
  );

  const style = useCallback((feature?: Feature): PathOptions => {
    const properties = feature?.properties as CoverageFeatureProperties | undefined;
    const color = properties?.colorHex ?? COVERAGE_COLOR_PALETTE[0];
    return {
      color,
      weight: 2,
      opacity: 0.9,
      fillColor: color,
      fillOpacity: 0.18,
      dashArray: '4 2',
      interactive: true,
    };
  }, []);

  const onEachFeature = useCallback(
    (feature: Feature<Polygon, CoverageFeatureProperties>, layer: L.Layer) => {
      const properties = feature.properties;
      if (!properties) {
        return;
      }

      if ('bindTooltip' in layer && typeof layer.bindTooltip === 'function') {
        layer.bindTooltip(formatTooltipContent(properties), {
          sticky: true,
          direction: 'top',
          className: 'strategic-coverage-overlay__tooltip-panel',
        });
      }

      if ('on' in layer && typeof layer.on === 'function') {
        const pathLayer = layer as L.Path;
        layer.on('mouseover', () => {
          pathLayer.setStyle({ fillOpacity: 0.28, weight: 3 });
        });
        layer.on('mouseout', () => {
          pathLayer.setStyle({ fillOpacity: 0.18, weight: 2 });
        });
      }
    },
    []
  );

  if (!featureCollection.features.length) {
    return null;
  }

  return <GeoJSON data={featureCollection} style={style} onEachFeature={onEachFeature} />;
};

export default StrategicCoverageOverlayLayer;
