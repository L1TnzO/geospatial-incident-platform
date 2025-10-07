import { useCallback, useMemo } from 'react';
import { CircleMarker, GeoJSON, LayerGroup, Tooltip } from 'react-leaflet';
import type { Feature, Polygon } from 'geojson';
import type { PathOptions } from 'leaflet';
import L from 'leaflet';
import '@/lib/leaflet';
import type {
  StrategicResponseMetricGridGroup,
  StrategicResponseMetricGroup,
  StrategicResponseMetricStationGroup,
} from '@/types/strategic';
import {
  buildResponseGridFeatureCollection,
  buildResponseStationPoints,
  formatResponseTooltip,
  type ResponseFeatureProperties,
} from './StrategicResponseOverlayLayer.utils';

interface StrategicResponseOverlayLayerProps {
  groups: StrategicResponseMetricGroup[];
  groupBy: 'grid' | 'station';
  thresholdSeconds: number;
  minAverageSeconds?: number | null;
  maxAverageSeconds?: number | null;
}

const StrategicResponseOverlayLayer = ({
  groups,
  groupBy,
  thresholdSeconds,
  minAverageSeconds,
  maxAverageSeconds,
}: StrategicResponseOverlayLayerProps) => {
  const gridGroups = useMemo(
    () =>
      groups.filter(
        (group): group is StrategicResponseMetricGridGroup => group.groupType === 'grid'
      ),
    [groups]
  );
  const stationGroups = useMemo(
    () =>
      groups.filter(
        (group): group is StrategicResponseMetricStationGroup => group.groupType === 'station'
      ),
    [groups]
  );

  const featureCollection = useMemo(
    () =>
      buildResponseGridFeatureCollection(
        gridGroups,
        thresholdSeconds,
        minAverageSeconds,
        maxAverageSeconds
      ),
    [gridGroups, thresholdSeconds, minAverageSeconds, maxAverageSeconds]
  );

  const stationPoints = useMemo(
    () =>
      buildResponseStationPoints(
        stationGroups,
        thresholdSeconds,
        minAverageSeconds,
        maxAverageSeconds
      ).filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)),
    [stationGroups, thresholdSeconds, minAverageSeconds, maxAverageSeconds]
  );

  const style = useCallback((feature?: Feature): PathOptions => {
    const properties = feature?.properties as ResponseFeatureProperties | undefined;
    if (!properties) {
      return {
        color: '#2563eb',
        weight: 1.5,
        fillColor: '#2563eb',
        fillOpacity: 0.2,
      };
    }

    const baseColor = properties.colorHex;
    const isHighlighted = properties.isThresholdExceeded;

    return {
      color: isHighlighted ? '#ef4444' : baseColor,
      weight: isHighlighted ? 3 : 1.5,
      dashArray: properties.insufficientSample ? '2 4' : undefined,
      opacity: properties.insufficientSample ? 0.6 : 0.9,
      fillColor: baseColor,
      fillOpacity: properties.insufficientSample ? 0.12 : isHighlighted ? 0.45 : 0.3,
    };
  }, []);

  const onEachFeature = useCallback(
    (feature: Feature<Polygon, ResponseFeatureProperties>, layer: L.Layer) => {
      const properties = feature.properties;
      if (!properties) {
        return;
      }

      if ('bindTooltip' in layer && typeof layer.bindTooltip === 'function') {
        layer.bindTooltip(formatResponseTooltip(properties), {
          sticky: true,
          direction: 'top',
          className: 'strategic-response-overlay__tooltip-panel',
        });
      }

      if ('on' in layer && typeof layer.on === 'function') {
        const pathLayer = layer as L.Path;
        layer.on('mouseover', () => {
          pathLayer.setStyle({
            fillOpacity: 0.5,
            weight: properties.isThresholdExceeded ? 3.5 : 2,
          });
        });
        layer.on('mouseout', () => {
          pathLayer.setStyle(style(feature));
        });
      }
    },
    [style]
  );

  if (groupBy === 'grid') {
    if (!featureCollection.features.length) {
      return null;
    }

    return <GeoJSON data={featureCollection} style={style} onEachFeature={onEachFeature} />;
  }

  if (!stationPoints.length) {
    return null;
  }

  return (
    <LayerGroup>
      {stationPoints.map((point) => (
        <CircleMarker
          key={point.groupId}
          center={[point.latitude, point.longitude]}
          pathOptions={{
            color: point.isThresholdExceeded ? '#ef4444' : point.colorHex,
            fillColor: point.colorHex,
            fillOpacity: point.insufficientSample ? 0.12 : point.isThresholdExceeded ? 0.5 : 0.3,
            opacity: point.insufficientSample ? 0.6 : 0.9,
            weight: point.isThresholdExceeded ? 3 : 2,
          }}
          radius={point.isThresholdExceeded ? 9 : 7}
        >
          <Tooltip className="strategic-response-overlay__tooltip-panel" direction="top" sticky>
            <div className="strategic-response-overlay__tooltip">
              <strong>{point.label}</strong>
              <br />
              Avg: {Math.round(point.averageSeconds)}s
              <br />
              Median: {Math.round(point.medianSeconds)}s
              <br />
              P90: {Math.round(point.p90Seconds)}s
              <br />
              Sample: {point.sampleSize.toLocaleString()}
              <br />
              Percentile: {Math.round(point.percentileRank * 100)}
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </LayerGroup>
  );
};

export default StrategicResponseOverlayLayer;
