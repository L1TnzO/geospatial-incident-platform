\pset footer off
\echo '--- Row count comparison (production vs staging) ---'
SELECT 'stations' AS table_name, COUNT(*) AS production_count, (SELECT COUNT(*) FROM staging.stations) AS staging_count FROM stations
UNION ALL
SELECT 'incidents', COUNT(*), (SELECT COUNT(*) FROM staging.incidents) FROM incidents
UNION ALL
SELECT 'incident_units', COUNT(*), (SELECT COUNT(*) FROM staging.incident_units) FROM incident_units
UNION ALL
SELECT 'incident_assets', COUNT(*), (SELECT COUNT(*) FROM staging.incident_assets) FROM incident_assets
UNION ALL
SELECT 'incident_notes', COUNT(*), (SELECT COUNT(*) FROM staging.incident_notes) FROM incident_notes
ORDER BY table_name;

\echo '\n--- Referential integrity spot checks ---'
SELECT COUNT(*) AS incidents_missing_station
FROM incidents i
LEFT JOIN stations s ON s.id = i.primary_station_id
WHERE i.primary_station_id IS NULL;

SELECT COUNT(*) AS units_missing_station
FROM incident_units iu
LEFT JOIN stations s ON s.id = iu.station_id
WHERE s.id IS NULL;

SELECT COUNT(*) AS units_missing_incident
FROM incident_units iu
LEFT JOIN incidents i ON i.id = iu.incident_id
WHERE i.id IS NULL;

SELECT COUNT(*) AS assets_missing_incident
FROM incident_assets ia
LEFT JOIN incidents i ON i.id = ia.incident_id
WHERE i.id IS NULL;

SELECT COUNT(*) AS notes_missing_incident
FROM incident_notes n
LEFT JOIN incidents i ON i.id = n.incident_id
WHERE i.id IS NULL;

\echo '\n--- Geometry validation ---'
SELECT COUNT(*) AS invalid_station_geometries
FROM stations
WHERE NOT ST_IsValid(location);

SELECT COUNT(*) AS invalid_incident_geometries
FROM incidents
WHERE NOT ST_IsValid(location);

SELECT COUNT(*) AS station_incorrect_srid
FROM stations
WHERE ST_SRID(location) <> 4326;

SELECT COUNT(*) AS incident_incorrect_srid
FROM incidents
WHERE ST_SRID(location) <> 4326;

\echo '\n--- Incident severity distribution ---'
SELECT sev.severity_code, COUNT(*) AS incident_count
FROM incidents i
JOIN incident_severities sev ON sev.id = i.severity_id
GROUP BY sev.severity_code
ORDER BY sev.severity_code;

\echo '\n--- Incident type distribution ---'
SELECT it.type_code, COUNT(*) AS incident_count
FROM incidents i
JOIN incident_types it ON it.id = i.type_id
GROUP BY it.type_code
ORDER BY it.type_code;

\echo '\n--- Temporal window ---'
SELECT MIN(occurrence_at) AS first_occurrence, MAX(occurrence_at) AS last_occurrence FROM incidents;

\echo '\n--- Active vs inactive incidents ---'
SELECT is_active, COUNT(*) FROM incidents GROUP BY is_active ORDER BY is_active DESC;
