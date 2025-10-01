# Backend Data Access Layer

Task 2.5 introduces a TypeScript data-access layer that wraps Knex for PostGIS-backed queries. The modules live under `server/src/db/` and are designed for direct use in upcoming API controllers or services.

## Connection & Configuration

- `getDb()` – lazily instantiates a Knex client using `knexfile.js` and the current `NODE_ENV` (`development`, `test`, `production`).
- `closeDb()` – disposes of the shared Knex instance (useful for graceful shutdowns and Jest cleanup).
- Environment discovery mirrors the backend service: `.env`, `.env.<NODE_ENV>`, `server/config/`, and `infra/docker/` fallbacks.

> **Tip:** Set `DATABASE_URL` before running CLI commands or tests. Docker Compose already configures this for the `backend` container.

## Repositories

### IncidentRepository

```ts
import { incidentRepository } from '../src/db';

const incidents = await incidentRepository.listIncidents({
  page: 1,
  pageSize: 25,
  severityCodes: ['CRITICAL'],
  startDate: '2025-09-01T00:00:00Z',
  endDate: '2025-09-30T23:59:59Z',
});

const detail = await incidentRepository.getIncidentDetail('INC-12345');
```

Capabilities:

- **Pagination & Filtering** – filter by type, severity, status, active flag, and occurrence date window.
- **Lookup Metadata** – returns type/severity/status/source/weather information as structured objects.
- **Geometry Handling** – incident locations are surfaced as GeoJSON `Feature<Point>` objects. `location_geohash` is included for map bucketing.
- **Detail View** – fetches units, assets, and notes for an incident, along with JSON metadata.

### StationRepository

```ts
import { stationRepository } from '../src/db';

const stations = await stationRepository.listStations({ isActive: true });
```

Features:

- Lists fire stations with optional `isActive` filtering.
- Includes contact/address fields, coverage radius, and GeoJSON `Feature<Point>` locations.
- Joins response zones, returning GeoJSON `Feature<MultiPolygon>` boundaries when available.

## Services

### IncidentService

Located at `server/src/services/incidentsService.ts`, the service layer wraps `IncidentRepository` to centralize pagination defaults, filter parsing, and response shaping. It:

- Normalizes Express query parameters (page/pageSize cap, boolean parsing, ISO date validation).
- Enforces the 5 000-record maximum window prior to calling the repository.
- Returns controller-friendly DTOs (`{ data, pagination }`) with totals clamped for map consumers.
- Provides `getIncidentDetail` with built-in 400/404 handling so controllers remain slim.

## Geometry Helpers

- `parseGeometry` – safely converts PostGIS outputs (from `ST_AsGeoJSON`) into typed GeoJSON geometries.
- `geometryToFeature` – wraps geometries into GeoJSON Feature objects with empty property bags for API consumption.

These helpers ensure geometry columns never leak raw WKB/WKT strings into higher layers.

## Testing

Run the repository integration suite once a PostGIS database (migrations + seeds + synthetic data) is available:

```bash
cd server
DATABASE_URL=postgres://gis_dev:gis_dev_password@localhost:5432/gis_test npm run test:db
```

The tests (best run against a dedicated database such as `gis_test`) now cover:

1. Migration/seed smoke checks confirming lookup codes and PostGIS extension availability.
2. Repository regression suites that insert fixtures and a higher-volume synthetic batch for pagination, detail joins, and geometry serialization.
3. Referential integrity and geometry validation queries adapted from the bulk-load pipeline (ensuring SRID, validity, and relationship constraints).

If the database connection fails, the suite will log a warning and skip assertions instead of hard failing.

## Next Steps

- Wire repositories into Express route handlers as part of Task 3.x API development.
- Extend query helpers for aggregations (RF12–RF18) such as metrics, geohash summaries, and filter metadata endpoints.
- Introduce caching or read replicas when benchmarking highlights hotspots (aligns with RF07).
