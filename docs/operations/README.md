# Operations

Operational runbooks, onboarding guides, and environment setup instructions for the Geospatial Incident Platform will live here. Populate this space with backend, frontend, and infrastructure procedures as they are formalized.

## Available guides

- [Setup Guide](../setup.md) — Environment prerequisites, dependency bootstrapping, and Compose workflow.
- [Contributing Guide](../contributing.md) — Branching strategy, commit conventions, and CI expectations.
- [Continuous Integration](./ci.md) — CI workflow overview, troubleshooting steps, and local reproduction tips.
- [Synthetic Data Generation](../data-generation.md) — Python CLI for producing incidents/stations datasets used in Phase 2.
- [Bulk Data Load](../data-load.md) — Staging, loading, and validation workflow for synthetic CSV batches.

## Database Migrations & Seeding

- **Tooling:** Knex manages migrations and seeds defined under `server/db/`.
- **Local usage:** Ensure the PostGIS container is running (`make compose-up` or `POSTGIS_HOST_PORT=5555 docker compose up db`) and provide a valid `DATABASE_URL` via environment variables or `server/config/.env`.
- **Commands:**
  - `npm run migrate:up` / `npm run migrate:down` — apply or roll back migrations.
  - `npm run db:seed` — insert idempotent lookup rows.
  - `npm run db:reset` — drop/recreate schema then reseed.
- **Compose helpers:** From the repo root, `make db-migrate`, `make db-seed`, and `make db-reset` run the same commands inside the backend container.
- **Host port override:** If port `5432` is busy locally, set `POSTGIS_HOST_PORT` before running Compose (e.g., `POSTGIS_HOST_PORT=5555 docker compose up db`).
