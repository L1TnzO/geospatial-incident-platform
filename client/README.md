# Geospatial Incident Platform Frontend

Vite + React + TypeScript client that powers the Geospatial Incident Platform UI. The initial scaffold includes routing, global state via Zustand, Leaflet map integration, and a testing setup with Vitest and React Testing Library.

> **New contributor?** Review the repository-wide [`docs/setup.md`](../docs/setup.md) first, then return here for frontend-specific workflows.

## Prerequisites

- Node.js 20+
- npm (ships with Node.js)

## Install dependencies

```bash
npm install
```

## Available scripts

```bash
npm run dev        # Start Vite dev server on http://localhost:5173
npm run build      # Type-check and create production build
npm run preview    # Preview the production build locally
npm run lint       # Run ESLint checks
npm test           # Execute Vitest test suite once
npm run test:watch # Run Vitest in watch mode
```

## Frontend features

- React Router with a shell layout (`src/layouts/AppLayout.tsx`) and dashboard route
- Zustand store (`src/store/useMapStore.ts`) for map view state
- Leaflet incident map (`src/components/MapView.tsx`) that streams `/api/incidents` data, clusters up to 5,000 markers with [Supercluster](https://github.com/mapbox/supercluster), surfaces a cap indicator when additional records are available, exposes a "View details" trigger wired through `useIncidentDetailStore`, and overlays toggleable fire station markers fetched from `/api/stations`
- Incidents table data hook (`src/hooks/useIncidentTableData.ts`) and service (`src/services/incidentsTableService.ts`) that mirror the backend `server/src/services/incidentsTableDataService.ts` cursor helpers for filterable pagination
- Responsive layout styling via global CSS (no utility framework for now)
- Vitest + React Testing Library smoke test (`src/App.test.tsx`)

## Documentation & testing resources

- [Map Experience Guide](../docs/frontend/map.md) — Interaction walkthrough, state/data flow, troubleshooting tips.
- [Incidents & Stations API Reference](../docs/api/incidents-and-stations.md) — REST payloads consumed by the map and supporting dashboards.
- [Testing & Quality Gates](../docs/operations/testing.md) — Commands for running lint/unit/integration suites, including `MapView.integration.test.tsx`.

## Docker Compose integration

The root `docker-compose.yml` defines a `frontend` service that mounts this directory and exposes port `5173`. After installing dependencies locally, running `docker compose up frontend` will start the Vite dev server inside the container using the same scripts described above.

Environment variables can be configured through the shared `.env.example` (copied to `.env`) and `.env.frontend.example` files at the repository root. Vite automatically loads `.env.local`/`.env` prefixed with `VITE_`.

See [`docs/contributing.md`](../docs/contributing.md) for commit conventions, linting expectations, and CI requirements before opening a pull request.

## Map roadmap

The map now displays live incident markers with clustering and a visible cap badge when the dataset exceeds 5,000 records. Upcoming enhancements include:

- Adding filter controls and legend components
- Wiring in station overlays and severity-based styling
- Hydrating the incident detail modal with `/api/incidents/{id}` data and coordinating selection with the incidents table/dashboard metrics
- Layering station metadata (coverage zones, contact actions) once the modal is hydrated and coordinating filters between station/incident overlays

Refer to `src/components/MapView.tsx`, `src/components/IncidentClusterLayer.tsx`, and `src/hooks/useIncidents.ts` for the current implementation.

## Incidents table data hook

Use the incidents table data service (`src/services/incidentsTableService.ts`) when wiring paginated table views. It forwards the table filters to `/api/incidents`, applies the same cursor math used on the backend helper (`server/src/services/incidentsTableDataService.ts`), and returns `{ rows, pagination }` with `nextPage`, `previousPage`, `remainder`, and `totalPages` metadata.

The React hook (`src/hooks/useIncidentTableData.ts`) wraps that service with local state for filters, loading/error flags, and helper setters (`setPage`, `setPageSize`, `setFilters`, `refresh`). Components can subscribe to `rows`, `pagination`, and `filters` directly; updates trigger refetches via an internal `AbortController` to keep responses in sync with the latest params.
