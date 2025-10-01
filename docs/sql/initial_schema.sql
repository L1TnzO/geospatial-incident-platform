-- Geospatial Incident Platform - Initial PostGIS Schema
-- Aligns with RF01-RF05 and prepares downstream Tasks 2.2-2.6

BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- For UUID generation if needed downstream

SET search_path TO public;

-- Lookup tables -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS incident_types (
    id SERIAL PRIMARY KEY,
    type_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incident_severities (
    id SERIAL PRIMARY KEY,
    severity_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    priority SMALLINT NOT NULL CHECK (priority BETWEEN 1 AND 5),
    color_hex CHAR(7) NOT NULL DEFAULT '#000000',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incident_statuses (
    id SERIAL PRIMARY KEY,
    status_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incident_sources (
    id SERIAL PRIMARY KEY,
    source_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weather_conditions (
    id SERIAL PRIMARY KEY,
    condition_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS response_zones (
    id SERIAL PRIMARY KEY,
    zone_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    boundary geometry(MultiPolygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Core entities -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS stations (
    id BIGSERIAL PRIMARY KEY,
    station_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    battalion TEXT,
    address_line_1 TEXT,
    address_line_2 TEXT,
    city TEXT,
    region TEXT,
    postal_code TEXT,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    commissioned_on DATE,
    decommissioned_on DATE,
    response_zone_id INTEGER REFERENCES response_zones(id) ON UPDATE CASCADE ON DELETE SET NULL,
    location geometry(Point, 4326) NOT NULL,
    coverage_radius_meters INTEGER CHECK (coverage_radius_meters > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
    id BIGSERIAL PRIMARY KEY,
    incident_number TEXT NOT NULL UNIQUE,
    external_reference TEXT,
    title TEXT NOT NULL,
    narrative TEXT,
    type_id INTEGER NOT NULL REFERENCES incident_types(id) ON UPDATE CASCADE,
    severity_id INTEGER NOT NULL REFERENCES incident_severities(id) ON UPDATE CASCADE,
    status_id INTEGER NOT NULL REFERENCES incident_statuses(id) ON UPDATE CASCADE,
    source_id INTEGER REFERENCES incident_sources(id) ON UPDATE CASCADE,
    weather_condition_id INTEGER REFERENCES weather_conditions(id) ON UPDATE CASCADE,
    primary_station_id BIGINT REFERENCES stations(id) ON UPDATE CASCADE ON DELETE SET NULL,
    occurrence_at TIMESTAMPTZ NOT NULL,
    reported_at TIMESTAMPTZ NOT NULL,
    dispatch_at TIMESTAMPTZ,
    arrival_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    location geometry(Point, 4326) NOT NULL,
    location_geohash TEXT,
    address_line_1 TEXT,
    address_line_2 TEXT,
    city TEXT,
    region TEXT,
    postal_code TEXT,
    casualty_count SMALLINT NOT NULL DEFAULT 0 CHECK (casualty_count >= 0),
    responder_injuries SMALLINT NOT NULL DEFAULT 0 CHECK (responder_injuries >= 0),
    estimated_damage_amount NUMERIC(14,2) CHECK (estimated_damage_amount >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_incident_temporal
        CHECK (
            occurrence_at <= reported_at
            AND (dispatch_at IS NULL OR reported_at <= dispatch_at)
            AND (
                arrival_at IS NULL
                OR dispatch_at IS NULL
                OR dispatch_at <= arrival_at
            )
            AND (
                resolved_at IS NULL
                OR arrival_at IS NULL
                OR arrival_at <= resolved_at
            )
        )
);

CREATE TABLE IF NOT EXISTS incident_units (
    id BIGSERIAL PRIMARY KEY,
    incident_id BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    station_id BIGINT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    assignment_role TEXT,
    dispatched_at TIMESTAMPTZ,
    cleared_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (incident_id, station_id, assignment_role)
);

CREATE TABLE IF NOT EXISTS incident_assets (
    id BIGSERIAL PRIMARY KEY,
    incident_id BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    asset_identifier TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    status TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (incident_id, asset_identifier)
);

CREATE TABLE IF NOT EXISTS incident_notes (
    id BIGSERIAL PRIMARY KEY,
    incident_id BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    author TEXT NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Analytics supporting tables -------------------------------------------

CREATE TABLE IF NOT EXISTS incident_daily_metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_date DATE NOT NULL,
    type_id INTEGER REFERENCES incident_types(id) ON DELETE SET NULL,
    severity_id INTEGER REFERENCES incident_severities(id) ON DELETE SET NULL,
    station_id BIGINT REFERENCES stations(id) ON DELETE SET NULL,
    incident_count INTEGER NOT NULL CHECK (incident_count >= 0),
    average_response_minutes NUMERIC(8,2),
    average_resolution_minutes NUMERIC(8,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (metric_date, type_id, severity_id, station_id)
);

CREATE TABLE IF NOT EXISTS incident_geohash_tiles (
    geohash TEXT PRIMARY KEY,
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 1 AND 12),
    centroid geometry(Point, 4326) NOT NULL,
    boundary geometry(Polygon, 4326) NOT NULL,
    incident_count INTEGER NOT NULL DEFAULT 0 CHECK (incident_count >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing --------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_stations_location ON stations USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_stations_zone ON stations (response_zone_id);
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_incidents_occurrence_at ON incidents (occurrence_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents (type_id);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents (severity_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents (status_id);
CREATE INDEX IF NOT EXISTS idx_incidents_station ON incidents (primary_station_id);
CREATE INDEX IF NOT EXISTS idx_incidents_geohash ON incidents (location_geohash);
CREATE INDEX IF NOT EXISTS idx_incident_units_station ON incident_units (station_id);
CREATE INDEX IF NOT EXISTS idx_incident_units_incident ON incident_units (incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_daily_metrics_date ON incident_daily_metrics (metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_incident_geohash_tiles_resolution ON incident_geohash_tiles (resolution);

-- Triggers --------------------------------------------------------------

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_stations_updated_at'
    ) THEN
        CREATE TRIGGER set_stations_updated_at
            BEFORE UPDATE ON stations
            FOR EACH ROW
            EXECUTE FUNCTION touch_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_incidents_updated_at'
    ) THEN
        CREATE TRIGGER set_incidents_updated_at
            BEFORE UPDATE ON incidents
            FOR EACH ROW
            EXECUTE FUNCTION touch_updated_at();
    END IF;
END;
$$;

COMMIT;
