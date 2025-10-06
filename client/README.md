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
npm run test:integration # Run Vitest integration suites (map + dashboard)
npm run test:e2e        # Run Playwright E2E suite headless
npm run test:e2e:headed # Run Playwright E2E suite in headed mode
```

## Frontend features

- React Router with a shared shell layout (`src/layouts/AppLayout.tsx`) that exposes the map-driven **Overview** (`/` and `/overview`), operational analytics **Dashboard** (`/dashboard`), and executive-facing **Strategic** (`/strategic`) routes
- Zustand store (`src/store/useMapStore.ts`) for map view state
- Leaflet incident map (`src/components/MapView.tsx`) that streams `/api/incidents` data, clusters up to 5,000 markers with [Supercluster](https://github.com/mapbox/supercluster), surfaces a cap indicator when additional records are available, exposes a "View details" trigger wired through the cached incident detail store, and overlays toggleable fire station markers fetched from `/api/stations`
- Incidents table card (`src/components/IncidentTable.tsx`) that consumes the table data hook to render paginated rows with loading, error, and empty states alongside pagination controls, severity/status multi-selects, occurrence date range filters, synchronized row highlighting driven by `useIncidentDetailStore`, and localStorage-backed filter persistence so user preferences survive reloads
- Incident search bar (`src/components/IncidentSearchBar.tsx`) that hydrates `/api/incidents/meta` for UX hints, debounces `/api/incidents/search` lookups, recenters the map with `useMapStore`, drives the detail modal, and syncs the table filter plus recent history cache
- Incidents table data hook (`src/hooks/useIncidentTableData.ts`) and service (`src/services/incidentsTableService.ts`) that mirror the backend cursor helpers for filterable pagination
- Incident detail modal (`src/components/IncidentDetailModal.tsx`) backed by `useIncidentDetailStore`, which prefetches `/api/incidents/{incidentNumber}` payloads, caches responses per incident, persists the most recent 25 detail payloads to localStorage, and exposes retry/loading/error states shared between the map and table entry points
- Dashboard analytics surface (`src/layouts/DashboardLayout.tsx`) with the **Incidents (Last 24h)** KPI card (trend arrow, signed delta, percentage change, in-card refresh), incidents-by-type bar chart featuring count/percentage toggle + tooltips, severity mix donut chart keyed to backend colour swatches, daily trend line chart with highlighted 7-day window, and a recent incidents panel that renders severity badges, station metadata, and quick actions wired to recenter the map or open the incident detail modal. All widgets consume `/api/dashboard/*` hooks (`useDashboardLast24HoursKpi`, `useDashboardTypeDistribution`, `useDashboardSeverityDistribution`, `useDashboardDailyTrend`, `useDashboardRecentIncidents`, `useDashboardExport`) while sharing the same filter state as the incidents table and offering a filter-aware CSV export control with success/error banners
- Strategic analytics layout (`src/layouts/StrategicLayout.tsx`) that stitches together monthly trend, quarterly comparison, type timeline, and hotspot summary cards backed by the strategic hooks, auto-refreshes every five minutes, exposes per-card retry controls, and reserves slots for upcoming executive widgets
- Strategic analytics foundation (`src/services/strategicAnalyticsService.ts` + hooks under `src/hooks/useStrategic*.ts`) that wires the new Phase 6 `/api/strategic/*` endpoints into reusable React hooks. The services mirror dashboard query-string helpers, accept shared filter context, expose manual/TTL-based refresh controls, and surface typed results (monthly and quarterly trends, incident type timelines, hotspot grids) ready for the `/strategic` route and future executive dashboards
- Responsive layout styling via shared SCSS entrypoints (no utility framework for now)
- Vitest + React Testing Library smoke test (`src/App.test.tsx`)

## Dashboard analytics workflow

- **Shared filters:** `useDashboardFilters` mirrors the incidents table filter state (type, severity, status, date range, active flag, incident number). Adjusting filters on either surface keeps the other aligned.
- **Widgets:** KPI, charts, and recent incidents pull from dedicated hooks (`useDashboard…`) and expose consistent loading/error/refresh behaviour. Manual refresh buttons pass `refresh=true` to bypass the server cache.
- **Export:** The **Export CSV** pill button reuses current filters, displays in-flight status, and surfaces success/error banners. Filenames are taken from `Content-Disposition`; fall back naming pattern is `incidents-YYYYMMDD-HHmmss.csv`.
- **Map/Table sync:** Quick actions in `DashboardRecentIncidents` call `useMapStore.setView`, highlight the incidents table row, and open the shared detail modal so operators can jump between analytics and spatial context instantly.

### CSV export tips

- Default limit is 5 000 rows. If the filtered result exceeds that cap the backend returns `400 BAD_REQUEST`; narrow filters or request a smaller `limit` to continue.
- Supply `includeColumns=incidentNumber,title,latitude,longitude` (or any supported keys) to customise the output order. Unknown keys trigger descriptive 400 responses.
- Exports prepend metadata comments (generated time, record count, applied filters, column list). Some spreadsheet tools treat comment lines as plain rows; use import options that skip leading `#` lines if needed.
- Banners stay on screen until dismissed; **Download again** reuses the last successful blob without hitting the network.

## Styles

`src/styles/index.scss` loads every feature bundle and is the only stylesheet imported by `main.tsx`.
`src/styles/global.scss` contains shared layout primitives (`.app-shell`, `.app-main`, not-found screen, etc.).
`src/styles/dashboard/dashboard.scss` owns dashboard-level layout wrappers.
`src/styles/strategic/strategic.scss` scopes the strategic analytics shell, cards, and placeholder widgets.
`src/styles/search/search.scss` scopes the incident search card and its dropdown suggestions.
`src/styles/map/map.scss` styles the map card, toolbar, overlays, and Leaflet marker popups.
`src/styles/table/table.scss` contains the incident table card, filters, and table classes.
`src/styles/modal/incident-detail.scss` styles the incident detail modal.

When introducing a new surface area, add a dedicated partial under `src/styles/` (e.g., `analytics/analytics.scss`) and wire it through `index.scss` instead of modifying an unrelated bundle.

## Documentation & testing resources

- [Map Experience Guide](../docs/frontend/map.md) — Interaction walkthrough, state/data flow, troubleshooting tips, and navigation hand-off to the dashboard.
- [Dashboard Analytics Guide](../docs/frontend/dashboard.md) — Route layout, KPI card, incidents-by-type chart toggle, severity donut chart, daily trend line chart, and integration points for upcoming analytics work.
- [Strategic Analytics Guide](../docs/frontend/strategic.md) — Service and hook contracts for the strategic trends/hotspots layer plus testing notes and future UI integration checkpoints.
- [Incidents & Stations API Reference](../docs/api/incidents-and-stations.md) — REST payloads consumed by the map and supporting dashboards.
- [Testing & Quality Gates](../docs/operations/testing.md) — Lint/unit/integration/E2E matrices (`npm run test:client:integration`, `npm run test:client:e2e -- dashboard`, backend analytics suites, Playwright setup).

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

## Testing the dashboard

```bash
npm run test:client:integration -- DashboardPage.integration.test.tsx StrategicPage.integration.test.tsx
npm run test:client:e2e -- dashboard
npm run test:client:e2e -- strategic
```

- The integration command runs just the MSW-backed dashboard suite; omit the `--` filter to execute the full integration matrix.
- The E2E command scopes Playwright to the dashboard spec. Ensure the Vite dev server is running (`npm run dev`) and install browsers once per environment with `npx playwright install` (add `--with-deps` on fresh Linux hosts).
- Need headed debugging? Use `npm run test:client:e2e:headed -- dashboard` to open Chromium while the script runs.

### Persistent client caches

- **Incident table filters** persist to localStorage (`gip::incidentTableFilters::v1`). Clear them via the browser dev tools or by calling `localStorage.removeItem('gip::incidentTableFilters::v1')` in the console.
- **Incident detail cache** stores up to 25 recent incident payloads in localStorage (`gip::incidentDetailCache::v1`). Use `localStorage.removeItem('gip::incidentDetailCache::v1')` or the browser storage inspector to flush the cache if needed.
- **Incident search history** keeps the five most recent lookups in localStorage (`gip::incidentSearchHistory::v1`). Clear with `localStorage.removeItem('gip::incidentSearchHistory::v1')` to reset recents.
