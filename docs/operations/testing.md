# Testing & Quality Gates

This guide outlines how to run automated tests for the Geospatial Incident Platform, including the new cross-surface integration suites that exercise both the API and map UI baselines.

## Prerequisites

- **Node.js 20** (matches the CI runtime) and npm.
- **PostgreSQL + PostGIS** running locally. The fastest path is the repository Docker Compose stack:
  ```bash
  make compose-up
  ```
  This provisions the PostGIS database and backend service containers with the required environment variables.
- Apply database migrations and baseline seeds before running integration tests:
  ```bash
  make db-migrate
  make db-seed
  ```

## Test suites

| Command                           | Description                                                                                                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                    | ESLint across the monorepo using the shared root config.                                                                                                                    |
| `npm test`                        | Runs server unit tests, database integration suites, and frontend Vitest suites. Integration specs will emit skip notices if the database is unreachable.                   |
| `npm run test:server:unit`        | Backend unit tests only (`jest --runInBand`).                                                                                                                               |
| `npm run test:server:integration` | Database-backed Jest suites under `server/tests/db`. Requires PostGIS; set `DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres` when running outside Docker. |
| `npm run test:client`             | Frontend unit/integration tests, including the MapView integration coverage that exercises incident/station overlays and detail modal wiring.                               |

### Backend integration coverage

Backend tests under `server/tests/db/` seed fixtures that tie incidents and stations together, then verify `/api/incidents` and `/api/stations` responses, GeoJSON payloads, and filter behavior. Ensure `DATABASE_URL` points at a database with PostGIS enabled—Docker Compose already configures this for the backend container. When the variable is not set or the database is offline, the suites log a warning and skip assertions so local development can proceed.

### Frontend integration coverage

Vitest now includes `MapView.integration.test.tsx`, which exercises the combined incidents + stations layers and detail trigger logic by mocking API responses at the fetch layer. No browser automation is required; the test runs headless in Node.

## Cleaning up

When finished, stop the Docker stack to release resources:

```bash
make compose-down
```

## Troubleshooting

- **Database connection failures:** Confirm the database container is running (`docker ps`) and `DATABASE_URL` points to it. Running `make db-migrate` is a quick smoke test.
- **PostGIS errors (e.g., `function st_geomfromtext` missing):** Ensure the database was created with PostGIS support; the provided Compose stack handles this automatically.
- **Vitest fetch warnings:** The integration tests stub `globalThis.fetch`; if additional fetches are added, update the stub in `MapView.integration.test.tsx` to handle new endpoints.
- **Slow Jest runs:** Consider exporting `PGDATABASE`/`PGUSER` pointing at a local Postgres instance instead of Docker for heavy debugging sessions.
