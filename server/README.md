# Backend Service

This package contains the Express + TypeScript backend for the Geospatial Incident Platform. It exposes a `/healthz` route for readiness checks and is scaffolded for containerized development via Docker Compose.

## Project Structure

- `src/` – TypeScript source code
  - `config/` – environment and configuration helpers
  - `routes/` – HTTP routing modules (`/healthz` already implemented)
  - `middleware/` – shared Express middleware placeholders
- `db/` – Knex migrations, seeds, and future database utilities
- `src/db/` – TypeScript data-access layer (repositories, shared types)
- `tests/` – Jest test suites (HTTP + repository integration tests)
- `config/` – environment examples (`.env.example`) and future configuration files

> **First time here?** Follow the root [`docs/setup.md`](../docs/setup.md) guide for repository-wide prerequisites before diving into the backend service specifics below.

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+ (ships with Node 20)

### Install Dependencies

```bash
npm install
```

### Environment Configuration

The service reads environment variables from:

1. `.env` or `.env.<NODE_ENV>` in this directory (create your own as needed)
2. `config/.env.local` or `config/.env.example`
3. Repository-level `infra/docker/.env.backend` (used by Compose)

At minimum, ensure `PORT` is defined (defaults to `4000` if omitted).

### Development Server

```bash
npm run dev
```

This starts `ts-node-dev` with hot reloading. Visit [http://localhost:4000/healthz](http://localhost:4000/healthz) to verify the JSON health payload.

### Linting & Formatting

```bash
npm run lint
```

ESLint (flat config) is pre-wired with TypeScript and Prettier compatibility.

### Database Migrations & Seeds

```bash
npm run migrate:latest
npm run db:seed
```

Use `npm run db:reset` to rollback everything and rebuild from scratch. Commands honour the same `DATABASE_URL` resolution as the main service (see `knexfile.js`).

For an isolated integration-test database, create a separate PostGIS database (for example `gis_test`) and point `DATABASE_URL` at it when running migrations or seeds:

```bash
DATABASE_URL=postgres://gis_dev:gis_dev_password@localhost:5432/gis_test npm run migrate:latest
DATABASE_URL=postgres://gis_dev:gis_dev_password@localhost:5432/gis_test npm run db:seed
```

### Testing

```bash
npm test
```

Jest with Supertest validates the HTTP surface. For repository/data-access coverage (requires a PostGIS database with migrations applied), run:

```bash
npm run test:db
```

Set `DATABASE_URL` (or rely on the Docker Compose defaults) before executing the database-focused suite.

```bash
DATABASE_URL=postgres://gis_dev:gis_dev_password@localhost:5432/gis_test npm run test:db
```

The database suite now performs:

- Migration/seed smoke checks verifying lookup codes and required extensions
- Repository regression tests across seeded fixtures and a larger synthetic batch (pagination, detail joins, geometry serialization)
- Referential integrity and geometry validation queries adapted from the bulk-load pipeline
- HTTP integration tests for `/api/incidents` list/detail endpoints (pagination, filtering, error handling)
- HTTP integration tests for `/api/stations` list endpoint (metadata, geometry, boolean filters)

### Build & Production Start

```bash
npm run build
npm start
```

The build step compiles TypeScript into `dist/`, and `npm start` runs the compiled server.

## Docker Compose Integration

From the repository root you can bring up the full stack (PostGIS + backend + optional frontend):

```bash
make compose-up
```

The Compose definition mounts this directory into the `backend` service container, installs dependencies automatically, and executes `npm run dev`. Update environment files under `infra/docker/` to customize container settings. Use `make compose-down` to stop the stack and `make db-load-data` to rerun bulk data loads if you are syncing synthetic datasets.

## Data Access Layer

The TypeScript repositories under `src/db/` expose backend-ready query helpers for incidents and stations. Key entry points:

- `IncidentRepository` (`incidentRepository` singleton) – pagination/filter helpers, detail fetches, and related units/assets/notes.
- `StationRepository` (`stationRepository` singleton) – station listings with optional activity filters and response-zone GeoJSON.

Each repository returns GeoJSON `Feature` objects for geometry columns and surfaces lookup metadata (types, severities, statuses, geohashes) as plain objects. See [`../docs/backend-data-access.md`](../docs/backend-data-access.md) for method-level documentation and usage patterns.

### Service Layer

- `IncidentService` (`src/services/incidentsService.ts`) centralizes pagination defaults, filter parsing, and payload shaping for `/api/incidents`. It also supplies cached lookup metadata for `/api/incidents/meta` (5-minute TTL) and normalizes identifier lookups for `/api/incidents/search`. Controllers hand raw query params to the service, which enforces the 5 000-record window and converts repository results into response DTOs.
- `StrategicAnalyticsService` (`src/services/strategicService.ts`) powers the `/api/strategic/*` endpoints. It reuses incident filters, performs multi-month/quarter aggregations, computes growth metrics, and caches responses for five minutes. Swap the in-memory cache for Redis later without touching controllers.

Need contribution standards or CI expectations? See [`docs/contributing.md`](../docs/contributing.md).

## HTTP API

### `GET /api/incidents`

Returns a paginated list of incident summaries ordered by newest `reportedAt` first.

Query parameters:

- `page` (default `1`) – 1-based index; requests beyond the first 5,000 records are rejected.
- `pageSize` (default `25`, max `100`) – number of incidents per page.
- `typeCodes`, `severityCodes`, `statusCodes` – comma-separated (or repeated) filter lists.
- `startDate`, `endDate` – ISO-8601 range filters applied to `occurrenceAt`.
- `isActive` – boolean flag (`true|false|1|0`).

Response shape:

```json
{
  "data": [
    {
      "incidentNumber": "...",
      "title": "...",
      "occurrenceAt": "...",
      "location": { "type": "Feature", "geometry": { "type": "Point", ... } },
      "type": { "code": "FIRE_STRUCTURE", "name": "Structure Fire" },
      "severity": { "code": "CRITICAL", "priority": 4, "colorHex": "#F57C00" },
      "status": { "code": "ON_SCENE", "isTerminal": false },
      "primaryStation": { "stationCode": "STN-001", "name": "Station 1" }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 128
  }
}
```

### `GET /api/incidents/:incidentNumber`

Returns the full incident record (including units, assets, notes, metadata) for the specified incident number. Responds with `404` if the incident does not exist and `400` for malformed identifiers.

### `GET /api/incidents/meta`

Returns lookup metadata (types, severities, statuses), date range bounds, the active incident count, and the server-enforced pagination limits. Responses are cached in-memory for five minutes; the cache clears automatically on TTL expiry or via `incidentService.clearCaches()` (used by the test suite).

### `GET /api/incidents/search`

Returns a concise incident summary (title, timestamps, GeoJSON point, type/severity/status) for a specific incident number. Input is case-insensitive and limited to `A-Z0-9._:-` characters. Responds with `400` for missing/invalid identifiers and `404` when no match is found.

### `GET /api/stations`

Returns fire station metadata plus GeoJSON point geometry and optional response-zone boundaries.

Query parameters:

- `isActive` – optional boolean flag (`true|false|1|0`) restricting the list to active/inactive stations.

Response shape:

```json
{
  "data": [
    {
      "stationCode": "STN-001",
      "name": "Station 1",
      "isActive": true,
      "location": { "type": "Feature", "geometry": { "type": "Point", ... } },
      "responseZone": {
        "zoneCode": "RZ-01",
        "boundary": { "type": "Feature", "geometry": { "type": "MultiPolygon", ... } }
      }
    }
  ]
}
```

### `/api/strategic/*`

Phase 6 strategic analytics endpoints deliver longer-range trends for executive dashboards:

- `GET /api/strategic/trends/monthly` — Month-over-month incident counts with year-over-year comparisons and rolling-period totals. Accepts `months` (3–36) and shared incident filters.
- `GET /api/strategic/trends/quarters` — Quarter-over-quarter trendlines plus prior-year deltas. Accepts `quarters` (2–12) and shared incident filters.
- `GET /api/strategic/trends/types` — Incident timelines grouped by type, covering up to 24 months with optional filters.

All responses include ISO8601 period windows, growth deltas, and percentage changes where historical data exists. Inputs reuse the incident filter vocabulary (`typeCodes`, `severityCodes`, `statusCodes`, `startDate`, `endDate`, `isActive`, `incidentNumber`). Invalid windows return `400 BAD_REQUEST`. Results are cached in-memory for five minutes and automatically recomputed when outside the cached TTL or when filter parameters change.
