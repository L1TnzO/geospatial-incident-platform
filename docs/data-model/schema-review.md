# Incident & Support Schema Review Notes

## Overview

The proposed schema fulfills RF01–RF05 by organizing core incident and station data with geospatial awareness while preparing downstream migrations, data generation, and validation work. Tables reside in the `public` schema, leverage PostGIS geometry types, and follow snake_case naming for straightforward TypeScript/ORM integration.

## Key Entities & Relationships

- **Lookups:** `incident_types`, `incident_severities`, `incident_statuses`, `incident_sources`, and `weather_conditions` centralize controlled vocabularies to prevent data drift and simplify filter metadata (supports RF01, RF05, RF09).
- **Stations:** `stations` captures station metadata, activation windows, and `geometry(Point, 4326)` location. Optional `response_zones` multipolygon boundaries enable coverage overlays and spatial joins (RF01, RF07 prep).
- **Incidents:** `incidents` stores lifecycle timestamps, financial impact, casualty counts, and `geometry(Point, 4326)` location with geohash caching for tile aggregation. Multi-stage temporal check maintains chronological integrity (RF01, RF05).
- **Join & Detail Tables:** `incident_units`, `incident_assets`, and `incident_notes` document multi-station responses, equipment usage, and narrative context needed for future analytics and UI drill downs (RF01, RF09).
- **Analytics Support:**
  - `incident_daily_metrics` pre-aggregates day/type/severity/station stats for rapid dashboard queries (preps RF06–RF07).
  - `incident_geohash_tiles` maintains tile boundaries and cached incident counts for high-density map rendering (supports RF21–RF23, RF37).

## Geospatial Decisions

- PostGIS `geometry(Point, 4326)` chosen for incident/station locations to align with Leaflet/GeoJSON pipelines. SRID 4326 simplifies conversions to WGS84 lat/lng.
- `response_zones` and `incident_geohash_tiles.boundary` use polygon geometries to support coverage buffers, heatmaps, and hotspot overlays (RF37, RF40).
- GIST indexes on all geometry columns provide performant spatial filtering, while geohash caching reduces expensive aggregation work for tiled visualizations.

## Index Strategy & Constraints

- **Temporal & categorical indexes** on `incidents` (occurrence, type, severity, status, station) meet RF05 validation speed targets and prepare for RF07 benchmarking.
- **Unique constraints** on codes and bridging tables prevent duplication (e.g., `incident_units` unique composite) aiding RF05 integrity checks.
- `touch_updated_at` trigger standardizes `updated_at` management for ORM diff detection.
- Additional indexes recommended post Task 2.6 once real workload metrics are available (see Next Steps).

## Integration Notes for Task 2.2 & 2.5

- Migration tooling should create extensions (`postgis`, `pgcrypto`) before table DDL. Wrap operations in transaction-aware migrations.
- Prefer exposing table names directly to ORM (e.g., `incident_types`) to avoid future renaming friction. Primary keys use integer/bigint to align with TypeScript number type while remaining compatible with UUID adoption via `pgcrypto` if needed.
- Timestamp columns default to `NOW()` where sensible, enabling backend to rely on DB-side auditing while still allowing overrides during seeds/tests.
- Geometry columns expect GeoJSON payloads converted via `ST_GeomFromGeoJSON` or `ST_SetSRID(ST_MakePoint(lon, lat), 4326)` inside repositories.

## Assumptions & Open Questions

- **Incident lifecycle:** `reported_at` may equal `occurrence_at` for self-reported events; more granular status transitions can be layered via additional lookup entries (no extra columns needed now).
- **Weather integration:** `weather_conditions` allows optional enrichment; confirm during Task 2.3 whether synthetic generator should populate this table.
- **Incident numbering:** `incident_number` assumed unique per dataset; if multiple jurisdictions feed data, consider prefix strategy and potential composite keys.
- **Metrics refresh cadence:** `incident_daily_metrics` intended for nightly refresh; confirm scheduler approach during Task 2.6.
- **Tile cache maintenance:** Determine whether `incident_geohash_tiles` is maintained via triggers, nightly jobs, or materialized views (defer to Task 2.6).

## Next Steps & Recommendations

- **Task 2.2:** Translate this DDL into migration scripts. Include reversible down migrations and seed baseline lookup values (type/severity/status).
- **Task 2.3:** Synthetic generator should emit lookup references consistent with `*_code` fields and optionally populate `incident_units` for multi-station responses.
- **Task 2.5:** When mapping ORM models, surface geometry helpers returning both WKT and GeoJSON, and enforce fetch joins for lookup labels to minimize round trips.
- **Task 2.6:** Evaluate additional indexes (e.g., BRIN on `occurrence_at`, partial indexes for active incidents) after load testing.
- **Documentation:** Embed ERD (`incident_support_schema.puml`) in upcoming schema documentation (RF09) once rendered to PNG/SVG.

## Validation Checklist for RF05

- Use constraint checks (chronology, non-negative counts) as part of validation query set.
- Provide sample validation SQL alongside migrations, e.g., verifying `ST_IsValid(location)` and record counts per severity to ensure synthetic loads match expectations.

## Regeneration Instructions

- Modify the schema diagram by editing `docs/data-model/incident_support_schema.puml` and regenerate via PlantUML CLI or online server. Document rendering steps in future docs (Task 2.7).
