COMPOSE = docker compose

.PHONY: compose-up compose-down compose-stop compose-logs compose-config compose-restart db-shell db-seed logs-tail

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

db-seed:
	$(COMPOSE) run --rm backend npm run db:seed

logs-tail:
	$(COMPOSE) logs --tail=50
