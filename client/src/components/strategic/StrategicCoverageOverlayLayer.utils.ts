import type { Feature, FeatureCollection, Polygon } from 'geojson';
import type { StrategicCoverageStation } from '@/types/strategic';

type CoverageFeatureProperties = {
  stationCode: string;
  stationName: string | null;
  coverageRadiusMeters: number;
  lastUpdated: string | null;
  isActive: boolean;
  colorHex: string;
};

export const COVERAGE_COLOR_PALETTE = [
  '#2563eb',
  '#f97316',
  '#10b981',
  '#9333ea',
  '#facc15',
  '#ec4899',
];

export const resolveCoverageColor = (index: number, fallback?: string | null) => {
  if (fallback) {
    return fallback;
  }
  const paletteIndex = index % COVERAGE_COLOR_PALETTE.length;
  return COVERAGE_COLOR_PALETTE[paletteIndex];
};

export const buildCoverageFeatureCollection = (
  stations: StrategicCoverageStation[],
  visibleStationCodes: Set<string>
): FeatureCollection<Polygon, CoverageFeatureProperties> => {
  const features: Feature<Polygon, CoverageFeatureProperties>[] = [];

  stations.forEach((station, index) => {
    if (!visibleStationCodes.has(station.station.code)) {
      return;
    }

    features.push({
      type: 'Feature',
      geometry: station.geometry.geometry,
      properties: {
        stationCode: station.station.code,
        stationName: station.station.name ?? station.station.code,
        coverageRadiusMeters: station.coverageRadiusMeters,
        lastUpdated: station.lastUpdated,
        isActive: station.isActive,
        colorHex: resolveCoverageColor(index, station.colorHex ?? undefined),
      },
    });
  });

  return {
    type: 'FeatureCollection',
    features,
  };
};

export const formatTooltipContent = (properties: CoverageFeatureProperties) => {
  const { stationCode, stationName, coverageRadiusMeters, lastUpdated, isActive } = properties;
  const name = stationName ?? stationCode;
  const radius = `${Math.round(coverageRadiusMeters).toLocaleString()} m`;
  const updated = lastUpdated ? new Date(lastUpdated).toLocaleString() : 'N/A';
  const status = isActive ? 'Active' : 'Inactive';
  return (
    `<div class="strategic-coverage-overlay__tooltip">` +
    `<strong>${name}</strong><br />` +
    `Coverage radius: ${radius}<br />` +
    `Status: ${status}<br />` +
    `Last updated: ${updated}</div>`
  );
};

export type { CoverageFeatureProperties };
