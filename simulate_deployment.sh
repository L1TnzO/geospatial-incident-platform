#!/usr/bin/env bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting Local Deployment Simulation ===${NC}"

# 1. Clean Environment (Simulate fresh VPS)
echo -e "${BLUE}1. Cleaning up existing environment (Simulating fresh VPS)...${NC}"
docker compose down -v
rm -rf data/generated
rm -rf data/bulk_load_batch
rm -rf .venv

# Ensure scripts are executable
chmod +x tools/bulk_load/*.sh

# 2. Simulate VPS 2 (Database Node) Deployment
echo -e "${BLUE}2. Simulating VPS 2 (Database) Deployment...${NC}"

# Create necessary env files if missing
if [ ! -f infra/docker/.env.postgis ]; then
    cp infra/docker/.env.postgis.example infra/docker/.env.postgis
fi
if [ ! -f infra/docker/.env.backend ]; then
    cp infra/docker/.env.backend.example infra/docker/.env.backend
fi

# Start DB (mimicking the workflow)
echo "Starting Database container..."
docker compose up -d db

# Wait for DB to be ready
echo "Waiting for Database to be ready..."
until docker compose exec -T db pg_isready -U gis_dev -d gis; do
    echo "Waiting for DB..."
    sleep 2
done

# Run Migrations (using backend container temporarily, as per workflow)
echo "Running Migrations and Seeds..."
docker compose run --rm backend sh -c "npm install && npm run migrate:up && npm run db:seed"

# Run the Auto Deploy Script
echo -e "${GREEN}Running auto_deploy_db.sh...${NC}"
./tools/bulk_load/auto_deploy_db.sh

# 3. Simulate VPS 1 (App Node) Deployment
echo -e "${BLUE}3. Simulating VPS 1 (App) Deployment...${NC}"

# Setup Frontend Env
if [ ! -f infra/docker/.env.frontend ]; then
    cp infra/docker/.env.frontend.example infra/docker/.env.frontend
fi

# Configure Frontend (Simulating the sed commands)
# For local simulation, we use localhost
PUBLIC_IP="localhost"
API_HOST="$PUBLIC_IP"
FRONTEND_API_BASE="http://${API_HOST}:4000/api"

echo "Configuring Frontend for Local Simulation..."
# We use a temporary file to avoid messing up the real file too much, or just edit it.
# Since this is a simulation, editing the real file is what the script does.
sed -i.bak -E "s|^VITE_API_BASE_URL=.*|VITE_API_BASE_URL=${FRONTEND_API_BASE}|g" infra/docker/.env.frontend || true
if ! grep -q '^VITE_API_BASE_URL=' infra/docker/.env.frontend; then
    echo "VITE_API_BASE_URL=${FRONTEND_API_BASE}" >> infra/docker/.env.frontend
fi

# Start App Services
echo "Starting App Services..."
docker compose up -d backend frontend

# 4. Verification
echo -e "${BLUE}4. Verifying Deployment...${NC}"

echo "Waiting for Backend..."
sleep 10
if docker compose exec -T backend wget -q --spider http://localhost:4000/healthz; then
    echo -e "${GREEN}Backend is Healthy!${NC}"
else
    echo -e "${RED}Backend Health Check Failed!${NC}"
    exit 1
fi

echo -e "${GREEN}=== Simulation Completed Successfully ===${NC}"
echo "You can access the app at http://localhost:3000"
echo "To clean up, run: docker compose down -v"
