# Bulk Data Load & Validation

Task 2.4 introduces a repeatable workflow for moving synthetic CSV datasets into the PostGIS schema and validating the results. The tooling lives under `tools/bulk_load/` and automates staging, transformation, loading, and verification.

> For schema context, lookup references, and performance guidance, review [`docs/data-model/README.md`](./data-model/README.md).

## Prerequisites

- PostGIS container running locally: `docker compose up db -d`
- PostgreSQL client (`psql`) installed on the host
- Database schema migrated and lookup seeds applied:
  ```bash
  docker compose run --rm backend sh -c "npm install && npm run migrate:up"
  docker compose run --rm backend sh -c "npm install && npm run db:seed"
  ```
- Synthetic dataset generated with the Python CLI (CSV output)
  ```bash
  .venv/bin/python -m tools.data_generator.cli \
    --incident-count 20000 \
    --station-count 40 \
    --seed 4242 \
    --output-format csv \
    --assets-probability 0.6 \
    --notes-probability 0.7 \
    --output-dir data/bulk_load_batch
  ```

## Running the Loader

The `load_data.sh` orchestrator accepts the dataset directory and an optional `DATABASE_URL` (defaults to the Docker Compose credentials).

```bash
# From repository root
./tools/bulk_load/load_data.sh \
  --data-dir data/bulk_load_batch \
  --database-url postgres://gis_dev:gis_dev_password@localhost:5432/gis
```

What the script does:

1. Recreates staging tables (`staging_schema.sql`).
2. Uses `\copy` to ingest CSV files into staging.
3. Executes `load_pipeline.sql`, which truncates production fact tables and repopulates them with transformed data (geometry conversion, lookup joins, JSON casting, etc.).
4. Runs `validation.sql` to emit row counts, referential integrity checks, and geometry validation statistics.

All console output is mirrored into `data/<batch>/load_report_<timestamp>.log` for auditing.

### Makefile Helper

A convenience target wires the loader into existing tooling:

```bash
make db-load-data DATA_DIR=data/bulk_load_batch DATABASE_URL=postgres://gis_dev:gis_dev_password@localhost:5432/gis
```

Set `SKIP_VALIDATION=true` to bypass the validation step (useful for faster iterative loads):

```bash
make db-load-data DATA_DIR=data/bulk_load_batch SKIP_VALIDATION=true
```

## Validation Artifacts

The validation script records:

- Production vs. staging row counts for every table.
- Referential integrity checks (missing station or incident references).
- Geometry validity (via `ST_IsValid`) and SRID compliance.
- Severity/type distributions and temporal windows for sanity checks.

Report logs capture both the load summary emitted by `load_pipeline.sql` and the validation queries, enabling diffable snapshots across runs.

## Troubleshooting

| Symptom                                        | Resolution                                                                                                                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `psql: could not connect`                      | Confirm the PostGIS container is running and `DATABASE_URL` points to the exposed host port (defaults to `5432` or `POSTGIS_HOST_PORT`).                                            |
| `relation "incident_types" does not exist`     | Run database migrations (`npm run migrate:up`) inside the backend container.                                                                                                        |
| `psql: \copy: ERROR: invalid input syntax`     | Ensure the dataset directory matches the generated CSV schema and was produced with the latest generator. Delete staging schema (`load_data.sh` does this automatically) and retry. |
| Validation reports non-zero missing references | Verify lookup seeds were applied and that the dataset uses supported codes (the generator ships with alignments for Task 2.3).                                                      |

## Next Steps

- Extend the pipeline to populate derived tables such as `incident_daily_metrics` or `incident_geohash_tiles`.
- Integrate the loader into CI or a scheduled job for automated refreshes once production workflows are defined.
