\echo '--- Beginning transactional bulk load ---'
BEGIN;

TRUNCATE TABLE
  incident_notes,
  incident_assets,
  incident_units,
  incidents,
  stations
RESTART IDENTITY CASCADE;

WITH parsed_stations AS (
  SELECT
    station_code,
    name,
    battalion,
    address_line_1,
    NULLIF(address_line_2, '') AS address_line_2,
    city,
    region,
    postal_code,
    phone,
    COALESCE(NULLIF(is_active, ''), 'true')::BOOLEAN AS is_active,
    NULLIF(commissioned_on, '')::DATE AS commissioned_on,
    NULLIF(decommissioned_on, '')::DATE AS decommissioned_on,
    NULLIF(response_zone_code, '') AS response_zone_code,
    NULLIF(location_lat, '')::DOUBLE PRECISION AS location_lat,
    NULLIF(location_lng, '')::DOUBLE PRECISION AS location_lng,
    location_wkt,
    NULLIF(coverage_radius_meters, '')::INTEGER AS coverage_radius_meters,
    NULLIF(created_at, '')::TIMESTAMPTZ AS created_at,
    NULLIF(updated_at, '')::TIMESTAMPTZ AS updated_at
  FROM staging.stations
), inserted_stations AS (
  INSERT INTO stations (
    station_code,
    name,
    battalion,
    address_line_1,
    address_line_2,
    city,
    region,
    postal_code,
    phone,
    is_active,
    commissioned_on,
    decommissioned_on,
    response_zone_id,
    location,
    coverage_radius_meters,
    created_at,
    updated_at
  )
  SELECT
    s.station_code,
    s.name,
    s.battalion,
    s.address_line_1,
    s.address_line_2,
    s.city,
    s.region,
    s.postal_code,
    s.phone,
    s.is_active,
    s.commissioned_on,
    s.decommissioned_on,
    rz.id AS response_zone_id,
    ST_SetSRID(ST_GeomFromText(s.location_wkt), 4326) AS location,
    s.coverage_radius_meters,
    COALESCE(s.created_at, NOW()) AS created_at,
    COALESCE(s.updated_at, NOW()) AS updated_at
  FROM parsed_stations s
  LEFT JOIN response_zones rz ON rz.zone_code = s.response_zone_code
  RETURNING id, station_code
)
SELECT 1;

CREATE TEMP TABLE staging_station_map ON COMMIT DROP AS
SELECT station_code, id FROM stations;

WITH parsed_incidents AS (
  SELECT
    incident_number,
    external_reference,
    title,
    narrative,
    type_code,
    severity_code,
    status_code,
    source_code,
    weather_condition_code,
    primary_station_code,
    NULLIF(occurrence_at, '')::TIMESTAMPTZ AS occurrence_at,
    NULLIF(reported_at, '')::TIMESTAMPTZ AS reported_at,
    NULLIF(dispatch_at, '')::TIMESTAMPTZ AS dispatch_at,
    NULLIF(arrival_at, '')::TIMESTAMPTZ AS arrival_at,
    NULLIF(resolved_at, '')::TIMESTAMPTZ AS resolved_at,
    NULLIF(location_lat, '')::DOUBLE PRECISION AS location_lat,
    NULLIF(location_lng, '')::DOUBLE PRECISION AS location_lng,
    location_wkt,
    location_geohash,
    address_line_1,
    NULLIF(address_line_2, '') AS address_line_2,
    city,
    region,
    postal_code,
    NULLIF(casualty_count, '')::SMALLINT AS casualty_count,
    NULLIF(responder_injuries, '')::SMALLINT AS responder_injuries,
    NULLIF(estimated_damage_amount, '')::NUMERIC(14,2) AS estimated_damage_amount,
    COALESCE(NULLIF(is_active, ''), 'true')::BOOLEAN AS is_active,
    NULLIF(metadata, '')::JSONB AS metadata
  FROM staging.incidents
), inserted_incidents AS (
  INSERT INTO incidents (
    incident_number,
    external_reference,
    title,
    narrative,
    type_id,
    severity_id,
    status_id,
    source_id,
    weather_condition_id,
    primary_station_id,
    occurrence_at,
    reported_at,
    dispatch_at,
    arrival_at,
    resolved_at,
    location,
    location_geohash,
    address_line_1,
    address_line_2,
    city,
    region,
    postal_code,
    casualty_count,
    responder_injuries,
    estimated_damage_amount,
    is_active,
    metadata
  )
  SELECT
    pi.incident_number,
    pi.external_reference,
    pi.title,
    pi.narrative,
    it.id AS type_id,
    sev.id AS severity_id,
    st.id AS status_id,
    src.id AS source_id,
    weather.id AS weather_condition_id,
    sm.id AS primary_station_id,
    pi.occurrence_at,
    pi.reported_at,
    pi.dispatch_at,
    pi.arrival_at,
    pi.resolved_at,
    ST_SetSRID(ST_GeomFromText(pi.location_wkt), 4326) AS location,
    pi.location_geohash,
    pi.address_line_1,
    pi.address_line_2,
    pi.city,
    pi.region,
    pi.postal_code,
    COALESCE(pi.casualty_count, 0) AS casualty_count,
    COALESCE(pi.responder_injuries, 0) AS responder_injuries,
    pi.estimated_damage_amount,
    pi.is_active,
    COALESCE(pi.metadata, '{}'::JSONB)
  FROM parsed_incidents pi
  LEFT JOIN incident_types it ON it.type_code = pi.type_code
  LEFT JOIN incident_severities sev ON sev.severity_code = pi.severity_code
  LEFT JOIN incident_statuses st ON st.status_code = pi.status_code
  LEFT JOIN incident_sources src ON src.source_code = pi.source_code
  LEFT JOIN weather_conditions weather ON weather.condition_code = pi.weather_condition_code
  LEFT JOIN staging_station_map sm ON sm.station_code = pi.primary_station_code
  RETURNING id, incident_number
)
SELECT 1;

CREATE TEMP TABLE staging_incident_map ON COMMIT DROP AS
SELECT incident_number, id FROM incidents;

INSERT INTO incident_units (
  incident_id,
  station_id,
  assignment_role,
  dispatched_at,
  cleared_at
)
SELECT
  im.id,
  sm.id,
  iu.assignment_role,
  NULLIF(iu.dispatched_at, '')::TIMESTAMPTZ,
  NULLIF(iu.cleared_at, '')::TIMESTAMPTZ
FROM staging.incident_units iu
JOIN staging_incident_map im ON im.incident_number = iu.incident_number
JOIN staging_station_map sm ON sm.station_code = iu.station_code;

INSERT INTO incident_assets (
  incident_id,
  asset_identifier,
  asset_type,
  status,
  notes
)
SELECT
  im.id,
  ia.asset_identifier,
  ia.asset_type,
  ia.status,
  ia.notes
FROM staging.incident_assets ia
JOIN staging_incident_map im ON im.incident_number = ia.incident_number;

INSERT INTO incident_notes (
  incident_id,
  author,
  note,
  created_at
)
SELECT
  im.id,
  inote.author,
  inote.note,
  NULLIF(inote.created_at, '')::TIMESTAMPTZ
FROM staging.incident_notes inote
JOIN staging_incident_map im ON im.incident_number = inote.incident_number;

COMMIT;

ANALYZE stations;
ANALYZE incidents;
ANALYZE incident_units;
ANALYZE incident_assets;
ANALYZE incident_notes;

\echo '--- Load summary ---'
SELECT 'stations' AS table_name, COUNT(*) AS row_count FROM stations
UNION ALL
SELECT 'incidents', COUNT(*) FROM incidents
UNION ALL
SELECT 'incident_units', COUNT(*) FROM incident_units
UNION ALL
SELECT 'incident_assets', COUNT(*) FROM incident_assets
UNION ALL
SELECT 'incident_notes', COUNT(*) FROM incident_notes
ORDER BY table_name;
