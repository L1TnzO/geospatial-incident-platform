import type { Feature, FeatureCollection, Polygon } from 'geojson';
import type {
  StrategicResponseMetricGridGroup,
  StrategicResponseMetricStationGroup,
} from '@/types/strategic';

export interface ResponseFeatureProperties {
  groupId: string;
  label: string;
  averageSeconds: number;
  medianSeconds: number;
  p90Seconds: number;
  sampleSize: number;
  percentileRank: number;
  insufficientSample: boolean;
  colorHex: string;
  isThresholdExceeded: boolean;
}

export interface ResponseStationPoint {
  groupId: string;
  label: string;
  latitude: number;
  longitude: number;
  averageSeconds: number;
  medianSeconds: number;
  p90Seconds: number;
  sampleSize: number;
  percentileRank: number;
  insufficientSample: boolean;
  colorHex: string;
  isThresholdExceeded: boolean;
}

export const RESPONSE_GRADIENT_STOPS: Array<{ stop: number; color: string }> = [
  { stop: 0, color: '#22c55e' },
  { stop: 0.25, color: '#84cc16' },
  { stop: 0.5, color: '#eab308' },
  { stop: 0.75, color: '#f97316' },
  { stop: 1, color: '#ef4444' },
];

const normalize = (value: number, min?: number | null, max?: number | null) => {
  if (min === null || max === null || min === undefined || max === undefined) {
    return 0.5;
  }
  if (max <= min) {
    return 0.5;
  }
  const clamped = Math.min(Math.max(value, min), max);
  return (clamped - min) / (max - min);
};

const interpolateColor = (value: number) => {
  const clamped = Math.min(1, Math.max(0, value));
  const upperIndex = RESPONSE_GRADIENT_STOPS.findIndex((stop) => stop.stop >= clamped);
  if (upperIndex <= 0) {
    return RESPONSE_GRADIENT_STOPS[0]?.color ?? '#22c55e';
  }
  const lower = RESPONSE_GRADIENT_STOPS[upperIndex - 1];
  const upper = RESPONSE_GRADIENT_STOPS[upperIndex];
  if (!lower || !upper) {
    return RESPONSE_GRADIENT_STOPS[RESPONSE_GRADIENT_STOPS.length - 1]?.color ?? '#ef4444';
  }
  const range = upper.stop - lower.stop;
  const factor = range === 0 ? 0 : (clamped - lower.stop) / range;

  const mixChannel = (start: number, end: number) => Math.round(start + (end - start) * factor);
  const hexToRgb = (hex: string) => {
    const normalized = hex.replace('#', '');
    const intVal = Number.parseInt(normalized, 16);
    return {
      r: (intVal >> 16) & 255,
      g: (intVal >> 8) & 255,
      b: intVal & 255,
    };
  };

  const lowerRgb = hexToRgb(lower.color);
  const upperRgb = hexToRgb(upper.color);
  return `#${[
    mixChannel(lowerRgb.r, upperRgb.r),
    mixChannel(lowerRgb.g, upperRgb.g),
    mixChannel(lowerRgb.b, upperRgb.b),
  ]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`;
};

export const buildResponseGridFeatureCollection = (
  groups: StrategicResponseMetricGridGroup[],
  thresholdSeconds: number,
  minAverageSeconds?: number | null,
  maxAverageSeconds?: number | null
): FeatureCollection<Polygon, ResponseFeatureProperties> => {
  const features: Feature<Polygon, ResponseFeatureProperties>[] = groups.map((group) => {
    const normalized = normalize(group.averageSeconds, minAverageSeconds, maxAverageSeconds);
    const color = group.insufficientSample ? '#94a3b8' : interpolateColor(normalized);
    return {
      type: 'Feature',
      geometry: group.cell.geometry.geometry,
      properties: {
        groupId: group.cell.cellId,
        label: `Cell ${group.cell.cellId}`,
        averageSeconds: group.averageSeconds,
        medianSeconds: group.medianSeconds,
        p90Seconds: group.p90Seconds,
        sampleSize: group.sampleSize,
        percentileRank: group.percentileRank,
        insufficientSample: group.insufficientSample,
        colorHex: color,
        isThresholdExceeded: !group.insufficientSample && group.averageSeconds >= thresholdSeconds,
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
};

export const buildResponseStationPoints = (
  groups: StrategicResponseMetricStationGroup[],
  thresholdSeconds: number,
  minAverageSeconds?: number | null,
  maxAverageSeconds?: number | null
): ResponseStationPoint[] => {
  return groups
    .map((group) => {
      const coordinates = group.station.location;
      if (!coordinates) {
        return null;
      }
      const normalized = normalize(group.averageSeconds, minAverageSeconds, maxAverageSeconds);
      const color = group.insufficientSample ? '#94a3b8' : interpolateColor(normalized);
      return {
        groupId: group.station.code,
        label: group.station.name
          ? `${group.station.name} (${group.station.code})`
          : group.station.code,
        latitude: coordinates?.latitude ?? 0,
        longitude: coordinates?.longitude ?? 0,
        averageSeconds: group.averageSeconds,
        medianSeconds: group.medianSeconds,
        p90Seconds: group.p90Seconds,
        sampleSize: group.sampleSize,
        percentileRank: group.percentileRank,
        insufficientSample: group.insufficientSample,
        colorHex: color,
        isThresholdExceeded: !group.insufficientSample && group.averageSeconds >= thresholdSeconds,
      };
    })
    .filter((point): point is ResponseStationPoint => Boolean(point));
};

export const formatResponseTooltip = (
  properties: ResponseFeatureProperties | ResponseStationPoint
) => {
  const percentile = Math.round(properties.percentileRank * 100);
  const listItems = [
    `Avg: ${Math.round(properties.averageSeconds)}s`,
    `Median: ${Math.round(properties.medianSeconds)}s`,
    `P90: ${Math.round(properties.p90Seconds)}s`,
    `Sample: ${properties.sampleSize.toLocaleString()}`,
    `Percentile: ${percentile}`,
  ];

  return (
    `<div class="strategic-response-overlay__tooltip">` +
    `<strong>${properties.label}</strong><br />` +
    listItems.join('<br />') +
    `</div>`
  );
};
