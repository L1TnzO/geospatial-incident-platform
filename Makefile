COMPOSE = docker compose
DATA_GENERATOR = python -m tools.data_generator.cli
DATA_LOADER = ./tools/bulk_load/load_data.sh

INCIDENT_COUNT ?= 10000
STATION_COUNT ?= 25
SEED ?=
FORMAT ?= csv
OUTPUT_DIR ?= data/bulk_load_batch
WINDOW_DAYS ?= 90
START_DATETIME ?=
UNITS_MIN ?= 1
UNITS_MAX ?= 3
ASSETS_PROBABILITY ?= 0.35
NOTES_PROBABILITY ?= 0.55
GEOHASH_PRECISION ?= 8
INCLUDE_UNITS ?= true
INCLUDE_ASSETS ?= true
INCLUDE_NOTES ?= true
VERBOSE ?= true
LOAD_DATA_DIR ?= data/bulk_load_batch
DATABASE_URL ?= postgres://gis_dev:gis_dev_password@localhost:5432/gis
SKIP_VALIDATION ?= false
BENCHMARK_SCRIPT ?= tools/performance/benchmark.sql
INCIDENT_NUMBER ?=
CITY_COORDS ?= tools/data_generator/cities_coords/comunas.csv
REGION_LOOKUP ?= tools/data_generator/cities_coords/regiones.csv

.PHONY: compose-up compose-down compose-stop compose-logs compose-config compose-restart db-shell db-migrate db-seed db-reset data-generate data-generate-local logs-tail
.PHONY: db-load-data db-load-data-host db-benchmark db-init db-setup-full db-shell-fixed db-verify-data backend-install
.PHONY: frontend-check-config frontend-fix-vps

compose-up:
	$(COMPOSE) up --build -d

compose-down:
	$(COMPOSE) down -v

compose-stop:
	$(COMPOSE) stop

compose-logs:
	$(COMPOSE) logs -f --tail=200

compose-config:
	$(COMPOSE) config

compose-restart:
	$(COMPOSE) down
	$(COMPOSE) up --build -d

db-shell:
	$(COMPOSE) exec db psql -U gis_dev -d gis

db-migrate:
	$(COMPOSE) run --rm backend npm run migrate:up

db-seed:
	$(COMPOSE) run --rm backend npm run db:seed

db-reset:
	$(COMPOSE) run --rm backend npm run db:reset

data-generate-local:
	$(DATA_GENERATOR) \
		--output-dir $(OUTPUT_DIR) \
		--incident-count $(INCIDENT_COUNT) \
		--station-count $(STATION_COUNT) \
		--output-format $(FORMAT) \
		--window-days $(WINDOW_DAYS) \
		--units-min $(UNITS_MIN) \
		--units-max $(UNITS_MAX) \
		--assets-probability $(ASSETS_PROBABILITY) \
		--notes-probability $(NOTES_PROBABILITY) \
		--geohash-precision $(GEOHASH_PRECISION) \
		--city-coords-file $(CITY_COORDS) \
		--region-lookup-file $(REGION_LOOKUP) \
		$(if $(SEED),--seed $(SEED),) \
		$(if $(START_DATETIME),--start-datetime $(START_DATETIME),) \
		$(if $(filter $(INCLUDE_UNITS),false),--no-include-units,) \
		$(if $(filter $(INCLUDE_ASSETS),false),--no-include-assets,) \
		$(if $(filter $(INCLUDE_NOTES),false),--no-include-notes,) \
		$(if $(filter $(VERBOSE),false),--no-verbose,)

data-generate:
	docker run --rm \
		-v "$$(pwd):/app" \
		-w /app \
		python:3.11-slim \
		bash -c "pip install --no-cache-dir -r tools/data_generator/requirements.txt && \
		python -m tools.data_generator.cli \
			--output-dir $(OUTPUT_DIR) \
			--incident-count $(INCIDENT_COUNT) \
			--station-count $(STATION_COUNT) \
			--output-format $(FORMAT) \
			--window-days $(WINDOW_DAYS) \
			--units-min $(UNITS_MIN) \
			--units-max $(UNITS_MAX) \
			--assets-probability $(ASSETS_PROBABILITY) \
			--notes-probability $(NOTES_PROBABILITY) \
			--geohash-precision $(GEOHASH_PRECISION) \
			--city-coords-file $(CITY_COORDS) \
			--region-lookup-file $(REGION_LOOKUP) \
			$(if $(SEED),--seed $(SEED),) \
			$(if $(START_DATETIME),--start-datetime $(START_DATETIME),) \
			$(if $(filter $(INCLUDE_UNITS),false),--no-include-units,) \
			$(if $(filter $(INCLUDE_ASSETS),false),--no-include-assets,) \
			$(if $(filter $(INCLUDE_NOTES),false),--no-include-notes,) \
			$(if $(filter $(VERBOSE),false),--no-verbose,)"

logs-tail:
	$(COMPOSE) logs --tail=50

db-load-data:
	$(COMPOSE) exec db bash -c "cd /data && /load_script/load_data.sh \
		--data-dir ./bulk_load_batch \
		--database-url postgres://\$$POSTGRES_USER:\$$POSTGRES_PASSWORD@localhost:5432/\$$POSTGRES_DB \
		$(if $(filter $(SKIP_VALIDATION),true),--skip-validation,)"

db-load-data-host:
	$(DATA_LOADER) \
		--data-dir $(LOAD_DATA_DIR) \
		$(if $(DATABASE_URL),--database-url $(DATABASE_URL),) \
		$(if $(filter $(SKIP_VALIDATION),true),--skip-validation,)

db-benchmark:
	psql $(DATABASE_URL) \
		$(if $(INCIDENT_NUMBER),-v incident_number='$(INCIDENT_NUMBER)',) \
		-f $(BENCHMARK_SCRIPT)

backend-install:
	@echo "=== Installing backend dependencies ==="
	$(COMPOSE) exec backend npm install || $(COMPOSE) run --rm backend npm install
	@echo "=== Backend dependencies installed ==="

db-init: backend-install
	@echo "=== Initializing database with migrations and seed data ==="
	$(COMPOSE) run --rm backend npm run migrate:up
	$(COMPOSE) run --rm backend npm run db:seed
	@echo "=== Database initialization complete ==="

db-setup-full: db-init db-load-data
	@echo "=== Full database setup complete ==="

db-restore:
	@echo "Restoring 100k records..."
	$(MAKE) data-generate INCIDENT_COUNT=100000
	$(MAKE) db-load-data

db-add-incident:
	@echo "Adding 1 incident via API..."
	@timestamp=$$(date +%s); \
	occurrence=$$(date -u -d "yesterday" +"%Y-%m-%dT12:00:00Z"); \
	reported=$$(date -u -d "yesterday" +"%Y-%m-%dT12:05:00Z"); \
	curl -s -X POST http://localhost:4000/api/incidents \
		-H "Content-Type: application/json" \
		-d "{ \
			\"incidentNumber\": \"ADD-$$timestamp\", \
			\"title\": \"Manual Incident $$timestamp\", \
			\"typeCode\": \"FIRE_STRUCTURE\", \
			\"severityCode\": \"HIGH\", \
			\"statusCode\": \"REPORTED\", \
			\"isActive\": true, \
			\"occurrenceAt\": \"$$occurrence\", \
			\"reportedAt\": \"$$reported\", \
			\"location\": { \"latitude\": -33.45, \"longitude\": -70.66 } \
		}"
	@echo "\nIncident added."

db-verify:
	@echo "📊 Verifying database data..."
	@$(COMPOSE) exec db psql -U gis_dev -d gis -c "\
		SELECT 'incidents' as table_name, COUNT(*) as count FROM incidents \
		UNION ALL SELECT 'stations', COUNT(*) FROM stations \
		UNION ALL SELECT 'incident_units', COUNT(*) FROM incident_units \
		UNION ALL SELECT 'incident_assets', COUNT(*) FROM incident_assets \
		UNION ALL SELECT 'incident_notes', COUNT(*) FROM incident_notes \
		ORDER BY table_name;"

db-api-check:
	@echo "🔍 Checking backend health..."
	@curl -s http://localhost:3000/health || echo "❌ Backend not responding"
	@echo ""
	@echo "🔍 Checking incidents endpoint..."
	@curl -s http://localhost:3000/api/incidents?limit=5 | head -c 500 || echo "❌ Incidents endpoint not responding"

frontend-check-config:
	@echo "🔍 Checking frontend environment configuration..."
	@if [ -f infra/docker/.env.frontend ]; then \
		echo "✅ Found infra/docker/.env.frontend"; \
		grep "VITE_API_BASE_URL" infra/docker/.env.frontend || echo "⚠️  VITE_API_BASE_URL not set"; \
	else \
		echo "❌ File infra/docker/.env.frontend not found"; \
		echo "   Run: cp infra/docker/.env.frontend.example infra/docker/.env.frontend"; \
	fi
	@echo ""
	@echo "💡 For VPS deployment, update VITE_API_BASE_URL to use your public IP:"
	@echo "   VITE_API_BASE_URL=http://YOUR_PUBLIC_IP:4000"
	@echo ""
	@echo "📖 See docs/FRONTEND_VPS_CONFIG.md for details"

frontend-fix-vps:
	@echo "⚙️  This will update the frontend config for VPS deployment"
	@echo ""
	@read -p "Enter your VPS public IP address: " vps_ip; \
	if [ -z "$$vps_ip" ]; then \
		echo "❌ No IP provided. Aborted."; \
		exit 1; \
	fi; \
	echo "Updating VITE_API_BASE_URL to http://$$vps_ip:4000..."; \
	if [ -f infra/docker/.env.frontend ]; then \
		sed -i.bak "s|VITE_API_BASE_URL=.*|VITE_API_BASE_URL=http://$$vps_ip:4000|g" infra/docker/.env.frontend; \
		echo "✅ Updated infra/docker/.env.frontend"; \
		echo "   Backup saved as infra/docker/.env.frontend.bak"; \
	else \
		echo "❌ File infra/docker/.env.frontend not found"; \
		exit 1; \
	fi; \
	echo ""; \
	echo "🔄 Restarting frontend container..."; \
	$(COMPOSE) restart frontend; \
	echo "✅ Done! Clear your browser cache (Ctrl+Shift+R) and reload the page."

