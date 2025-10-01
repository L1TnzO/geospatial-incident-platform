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

.PHONY: compose-up compose-down compose-stop compose-logs compose-config compose-restart db-shell db-migrate db-seed db-reset data-generate logs-tail
.PHONY: db-load-data

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
	$(COMPOSE) exec db sh -c "psql -U $$POSTGRES_USER -d $$POSTGRES_DB"

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
	$(DATA_LOADER) \
		--data-dir $(LOAD_DATA_DIR) \
		$(if $(DATABASE_URL),--database-url $(DATABASE_URL),) \
		$(if $(filter $(SKIP_VALIDATION),true),--skip-validation,)
