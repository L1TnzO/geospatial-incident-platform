import type { Feature, Geometry } from 'geojson';

export const parseGeometry = <T extends Geometry | null>(value: unknown): T => {
  if (value == null) {
    return null as T;
  }

  if (typeof value === 'object') {
    return value as T;
  }

  if (typeof value === 'string') {
    return JSON.parse(value) as T;
  }

  throw new Error('Unable to parse geometry column into GeoJSON value');
};

export const geometryToFeature = <T extends Geometry | null>(geometry: T): Feature<T> | null => {
  if (!geometry) {
    return null;
  }

  return {
    type: 'Feature',
    geometry,
    properties: {},
  } as Feature<T>;
};

export const parseJsonColumn = <T>(value: unknown, fallback: T): T => {
  if (value == null) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value as T;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      throw new Error('Failed to parse JSON column');
    }
  }

  return fallback;
};

export const parseNumber = (value: unknown): number | null => {
  if (value == null) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};
