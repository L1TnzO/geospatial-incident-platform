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

- React Router with a shared shell layout (`src/layouts/AppLayout.tsx`) that exposes both the map-driven **Overview** (`/` and `/overview`) and analytics **Dashboard** (`/dashboard`) routes
- Zustand store (`src/store/useMapStore.ts`) for map view state
- Leaflet incident map (`src/components/MapView.tsx`) that streams `/api/incidents` data, clusters up to 5,000 markers with [Supercluster](https://github.com/mapbox/supercluster), surfaces a cap indicator when additional records are available, exposes a "View details" trigger wired through the cached incident detail store, and overlays toggleable fire station markers fetched from `/api/stations`
- Incidents table card (`src/components/IncidentTable.tsx`) that consumes the table data hook to render paginated rows with loading, error, and empty states alongside pagination controls, severity/status multi-selects, occurrence date range filters, synchronized row highlighting driven by `useIncidentDetailStore`, and localStorage-backed filter persistence so user preferences survive reloads
- Incident search bar (`src/components/IncidentSearchBar.tsx`) that hydrates `/api/incidents/meta` for UX hints, debounces `/api/incidents/search` lookups, recenters the map with `useMapStore`, drives the detail modal, and syncs the table filter plus recent history cache
- Incidents table data hook (`src/hooks/useIncidentTableData.ts`) and service (`src/services/incidentsTableService.ts`) that mirror the backend cursor helpers for filterable pagination
- Incident detail modal (`src/components/IncidentDetailModal.tsx`) backed by `useIncidentDetailStore`, which prefetches `/api/incidents/{incidentNumber}` payloads, caches responses per incident, persists the most recent 25 detail payloads to localStorage, and exposes retry/loading/error states shared between the map and table entry points
- Dashboard analytics surface (`src/layouts/DashboardLayout.tsx`) with the **Incidents (Last 24h)** KPI card (trend arrow, signed delta, percentage change, in-card refresh), an incidents-by-type bar chart featuring count/percentage toggle + tooltips, severity mix donut chart keyed to backend colour swatches, daily trend line chart with highlighted 7-day window, and recent incident feed powered by `/api/dashboard/*` hooks (`useDashboardLast24HoursKpi`, `useDashboardTypeDistribution`, `useDashboardSeverityDistribution`, `useDashboardDailyTrend`, `useDashboardRecentIncidents`) while sharing the same filter state as the incidents table
- Backend `/api/dashboard/export` CSV endpoint streams up to 5,000 filtered incidents with metadata headers and column selection; Task 5.9 will wire the download control into the dashboard UI using the same filter store.
- Responsive layout styling via shared SCSS entrypoints (no utility framework for now)
- Vitest + React Testing Library smoke test (`src/App.test.tsx`)

## Styles

- `src/styles/index.scss` loads every feature bundle and is the only stylesheet imported by `main.tsx`.
- `src/styles/global.scss` contains shared layout primitives (`.app-shell`, `.app-main`, not-found screen, etc.).
- `src/styles/dashboard/dashboard.scss` owns dashboard-level layout wrappers.
- `src/styles/search/search.scss` scopes the incident search card and its dropdown suggestions.
- `src/styles/map/map.scss` styles the map card, toolbar, overlays, and Leaflet marker popups.
- `src/styles/table/table.scss` contains the incident table card, filters, and table classes.
- `src/styles/modal/incident-detail.scss` styles the incident detail modal.

When introducing a new surface area, add a dedicated partial under `src/styles/` (e.g., `analytics/analytics.scss`) and wire it through `index.scss` instead of modifying an unrelated bundle.

## Documentation & testing resources

- [Map Experience Guide](../docs/frontend/map.md) — Interaction walkthrough, state/data flow, troubleshooting tips, and navigation hand-off to the dashboard.
- [Dashboard Analytics Guide](../docs/frontend/dashboard.md) — Route layout, KPI card, incidents-by-type chart toggle, severity donut chart, daily trend line chart, and integration points for upcoming analytics work.
- [Incidents & Stations API Reference](../docs/api/incidents-and-stations.md) — REST payloads consumed by the map and supporting dashboards.
- [Testing & Quality Gates](../docs/operations/testing.md) — Commands for running lint/unit/integration suites, including `MapView.integration.test.tsx`.

## Docker Compose integration

The root `docker-compose.yml` defines a `frontend` service that mounts this directory and exposes port `5173`. After installing dependencies locally, running `docker compose up frontend` will start the Vite dev server inside the container using the same scripts described above.

Environment variables can be configured through the shared `.env.example` (copied to `.env`) and `.env.frontend.example` files at the repository root. Vite automatically loads `.env.local`/`.env` prefixed with `VITE_`.

See [`docs/contributing.md`](../docs/contributing.md) for commit conventions, linting expectations, and CI requirements before opening a pull request.

## Map roadmap

The map now displays live incident markers with clustering and a visible cap badge when the dataset exceeds 5,000 records. Upcoming enhancements include:

- Expanding filter controls with richer presets and legend components
- Wiring in station overlays and severity-based styling
- Expanding the incident detail modal with richer formatting (attachments, responder checklists) and coordinating detail refresh cues with dashboard metrics
- Layering station metadata (coverage zones, contact actions) once the modal is hydrated and coordinating filters between station/incident overlays

Refer to `src/components/MapView.tsx`, `src/components/IncidentClusterLayer.tsx`, and `src/hooks/useIncidents.ts` for the current implementation.

## Incidents table data hook

Use the incidents table data service (`src/services/incidentsTableService.ts`) when wiring paginated table views. It forwards the table filters to `/api/incidents`, applies the same cursor math used on the backend helper (`server/src/services/incidentsTableDataService.ts`), and returns `{ rows, pagination }` with `nextPage`, `previousPage`, `remainder`, and `totalPages` metadata.

The React hook (`src/hooks/useIncidentTableData.ts`) wraps that service with local state for filters, loading/error flags, and helper setters (`setPage`, `setPageSize`, `setFilters`, `refresh`). Components can subscribe to `rows`, `pagination`, and `filters` directly; updates trigger refetches via an internal `AbortController` to keep responses in sync with the latest params. Filter preferences are persisted to localStorage (key `gip::incidentTableFilters::v1`), so page size, severity/status selections, date ranges, and the optional incident number rehydrate on reload. The table UI card (`src/components/IncidentTable.tsx`) consumes the hook to provide the paginated incidents dashboard experience, wiring severity/status multi-selects and occurrence date range inputs into `setFilters` so server-side filtering stays in sync with pagination. It also listens to `useIncidentDetailStore` so selecting a marker on the Leaflet map highlights and scrolls to the corresponding row, while row clicks/keyboard activation open the detail modal in lockstep with the map.

## Incident search workflow

- `src/services/incidentsMetaService.ts` memoizes `/api/incidents/meta` for five minutes and exposes `clearIncidentMetadataCache()` for tests.
- `src/services/incidentSearchService.ts` wraps `/api/incidents/search?incidentNumber=…`, normalizing errors so the UI can show a concise message on 404s.
- `src/hooks/useIncidentSearch.ts` coordinates metadata hydration, debounced/abortable searches, and exposes `lastResult`, `isSearching`, and `searchError` state alongside helper actions.
- `src/components/IncidentSearchBar.tsx` is rendered on the dashboard, synchronizes the map (`useMapStore.setView`), table (`useIncidentTableData.setFilters`), and detail modal (`useIncidentDetailStore.openIncident`), and persists the last five successful lookups to localStorage (`gip::incidentSearchHistory::v1`).
- Vitest coverage lives in `src/components/IncidentSearchBar.test.tsx`, which exercises success, error, and history scenarios with mocked services/stores.

### Persistent client caches

- **Incident table filters** persist to localStorage (`gip::incidentTableFilters::v1`). Clear them via the browser dev tools or by calling `localStorage.removeItem('gip::incidentTableFilters::v1')` in the console.
- **Incident detail cache** stores up to 25 recent incident payloads in localStorage (`gip::incidentDetailCache::v1`). Use `localStorage.removeItem('gip::incidentDetailCache::v1')` or the browser storage inspector to flush the cache if needed.
- **Incident search history** keeps the five most recent lookups in localStorage (`gip::incidentSearchHistory::v1`). Clear with `localStorage.removeItem('gip::incidentSearchHistory::v1')` to reset recents.
