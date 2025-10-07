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

| Command                           | Description                                                                                                                                                                      |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                    | ESLint across the monorepo using the shared root config.                                                                                                                         |
| `npm test`                        | Runs server unit tests, database integration suites, and frontend Vitest suites. Integration specs will emit skip notices if the database is unreachable.                        |
| `npm run test:server:unit`        | Backend unit tests only (`jest --runInBand`).                                                                                                                                    |
| `npm run test:server:integration` | Database-backed Jest suites under `server/tests/db`. Requires PostGIS; set `DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres` when running outside Docker.      |
| `npm run test:client`             | Full frontend Vitest suite (unit + integration).                                                                                                                                 |
| `npm run test:client:integration` | Frontend integration subset (`*.integration.test.tsx`). Alias: `npm run test:integration`.                                                                                       |
| `npm run test:client:e2e`         | Playwright browser automation covering dashboard workflows (filters → export → quick actions). Alias: `npm run test:e2e`. Requires Vite dev server; see _Frontend E2E coverage_. |

### Backend integration coverage

Backend tests under `server/tests/db/` seed fixtures that tie incidents and stations together, then verify `/api/incidents` and `/api/stations` responses, GeoJSON payloads, and filter behavior. The new suites include:

- `incidents.filters.int.test.ts` — exercises pagination, combined filters (type/severity/status/date/isActive), validation errors, and the 5 000-record window guard.
- `incidents.crud.int.test.ts` — covers `POST /api/incidents` success, timeline validation, lookup failures, and duplicate handling, ensuring caches reset after inserts.
- `incidents.api.test.ts` — baseline list/detail, metadata refresh, and search coverage shared with previous milestones.
- `dashboard.api.test.ts` — consolidates QA coverage for dashboard analytics. Tests exercise filter combinations, cache refresh behaviour, zero-data windows, CSV streaming metadata, and guardrails for export limits/column selection.
- `strategic.api.test.ts` — verifies strategic monthly, quarterly, and type timeline aggregations, hotspot grids, response-metric/priority-score endpoints (percentile + normalization), and the station coverage buffer GeoJSON output (including radius overrides and validation) across multi-year fixtures.

#### Dashboard analytics QA suite

- Run the full integration suite after provisioning the PostGIS test database:
  ```bash
  npm --prefix server run test:db
  ```
- To iterate on just the analytics specs, add `-- --runTestsByPath tests/db/dashboard.api.test.ts` to the command above.
- To target hotspot analytics specifically, run `npm --prefix server run test:db -- --runTestsByPath tests/db/strategic.api.test.ts -t hotspots`.
- To focus on the new response-metric or priority-score assertions, reuse the command above with `-t response` or `-t priority` respectively.

Ensure `DATABASE_URL` points at a database with PostGIS enabled—Docker Compose already configures this for the backend container. When the variable is not set or the database is offline, the suites log a warning and skip assertions so local development can proceed.

> **Coverage thresholds:** Jest now enforces a minimum of 85 % for statements/functions/lines and 80 % for branches at the backend level. Failing to meet these numbers will break the CI build, so keep specs in sync with new features.

Vitest integration specs live alongside the components they exercise and run headless in Node:

- `MapView.integration.test.tsx` validates the incident/station layers and detail modal wiring with mocked fetch responses.
- `DashboardPage.integration.test.tsx` stubs the `/api/incidents` and `/api/dashboard` families with MSW, then drives the KPI, charts, export banner, map quick actions, and detail modal end-to-end to ensure filter propagation works.

Run `npm run test:client:integration` (or the root alias `npm run test:integration`) to execute only these cross-component suites when iterating locally. Add `-- DashboardPage.integration.test.tsx` to focus on analytics while iterating.

### Frontend E2E coverage

Playwright scenarios live under `client/tests/e2e/` and rely on route intercepts instead of a live backend. `npm run test:client:e2e` will:

1. Launch the Vite dev server (or reuse an existing instance when not in CI).
2. Open the dashboard, apply severity/status/date filters, and assert the table issues the expected `/api/incidents` query params.
3. Perform an incident number search, verify the table refresh, and confirm the detail modal plus map state update.

Artifacts (screenshots, traces, and video) are captured automatically on failure inside `playwright-report/`.

> **First run:** install Playwright browsers once per environment with `npx playwright install`. On fresh Linux hosts you can append `--with-deps` to pull system packages.

Need visual debugging? Use `npm run test:client:e2e:headed -- dashboard` to launch Chromium while the suite executes.

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
- **Metadata cache “stuck” during tests:** Call `clearIncidentMetadataCache()` (from `client/src/services/incidentsMetaService.ts`) or hit `/api/incidents/meta?refresh=true` to invalidate the five-minute cache between assertions.
- **Playwright reports missing browsers:** Re-run `npx playwright install` (append `--with-deps` in headless Linux environments) and retry the affected suite.
