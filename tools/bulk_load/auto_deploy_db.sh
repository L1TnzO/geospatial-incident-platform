#!/usr/bin/env bash
set -euo pipefail

# Configuration
DATA_DIR="data/bulk_load_batch"
GENERATED_DIR="data/generated"
DB_CONTAINER="gip-postgis"
DB_USER="${POSTGRES_USER:-gis_dev}"
DB_NAME="${POSTGRES_DB:-gis}"

echo "=== Auto Deploy DB Check ==="

# Ensure we are in the project root
cd "$(dirname "$0")/../.."

# 1. Check if DB container is running
if ! docker compose ps --services --filter "status=running" | grep -q "db"; then
    echo "Starting Database container..."
    docker compose up -d db
    echo "Waiting for Database to be ready..."
    sleep 10
    until docker compose exec -T db pg_isready -U "$DB_USER" -d "$DB_NAME"; do
        echo "Waiting for DB..."
        sleep 5
    done
fi

# 2. Check if data exists
echo "Checking if database has data..."
ROW_COUNT=$(docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'incidents';")

HAS_DATA="false"
if [[ "$ROW_COUNT" == "1" ]]; then
    COUNT=$(docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT count(*) FROM incidents;")
    if [[ "$COUNT" -gt 0 ]]; then
        HAS_DATA="true"
        echo "Database already has $COUNT incidents. Skipping generation and load."
    fi
fi

if [[ "$HAS_DATA" == "false" ]]; then
    echo "Database appears empty or missing tables. Proceeding with initialization."

    # 3. Generate Data
    echo "--- Generating Synthetic Data (via Docker) ---"
    
    # Run generation inside a Python container to avoid host dependency issues
    docker run --rm \
        -v "$(pwd):/app" \
        -w /app \
        python:3.11-slim \
        bash -c "pip install --no-cache-dir -r tools/data_generator/requirements.txt && \
                 python -m tools.data_generator.cli \
                    --incident-count 100000 \
                    --station-count 100 \
                    --seed 4242 \
                    --city-coords-file tools/data_generator/cities_coords/comunas.csv \
                    --output-format csv \
                    --output-dir $DATA_DIR"

    # Fix ownership of generated files (since they were created by root in container)
    docker run --rm \
        -v "$(pwd):/app" \
        python:3.11-slim \
        chown -R $(id -u):$(id -g) /app/$DATA_DIR

    # 4. Load Data
    echo "--- Loading Data ---"
    # Ensure permissions for the container to read files
    chmod -R 755 "$DATA_DIR"
    
    # Run the load script inside the container
    docker compose exec -T db bash -c "cd /data && /load_script/load_data.sh \
        --data-dir ./bulk_load_batch \
        --database-url postgres://$DB_USER:\$POSTGRES_PASSWORD@localhost:5432/$DB_NAME"
        
    echo "Data load complete."
else
    echo "Database is populated. No action needed."
fi

echo "=== DB Deployment Finished ==="
