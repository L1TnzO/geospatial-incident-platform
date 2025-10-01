# Synthetic Data Generation Toolkit

Task 2.3 introduces a Python-based CLI for crafting synthetic datasets that align with the PostGIS schema defined in `docs/sql/initial_schema.sql`. Use this tooling to create stations, incidents, and supporting records that downstream tasks (2.4–2.6) can load directly into the database.

> Need a holistic view of the schema and pipelines? See [`docs/data-model/README.md`](./data-model/README.md).

## Project Layout

```
tools/data_generator/
├── cli.py               # Argparse CLI entry point
├── config.py            # Configuration dataclass for generation runs
├── generator.py         # Core dataset fabrication logic
├── lookups.py           # Lookup tables aligned with seeded codes
├── __init__.py
└── requirements.txt     # Pinned Python dependencies
```

Generated assets default to `data/generated/` in the repository root. Update your `.gitignore` to omit the output directory from commits (already configured).

> **Optional dependencies:** The default CSV output has no native build requirements. Choose `--output-format parquet` only after installing an additional engine such as `pyarrow` or `fastparquet`.

## Installation

1. Create and activate a virtual environment (Python 3.10+ recommended):

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:

   ```bash
   pip install -r tools/data_generator/requirements.txt
   ```

To enable Parquet output, additionally install one of:

```bash
pip install pyarrow
# or
pip install fastparquet
```

## CLI Usage

Run the generator via `python -m tools.data_generator.cli` or use the `make data-generate` helper (see below). Key options:

| Option                              | Description                                            | Default          |
| ----------------------------------- | ------------------------------------------------------ | ---------------- |
| `--output-dir`                      | Destination folder for datasets                        | `data/generated` |
| `--incident-count`                  | Total incidents to synthesize                          | `10000`          |
| `--station-count`                   | Number of stations to fabricate                        | `25`             |
| `--seed`                            | RNG seed for deterministic output                      | `None`           |
| `--output-format`                   | `csv` or `parquet` (parquet requires extra dependency) | `csv`            |
| `--window-days`                     | Historical window for incident timestamps              | `90`             |
| `--start-datetime`                  | ISO timestamp marking end of window (defaults to now)  | `None`           |
| `--[no-]include-units/assets/notes` | Toggle optional tables                                 | `True`           |
| `--units-min/units-max`             | Dispatched units per incident                          | `1` / `3`        |
| `--assets-probability`              | Probability of asset records per incident              | `0.35`           |
| `--notes-probability`               | Probability of note records per incident               | `0.55`           |
| `--geohash-precision`               | Precision for incident geohashes (3–12)                | `8`              |
| `--verbose/--no-verbose`            | Show progress bars                                     | `True`           |

### Example Commands

```bash
# CSV output with deterministic seed
python -m tools.data_generator.cli \
  --incident-count 20000 \
  --station-count 30 \
  --seed 42

# Parquet output (requires `pip install pyarrow`) with limited optional tables and custom directory
python -m tools.data_generator.cli \
  --output-dir data/bulk_load_batch_01 \
  --incident-count 5000 \
  --no-include-assets \
  --no-include-notes \
  --output-format parquet
```

### Makefile Helper

From the repository root you can invoke:

```bash
make data-generate INCIDENT_COUNT=5000 STATION_COUNT=20 SEED=123 FORMAT=csv
```

Defaults mirror the CLI, and you can pass any supported option using uppercase variable names (see Makefile comments).

## Output Schema

Each dataset mirrors database columns while using codes instead of surrogate IDs for lookups. Task 2.4 loaders can join on codes to resolve foreign keys.

- `stations.[csv|parquet]`
  - `station_code`, `name`, `battalion`, `address_line_1`, `address_line_2`, `city`, `region`, `postal_code`, `phone`, `is_active`, `commissioned_on`, `decommissioned_on`, `response_zone_code`, `location_lat`, `location_lng`, `location_wkt`, `coverage_radius_meters`, `created_at`, `updated_at`
- `incidents.[csv|parquet]`
  - `incident_number`, `external_reference`, `title`, `narrative`, `type_code`, `severity_code`, `status_code`, `source_code`, `weather_condition_code`, `primary_station_code`, `occurrence_at`, `reported_at`, `dispatch_at`, `arrival_at`, `resolved_at`, `location_lat`, `location_lng`, `location_wkt`, `location_geohash`, `address_line_1`, `address_line_2`, `city`, `region`, `postal_code`, `casualty_count`, `responder_injuries`, `estimated_damage_amount`, `is_active`, `metadata`
- `incident_units.[csv|parquet]`
  - `incident_number`, `station_code`, `assignment_role`, `dispatched_at`, `cleared_at`
- `incident_assets.[csv|parquet]` _(optional)_
  - `incident_number`, `asset_identifier`, `asset_type`, `status`, `notes`
- `incident_notes.[csv|parquet]` _(optional)_
  - `incident_number`, `author`, `note`, `created_at`

### Geometry Handling

Geometry columns are exported as Well-Known Text (`location_wkt`). During Task 2.4 bulk loads, convert WKT to PostGIS geometries via `ST_GeomFromText(location_wkt, 4326)` or `ST_SetSRID(ST_GeomFromText(...), 4326)`.

Geohashes (`location_geohash`) use the precision specified via `--geohash-precision` and follow the `pygeohash` implementation.

## Integration Notes

1. **Lookup Codes:** Incident type/severity/status/source/weather codes strictly match seeded values from `server/db/seeds/000_lookup_data.js`.
2. **Foreign Keys:** `primary_station_code` and `incident_units.station_code` reference station codes—map them to station IDs during load.
3. **Chronology:** Timestamps maintain ordering (`occurrence <= reported <= dispatch <= arrival <= resolved`). Resolved timestamps are omitted when the incident status is `REPORTED`, `DISPATCHED`, or `ON_SCENE` to reflect in-progress responses.
4. **Scalability:** CLI runs comfortably up to ~1M incidents on modern hardware; disable progress bars (`--no-verbose`) for slightly faster throughput when running headless.
5. **Data Privacy:** All generated values are synthetic; address/phone outputs leverage Faker and do not reference real entities.

## Linking to Bulk Load (Task 2.4)

- Use the generated datasets as COPY input or pandas sources in the bulk loader.
- Create staging tables that mirror the CSV/Parquet schema, then transform codes to surrogate keys via joins against lookup tables.
- The generator can run on CI or pipeline hosts—install dependencies via `pip install -r tools/data_generator/requirements.txt` before execution.

## Troubleshooting

- **Module not found:** Confirm the virtual environment is active and dependencies are installed with the correct Python version.
- **Shapely/GEOS issues:** If native builds fail, ensure GEOS libraries are present or use manylinux wheels (default for Python ≥3.10).
- **Large parquet output:** Leverage `FORMAT=parquet` (default) for faster writes and smaller files. CSV mode sacrifices compression for compatibility.

For enhancements or bug fixes, open an issue referencing Task 2.3 in the Implementation Plan.
