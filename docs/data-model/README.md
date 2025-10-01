# Data Model & Pipeline Guide

This guide documents the Geospatial Incident Platform database schema, supporting data pipelines, and performance practices so backend, data, and frontend teams can onboard quickly. It fulfills RF09 and reinforces RF04–RF07 by explaining how to migrate the schema, populate it with synthetic data, validate loads, and keep key queries fast.

## Artifacts at a Glance

| Purpose                  | Location                                                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| DDL reference            | [`docs/sql/initial_schema.sql`](../sql/initial_schema.sql)                                                                    |
| ER diagram source        | [`docs/data-model/incident_support_schema.puml`](./incident_support_schema.puml)                                              |
| Review notes             | [`docs/data-model/schema-review.md`](./schema-review.md)                                                                      |
| Knex migrations          | [`server/db/migrations`](../../server/db/migrations)                                                                          |
| Lookup seeds             | [`server/db/seeds`](../../server/db/seeds)                                                                                    |
| Synthetic data generator | [`tools/data_generator/`](../../tools/data_generator) + [`docs/data-generation.md`](../data-generation.md)                    |
| Bulk load scripts        | [`tools/bulk_load/`](../../tools/bulk_load) + [`docs/data-load.md`](../data-load.md)                                          |
| Performance suite        | [`tools/performance/benchmark.sql`](../../tools/performance/benchmark.sql), `make db-benchmark`, and Task 2.6 benchmark notes |

## Entity Overview & Relationships

- **Core incidents (RF01, RF05):** `incidents` holds lifecycle timestamps, status/severity/type references, financial impact, and geospatial coordinates stored as `geometry(Point, 4326)` with a cached geohash for tile lookups.
- **Stations & zones (RF01, RF07 prep):** `stations` captures coverage areas (`response_zone_id`) and geospatial point locations used to join incidents to response territories. `response_zones` stores multipolygon boundaries for coverage overlays.
- **Lookup catalogs (RF05, RF09):** Controlled vocabularies for types, severities, statuses, sources, and weather ensure consistent codes across synthetic data, seeds, and APIs.
- **Operational detail tables (RF01, RF09):** `incident_units`, `incident_assets`, and `incident_notes` model multi-unit responses, resource deployments, and narrative context.
- **Analytics scaffolding (RF04, RF06):** `incident_daily_metrics` and `incident_geohash_tiles` provide pre-aggregated data for dashboards and map overlays, enabling fast RF04–RF07 reporting.

> **Diagram:** Render `incident_support_schema.puml` to visualize the PlantUML ERD. See [Diagram Regeneration](#diagram-regeneration) for instructions.

## Key Table Highlights

| Table                                                          | Purpose                                                                | Notes                                                                                                  |
| -------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `incidents`                                                    | Master incident record with lifecycle timestamps and geospatial point. | Enforced chronology constraint (`chk_incident_temporal`) protects data quality (RF05).                 |
| `stations`                                                     | Fire station metadata + PostGIS point for mapping overlays.            | Trigger `set_stations_updated_at` maintains `updated_at` for ORM sync.                                 |
| `incident_types` / `incident_severities` / `incident_statuses` | Lookup catalogs powering filters & dashboards.                         | Codes align with seeds and generator outputs (RF03, RF05).                                             |
| `incident_units`                                               | Join table linking stations to incidents.                              | Unique constraint on `(incident_id, station_id, assignment_role)` prevents duplicate dispatch entries. |
| `incident_assets` / `incident_notes`                           | Optional detail tables for UI drill-downs and analytics.               | Seeded through synthetic generator toggles.                                                            |
| `incident_daily_metrics`                                       | Aggregated per-day/per-type/per-station metrics for dashboards.        | Unique constraint avoids duplicate aggregates.                                                         |
| `incident_geohash_tiles`                                       | Spatial grid cache for heatmaps & hotspot overlays.                    | Maintains centroid/boundary geometries + incident counts.                                              |

## Geospatial & Indexing Considerations

- All geography uses SRID 4326 to remain compatible with Leaflet/GeoJSON pipelines.
- PostGIS GiST indexes protect spatial filtering performance on `incidents.location`, `stations.location`, and tile boundaries.
- Task 2.6 added targeted indexes:
  - Partial B-tree on active incidents (`idx_incidents_active_occurrence`).
  - BRIN on `incidents.occurrence_at` for large historical ranges.
  - Supporting index on `incident_notes.incident_id` to accelerate aggregations.
- Refer to `docs/performance/benchmarks.md` (Task 2.6) for benchmark methodology, EXPLAIN outputs, and index rationale. Re-run after large imports or schema adjustments.

## Migration & Seeding Workflow

1. **Start the database (Docker):**
   ```bash
   make compose-up
   ```
2. **Run migrations:**
   ```bash
   make db-migrate
   ```
3. **Apply lookup seeds:**
   ```bash
   make db-seed
   ```
4. **Reset when needed:**
   ```bash
   make db-reset
   ```

All commands rely on the Docker Compose `backend` service to execute Knex CLI scripts (RF02). Ensure environment variables in `.env`/`infra/docker/.env.backend` align with your local setup.

## Synthetic Data & Bulk Load Pipeline

Follow this sequence to populate the database with large synthetic datasets:

1. **Generate data** (RF03):
   ```bash
   make data-generate INCIDENT_COUNT=20000 STATION_COUNT=40 SEED=4242 OUTPUT_DIR=data/bulk_load_batch
   ```
   See [`docs/data-generation.md`](../data-generation.md) for CLI options (CSV vs. Parquet, optional tables, RNG seeds).
2. **Load data** (RF04) using the bulk loader:
   ```bash
   make db-load-data LOAD_DATA_DIR=data/bulk_load_batch DATABASE_URL=postgres://gis_dev:gis_dev_password@localhost:5432/gis
   ```
   Validation results and logs live beside the dataset. Consult [`docs/data-load.md`](../data-load.md) for staging schema details and troubleshooting.
3. **Validate** (RF05):
   Review the loader’s validation report to confirm row counts, geometry integrity, and lookup alignment. Repeat generation + load steps as needed.

## Performance & Benchmarking

- Run the automated benchmark suite (RF07) before and after major schema/index changes:
  ```bash
  make db-benchmark DATABASE_URL=postgres://gis_dev:gis_dev_password@localhost:5432/gis INCIDENT_NUMBER=INC-20250709-025520
  ```
- The Make target executes `tools/performance/benchmark.sql`, which contains four representative queries: active incident listing, incident detail aggregation, station workload summary, and severity histogram.
- Customize `INCIDENT_NUMBER` or clone the script to profile additional workloads. Capture `EXPLAIN ANALYZE` output for regression tracking.
- When adding new indexes or adjusting existing ones, record improvements in `docs/performance/benchmarks.md` and rerun the suite on datasets of varying sizes (e.g., 20 k vs. 100 k incidents).

## Troubleshooting FAQ

| Scenario                                                  | Resolution                                                                                                                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ERROR: type "geometry" does not exist` during migrations | Ensure PostGIS extension is enabled; rerun `make db-migrate`. Compose handles extension creation, but remote databases may require manual `CREATE EXTENSION postgis`.    |
| Seeds complain about duplicate codes                      | Seeds are idempotent via `ON CONFLICT DO NOTHING`. If you see unique violations, ensure prior failed runs weren’t rolled back mid-transaction and rerun `make db-reset`. |
| Bulk load validation flags missing lookup references      | Confirm the dataset was generated with the latest lookup codes (rerun `make data-generate`) and that lookup seeds succeeded before loading.                              |
| `load_data.sh` cannot connect to database                 | Verify Docker containers are running (`docker compose ps`) and that `DATABASE_URL` points to the exposed host/port.                                                      |
| Benchmark target fails with `psql: command not found`     | Install PostgreSQL client binaries locally or execute the target via Docker (`docker compose exec db psql ...`).                                                         |
| Benchmark queries return empty plans                      | Load sample data first (`make data-generate` + `make db-load-data`) or adjust filters in `benchmark.sql` to match existing incident numbers.                             |

## Diagram Regeneration

1. Install PlantUML locally (`brew install plantuml`, `sdk install plantuml`, or use the VS Code PlantUML extension).
2. Render the ERD to PNG/SVG:
   ```bash
   plantuml -tpng docs/data-model/incident_support_schema.puml
   ```
3. Commit the generated asset (e.g., `docs/data-model/incident_support_schema.png`) for documentation portals or slides. Update this guide if the file name changes.

## Next Steps

- Sync additional analytics documentation (RF06) when ORM repositories are finalized.
- Incorporate performance snapshots into CI or scheduled jobs once infrastructure automation is available.
- Expand troubleshooting with real-world incidents from QA/production rollouts.
