\pset pager off
\pset footer off
\timing on

\if :{?incident_number}
\else
  \set incident_number 'INC-20250709-025520'
\endif

\echo '====================================================================='
\echo 'Q1: Active incidents (last 7 days, high severity, limit 50)'
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  i.id,
  i.incident_number,
  i.occurrence_at,
  sev.severity_code,
  st.name AS station_name
FROM incidents i
JOIN incident_severities sev ON sev.id = i.severity_id
LEFT JOIN stations st ON st.id = i.primary_station_id
WHERE i.is_active = TRUE
  AND i.occurrence_at >= NOW() - INTERVAL '7 days'
  AND sev.severity_code IN ('HIGH','CRITICAL','SEVERE')
ORDER BY i.occurrence_at DESC
LIMIT 50;

\echo '====================================================================='
\echo 'Q2: Incident detail (with assets and notes aggregation)'
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  i.id,
  i.incident_number,
  i.title,
  i.narrative,
  i.occurrence_at,
  i.reported_at,
  i.dispatch_at,
  i.arrival_at,
  i.resolved_at,
  i.is_active,
  it.type_code,
  sev.severity_code,
  st.station_code,
  src.source_code,
  jsonb_agg(DISTINCT jsonb_build_object('asset_identifier', ia.asset_identifier, 'asset_type', ia.asset_type, 'status', ia.status))
    FILTER (WHERE ia.incident_id IS NOT NULL) AS assets,
  jsonb_agg(DISTINCT jsonb_build_object('author', n.author, 'note', n.note, 'created_at', n.created_at))
    FILTER (WHERE n.incident_id IS NOT NULL) AS notes
FROM incidents i
JOIN incident_types it ON it.id = i.type_id
JOIN incident_severities sev ON sev.id = i.severity_id
LEFT JOIN stations st ON st.id = i.primary_station_id
LEFT JOIN incident_sources src ON src.id = i.source_id
LEFT JOIN incident_assets ia ON ia.incident_id = i.id
LEFT JOIN incident_notes n ON n.incident_id = i.id
WHERE i.incident_number = :'incident_number'
GROUP BY i.id, it.type_code, sev.severity_code, st.station_code, src.source_code;

\echo '====================================================================='
\echo 'Q3: Station workload summary (active vs. closed incident counts)'
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  s.id,
  s.station_code,
  s.name,
  COUNT(*) FILTER (WHERE i.is_active) AS active_incidents,
  COUNT(*) FILTER (WHERE NOT i.is_active) AS closed_incidents
FROM stations s
LEFT JOIN incidents i ON i.primary_station_id = s.id
GROUP BY s.id
ORDER BY active_incidents DESC
LIMIT 20;

\echo '====================================================================='
\echo 'Q4: 30-day severity histogram'
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  date_trunc('day', i.occurrence_at) AS day,
  sev.severity_code,
  COUNT(*) AS incident_count
FROM incidents i
JOIN incident_severities sev ON sev.id = i.severity_id
WHERE i.occurrence_at >= NOW() - INTERVAL '30 days'
GROUP BY 1, 2
ORDER BY day DESC, severity_code;
