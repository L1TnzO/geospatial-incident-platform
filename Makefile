COMPOSE = docker compose
DATA_GENERATOR = python -m tools.data_generator.cli
DATA_LOADER = ./tools/bulk_load/load_data.sh

INCIDENT_COUNT ?= 10000
STATION_COUNT ?= 25
SEED ?=
FORMAT ?= csv
OUTPUT_DIR ?= data/generated
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

.PHONY: compose-up compose-down compose-stop compose-logs compose-config compose-restart db-shell db-migrate db-seed db-reset data-generate logs-tail
.PHONY: db-load-data db-load-data-host db-benchmark db-init db-setup-full db-verify db-api-check

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

data-generate:
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
		$(if $(SEED),--seed $(SEED),) \
		$(if $(START_DATETIME),--start-datetime $(START_DATETIME),) \
		$(if $(filter $(INCLUDE_UNITS),false),--no-include-units,) \
		$(if $(filter $(INCLUDE_ASSETS),false),--no-include-assets,) \
		$(if $(filter $(INCLUDE_NOTES),false),--no-include-notes,) \
		$(if $(filter $(VERBOSE),false),--no-verbose,)

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

db-init:
	@echo "=== Initializing database with migrations and seed data ==="
	$(COMPOSE) run --rm backend npm run migrate:up
	$(COMPOSE) run --rm backend npm run db:seed
	@echo "=== Database initialization complete ==="

db-setup-full: db-init db-load-data
	@echo "=== Full database setup complete ==="

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
