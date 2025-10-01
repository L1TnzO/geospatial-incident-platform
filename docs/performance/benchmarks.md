# Performance Benchmarks

Task 2.6 benchmarked the Geospatial Incident Platform schema against a 100k-incident synthetic dataset to ensure RF07 latency targets remain achievable as data volume grows. Use this guide to rerun the benchmark suite, understand index rationale, and interpret results.

## Environment

| Component        | Value                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Dataset          | Synthetic batch: 100k incidents, 60 stations, assets probability 0.6, notes probability 0.7                                 |
| Loader           | `tools/bulk_load/load_data.sh` (CSV inputs)                                                                                 |
| Database         | PostgreSQL 16 + PostGIS (Docker `db` service)                                                                               |
| Hardware         | Docker Desktop (8 vCPU, 12 GB RAM allocation)                                                                               |
| Benchmark script | [`tools/performance/benchmark.sql`](../../tools/performance/benchmark.sql)                                                  |
| Invocation       | `make db-benchmark DATABASE_URL=postgres://gis_dev:gis_dev_password@localhost:5432/gis INCIDENT_NUMBER=INC-20250709-025520` |

## Indexed Improvements

Migration [`202510010003_performance_indexes.js`](../../server/db/migrations/202510010003_performance_indexes.js) introduces:

- `idx_incidents_active_occurrence` – partial B-tree on `incidents (occurrence_at DESC)` where `is_active = TRUE` to accelerate active incident dashboards.
- `idx_incidents_occurrence_at_brin` – BRIN index on `incidents (occurrence_at)` tuned for large historical range scans.
- `idx_incident_notes_incident_id` – B-tree on `incident_notes (incident_id)` to avoid sequential scans when aggregating detail payloads.

## Query Metrics

| Query | Description                                        | Before  | After   |
| ----- | -------------------------------------------------- | ------- | ------- |
| Q1    | Active incident list (7-day window, high severity) | 0.83 ms | 0.57 ms |
| Q2    | Incident detail aggregation (assets + notes)       | 21 ms   | 0.28 ms |
| Q3    | Station workload summary                           | 6.8 ms  | 4.9 ms  |
| Q4    | 30-day severity histogram                          | 42 ms   | 31 ms   |

Timings are from `EXPLAIN (ANALYZE, BUFFERS)` executed inside the `db` container. Results will vary with dataset size, hardware, and buffer cache state; capture before/after metrics when modifying indexes or schema.

## Running Benchmarks

1. Ensure the database is populated with a representative dataset (see [`docs/data-generation.md`](../data-generation.md) and [`docs/data-load.md`](../data-load.md)).
2. Execute:

```bash
make db-benchmark DATABASE_URL=postgres://gis_dev:gis_dev_password@localhost:5432/gis INCIDENT_NUMBER=INC-20250709-025520
```

3. Inspect the output for elapsed time, planning details, and buffer usage. Store logs under `docs/performance/runs/` (create directory as needed) to track regressions.

### Customizing

- Override `INCIDENT_NUMBER` to benchmark different incident detail payloads.
- Copy `tools/performance/benchmark.sql` and append additional workloads (e.g., daily metrics, geohash tiles) as new Q5/Q6 sections.
- Use `psql -f ... > benchmarks/<timestamp>.log` to persist output.

## Monitoring & Follow-Up

- Re-run benchmarks after major schema changes, bulk imports, or index adjustments.
- For large-scale deployments, schedule `make db-benchmark` as part of release pipelines and compare results to stored baselines.
- If Q3/Q4 timings regress, consider materialized views or incremental aggregates (e.g., `incident_daily_metrics`) to offload repeated scans.
- Evaluate JSONB GIN indexes once metadata filtering becomes part of API endpoints.

## Troubleshooting

| Symptom                          | Resolution                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `psql: command not found`        | Install PostgreSQL client locally or run benchmarks via `docker compose exec db psql ...`.                   |
| Benchmark queries return no rows | Ensure synthetic data is loaded, and adjust filters (date ranges, severity codes) to match existing data.    |
| BRIN index not used              | Run `VACUUM ANALYZE incidents;` after large loads so statistics reflect the data distribution.               |
| Significant variance across runs | Warm the buffer cache by re-running the query or disable `effective_cache_size` overrides in custom configs. |

## References

- [`docs/data-model/README.md`](../data-model/README.md) – Complete schema & pipeline documentation
- [`Makefile`](../../Makefile) – Benchmark target and supporting variables
- [`server/db/migrations/202510010003_performance_indexes.js`](../../server/db/migrations/202510010003_performance_indexes.js) – Index definitions
- [`tools/performance/benchmark.sql`](../../tools/performance/benchmark.sql) – Query suite
