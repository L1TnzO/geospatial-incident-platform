-- Reset staging schema for synthetic dataset loads.
DROP SCHEMA IF EXISTS staging CASCADE;
CREATE SCHEMA staging;

CREATE TABLE staging.stations (
  station_code TEXT PRIMARY KEY,
  name TEXT,
  battalion TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  region TEXT,
  postal_code TEXT,
  phone TEXT,
  is_active TEXT,
  commissioned_on TEXT,
  decommissioned_on TEXT,
  response_zone_code TEXT,
  location_lat TEXT,
  location_lng TEXT,
  location_wkt TEXT,
  coverage_radius_meters TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE staging.incidents (
  incident_number TEXT PRIMARY KEY,
  external_reference TEXT,
  title TEXT,
  narrative TEXT,
  type_code TEXT,
  severity_code TEXT,
  status_code TEXT,
  source_code TEXT,
  weather_condition_code TEXT,
  primary_station_code TEXT,
  occurrence_at TEXT,
  reported_at TEXT,
  dispatch_at TEXT,
  arrival_at TEXT,
  resolved_at TEXT,
  location_lat TEXT,
  location_lng TEXT,
  location_wkt TEXT,
  location_geohash TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  region TEXT,
  postal_code TEXT,
  casualty_count TEXT,
  responder_injuries TEXT,
  estimated_damage_amount TEXT,
  is_active TEXT,
  metadata TEXT
);

CREATE TABLE staging.incident_units (
  incident_number TEXT,
  station_code TEXT,
  assignment_role TEXT,
  dispatched_at TEXT,
  cleared_at TEXT
);

CREATE TABLE staging.incident_assets (
  incident_number TEXT,
  asset_identifier TEXT,
  asset_type TEXT,
  status TEXT,
  notes TEXT
);

CREATE TABLE staging.incident_notes (
  incident_number TEXT,
  author TEXT,
  note TEXT,
  created_at TEXT
);
