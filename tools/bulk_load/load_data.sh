#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: load_data.sh [--data-dir PATH] [--database-url URL] [--skip-validation]

Options:
  --data-dir PATH       Directory containing stations.csv, incidents.csv, etc. (default: data/bulk_load_batch)
  --database-url URL    PostgreSQL connection string (default: postgres://gis_dev:gis_dev_password@localhost:5432/gis)
  --skip-validation     Load data but skip validation queries.
  -h, --help            Show this message and exit.

The script expects the PostGIS schema to exist (migrations run) and will:
  1. Recreate staging tables.
  2. COPY CSV files into staging.
  3. Run the transactional load pipeline.
  4. Execute validation queries (unless skipped).

Output is mirrored to a timestamped log file under the data directory.
EOF
}

DATA_DIR="data/bulk_load_batch"
DATABASE_URL="postgres://gis_dev:gis_dev_password@localhost:5432/gis"
RUN_VALIDATIONS=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --data-dir)
      DATA_DIR="$2"
      shift 2
      ;;
    --database-url)
      DATABASE_URL="$2"
      shift 2
      ;;
    --skip-validation)
      RUN_VALIDATIONS=false
      shift 1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql command not found. Install PostgreSQL client tools or run inside the backend container." >&2
  exit 1
fi

if [[ ! -d "$DATA_DIR" ]]; then
  echo "ERROR: Data directory '$DATA_DIR' does not exist." >&2
  exit 1
fi

DATA_DIR="$(realpath "$DATA_DIR")"
STATIONS_CSV="$DATA_DIR/stations.csv"
INCIDENTS_CSV="$DATA_DIR/incidents.csv"
UNITS_CSV="$DATA_DIR/incident_units.csv"
ASSETS_CSV="$DATA_DIR/incident_assets.csv"
NOTES_CSV="$DATA_DIR/incident_notes.csv"

for file in "$STATIONS_CSV" "$INCIDENTS_CSV" "$UNITS_CSV" "$ASSETS_CSV" "$NOTES_CSV"; do
  if [[ ! -f "$file" ]]; then
    echo "ERROR: Expected file '$file' not found." >&2
    exit 1
  fi
done

LOG_FILE="$DATA_DIR/load_report_$(date +%Y%m%dT%H%M%S).log"
mkdir -p "$(dirname "$LOG_FILE")"

echo "Logging to $LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== Bulk Load Session $(date --iso-8601=seconds) ==="
echo "Database URL: ${DATABASE_URL%%@*}@*** (hostname hidden)"
echo "Data directory: $DATA_DIR"

PSQL_CMD=(psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1)

run_sql_file() {
  local file_path="$1"
  echo "--- Running $(basename "$file_path") ---"
  "${PSQL_CMD[@]}" -f "$file_path"
}

copy_into_staging() {
  echo "--- Copying CSV files into staging schema ---"
  "${PSQL_CMD[@]}" <<SQL
\set ON_ERROR_STOP on
\copy staging.stations FROM '$STATIONS_CSV' WITH (FORMAT csv, HEADER true, NULL '')
\copy staging.incidents FROM '$INCIDENTS_CSV' WITH (FORMAT csv, HEADER true, NULL '')
\copy staging.incident_units FROM '$UNITS_CSV' WITH (FORMAT csv, HEADER true, NULL '')
\copy staging.incident_assets FROM '$ASSETS_CSV' WITH (FORMAT csv, HEADER true, NULL '')
\copy staging.incident_notes FROM '$NOTES_CSV' WITH (FORMAT csv, HEADER true, NULL '')
SQL
}

START_TS=$(date +%s)
run_sql_file "$(dirname "$0")/staging_schema.sql"
copy_into_staging
run_sql_file "$(dirname "$0")/load_pipeline.sql"
LOAD_END_TS=$(date +%s)

echo "Load duration: $((LOAD_END_TS - START_TS)) seconds"

if $RUN_VALIDATIONS; then
  run_sql_file "$(dirname "$0")/validation.sql"
else
  echo "Validation skipped."
fi

echo "=== Bulk Load Completed $(date --iso-8601=seconds) ==="
