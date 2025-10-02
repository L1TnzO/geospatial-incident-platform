import type { Feature, Point, MultiPolygon } from 'geojson';

export type StationPoint = Feature<Point>;
export type StationBoundary = Feature<MultiPolygon>;

export interface StationSummary {
  stationCode: string;
  name: string;
  battalion?: string | null;
  phone?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    region?: string | null;
    postalCode?: string | null;
  };
  isActive: boolean;
  commissionedOn?: string | null;
  decommissionedOn?: string | null;
  coverageRadiusMeters?: number | null;
  location: StationPoint;
  responseZone?: {
    zoneCode: string;
    name: string;
    boundary: StationBoundary;
  } | null;
}

export interface StationListResponse {
  data: StationSummary[];
}
