# Frontend Rebuild Roadmap

_Last updated: 2025-10-20_

## 1. Current Mock UI Assessment

### Architecture & State

- `client/src/App.tsx` wires basic routes (`/map`, `/table`, `/analytics`, `/create`) but keeps all domain state in local `useState` hooks and mock login branches; there is no shared router shell, no persisted preferences, and no concept of global stores for filters, map view, or detail modals.
- Authentication is a hard-coded credential check that never reaches backend auth/session APIs, so navigation, role gating, and error handling logic from the legacy shell are absent.
- The project keeps JSX, styles, and business logic tightly coupled inside components (e.g., `FiltersPanel`, `IncidentForm`), which complicates reuse when real services and stores return.

### Map & Spatial Experience

- `client/src/components/MapView.tsx` renders a stylised SVG grid with manual pan/zoom math instead of Leaflet. Clustering, remainder badges, overlays, and popup/detail flows from the legacy map are gone, so parity with RF21–RF28 is lost.
- Fire station markers are plotted from static fixtures, with no toggle, caching, or metadata pipeline. Severity symbology is hard-coded and disconnected from backend-supplied colour swatches.

### Data & Services

- `client/src/data/mockData.ts` seeds every view with static incidents/stations; `services/` is empty and there are no query utilities, AbortController patterns, or error normalisation helpers like the ones in `client-old/src/services`.
- Types in `client/src/types/index.ts` only model the mock payload and omit pagination, metadata, or DTO variations expected by `/api/incidents`, `/api/dashboard/*`, or `/api/strategic/*`.

### Analytics Surfaces

- `client/src/components/AnalyticsDashboard.tsx` and the sub-folders under `components/analytics/` render purely in-memory summaries. Key behaviours from the production dashboard (`useDashboard*` hooks, CSV export pipeline, map/table sync) are missing.
- There is no `/strategic` route; strategic widgets in `components/analytics/StrategicInsights.tsx` are illustrative cards that do not call `/api/strategic/*` or render overlays.

### QA, Tooling & Documentation

- `package.json` keeps only `dev`, `build`, and `test` (with `--passWithNoTests`). Vitest, Playwright, lint-staged, and ESLint baselines from `client-old/` were not migrated, so CI can’t enforce quality gates.
- `src/guidelines/Guidelines.md` is empty and there is no contributor onboarding to describe the new stack.

### Strengths To Retain

- `components/ui/*` provides a Shadcn/Radix library that can backfill form, modal, and navigation primitives for the rebuild without re-authoring low-level UI states.
- Tailwind CSS 4 is already bundled (`src/index.css`), so we can blend utility classes with legacy SCSS tokens while transitioning; the `sonner` toaster and Radix dialogs are in place for UX polish once wired to real data.

## 2. Capability Gap Analysis

| Area                            | Legacy asset(s)                                                                                                                                                                                                                                           | Production capability                                                                                           | Current mock state                                                                                                                              | Port / Rebuild strategy                                                                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell & routing                 | `client-old/src/layouts/AppLayout.tsx`, `client-old/src/components/HeaderNav.tsx`, `client-old/src/pages/**`                                                                                                                                              | Shared layout with sticky header, `/overview`, `/dashboard`, `/strategic` routes, accessibility hooks           | Single-level router in `client/src/App.tsx`; no shared shell, strategic route missing, auth stub only                                           | Port layout + nav structure, reintroduce `Outlet`-based shell, and wire role/route guards before feature screens                                         |
| Map & overlays                  | `client-old/src/components/MapView.tsx`, `client-old/src/components/IncidentClusterLayer.tsx`, `client-old/src/hooks/useIncidents.ts`, `client-old/src/store/useMapStore.ts`                                                                              | Leaflet map with clustering, remainder indicator, station toggle, shared detail modal                           | SVG grid with manual pan/zoom (`client/src/components/MapView.tsx`); no backend hooks, no overlay controls, no modal                            | Reuse map hooks/stores, port incident/station services, drop-in Leaflet and overlay components, add detail modal plumbing                                |
| Filters / table / search / CRUD | `client-old/src/components/IncidentTable.tsx`, `client-old/src/components/IncidentSearchBar.tsx`, `client-old/src/components/IncidentDetailModal.tsx`, `client-old/src/hooks/useIncidentTableData.ts`, `client-old/src/services/incidentsTableService.ts` | Server-side pagination, filter chips, detail sync, search -> map/table link, creation flow, remainder messaging | `FiltersPanel` mutates local state only; `TableView` sorts paginated arrays in memory; search and creation forms do not call backend or persist | Restore metadata/search services, Zustand stores, and table component; connect CRUD modal to `/api/incidents`; reinstate detail modal and map/table sync |
| Dashboard analytics             | `client-old/src/layouts/DashboardLayout.tsx`, `client-old/src/hooks/useDashboard*.ts`, `client-old/src/components/dashboard/*.tsx`, `client-old/src/tests/e2e/dashboard.spec.ts`                                                                          | KPI, charts, refresh/export controls, shared filters, Playwright coverage                                       | Tabs-based demo in `components/analytics/TacticalOverview.tsx` with client-side math, no API, no export, no tests                               | Port hooks/services/tests; restyle widgets using new design system; reconnect export flow to `/api/dashboard/export`                                     |
| Strategic analytics & overlays  | `client-old/src/layouts/StrategicLayout.tsx`, `client-old/src/components/strategic/*`, `client-old/src/hooks/useStrategic*.ts`, `client-old/src/services/strategicAnalyticsService.ts`                                                                    | Trend selectors, hotspot/coverage/response overlays, cache/refresh, map integration                             | Placeholder cards; no `/strategic` route; overlays absent                                                                                       | Restore route, hooks, and overlay layers; align with map rebuild and ensure filters sync                                                                 |
| State & preferences             | `client-old/src/store/useMapStore.ts`, `client-old/src/store/useIncidentDetailStore.ts`, `client-old/src/store/useMapPreferencesStore.ts`, `client-old/src/store/useDashboardFilters.ts`                                                                  | Shared filter persistence, map view/state sync, modal caching                                                   | No global state management; filters and selections reset per component                                                                          | Rehabilitate Zustand stores (or React Query + Zustand hybrid), persist to localStorage where legacy did                                                  |
| Testing & QA                    | `client-old/src/setupTests.ts`, `client-old/vite.config.ts`, `client-old/tests/e2e/**`, `client-old/src/components/**/*.test.tsx`                                                                                                                         | Vitest unit tests, integration suites, Playwright automation, linting                                           | No tests, lint, or e2e harness in new client                                                                                                    | Reapply tooling from `client-old/`, update config for Tailwind 4, re-enable CI tasks                                                                     |
| Design tokens & docs            | `client-old/src/index.css`, SCSS partials under `client-old/src/styles/**`, `docs/frontend/map.md`, `docs/frontend/dashboard.md`, `docs/frontend/strategic.md`                                                                                            | Defined palette, typography, layout primitives, documented UX flows                                             | `src/styles/globals.css` redefines tokens without mapping to severity palette; docs still reference legacy UI                                   | Reconcile token names, port severity palette, and revise docs alongside roadmap delivery                                                                 |

## 3. Backend Contracts & Legacy Modules Ready to Reuse

- **Incidents & stations**: `/api/incidents`, `/api/incidents/:id`, `/api/stations`, `/api/incidents/meta`, `/api/incidents/search`, `/api/incidents` (POST) – refer to `docs/frontend/map.md` and `client-old/src/services/incidentsService.ts`, `incidentsTableService.ts`, `incidentSearchService.ts`.
- **Dashboard analytics**: `/api/dashboard/kpi/last-24h`, `/api/dashboard/incidents/by-type`, `/api/dashboard/incidents/severity-distribution`, `/api/dashboard/incidents/daily-trend`, `/api/dashboard/incidents/recent`, `/api/dashboard/export` – see `docs/frontend/dashboard.md` and hook implementations in `client-old/src/hooks/useDashboard*.ts`.
- **Strategic analytics**: `/api/strategic/trends`, `/api/strategic/quarters`, `/api/strategic/types`, `/api/strategic/hotspots`, `/api/strategic/coverage-buffers`, `/api/strategic/response-metrics`, `/api/strategic/priority-scores` – documented in `docs/frontend/strategic.md` with services/hooks under `client-old/src/services/strategicAnalyticsService.ts` and `client-old/src/hooks/useStrategic*.ts`.
- **Testing harness**: Vitest/RTL setup (`client-old/src/setupTests.ts`), MSW handlers, and Playwright specs (`client-old/tests/e2e/dashboard.spec.ts`, `strategic.spec.ts`) provide direct templates for reinstating automation.

## 4. Phase 7 Roadmap (Tasks 7.2–7.8)

### Task 7.2 – Reinstate Shared Frontend Infrastructure (Critical)

- Port router shell (`AppLayout`, `HeaderNav`) into `client/`, restore `/overview`, `/dashboard`, `/strategic`, and auth guard patterns.
- Reintroduce shared stores/utilities (`useMapStore`, `useIncidentDetailStore`, `useDashboardFilters`) or equivalent React Query adapters; ensure persistence keys remain backward compatible (`gip::incidentTableFilters::v1`, etc.).
- Stand up an API client layer (fetch wrapper with JWT injection, error normalisation, abort handling) by adapting `client-old/src/services/httpClient.ts` and related modules.
- Reapply tooling: ESLint, Prettier, Vitest config (`setupTests.ts`), Playwright project scaffolding, and lint-staged hooks to the new `client/` workspace.
- Document the refreshed stack in `client/README.md`, highlighting Tailwind + Shadcn usage and how to run tests.

### Task 7.3 – Rebuild Incidents Map Experience (High)

- Swap the SVG mock map for Leaflet, reinstating `IncidentClusterLayer`, `StationLayer`, cap indicator, and remainder messaging from the legacy implementation.
- Reconnect `useIncidents` to `/api/incidents` with AbortController pagination (<=5k markers) and reuse caching logic for stations.
- Restore the incident detail modal, map/detail sync, and fire-station toggle preferences; ensure severity colours come from backend metadata.
- Add base layer toggles, legend, loading/error overlays, and tests (RTL + Playwright) covering cluster expansion and overlay toggles.

### Task 7.4 – Restore Filters, Table, Search & CRUD Workflows (High)

- Rebuild filter metadata + search flows using `/api/incidents/meta` and `/api/incidents/search`, reapplying debounced request logic and localStorage persistence.
- Port the server-driven table (`IncidentTable`, pagination controls, remainder indicator), integrating with map/detail stores.
- Reinstate the incident creation modal with validation mirroring backend schema, map coordinate picker, and success refresh behaviour.
- Ensure Vitest suites cover filters, table sorting/pagination, search, and CRUD errors; align remainder messaging with dashboard filters.

### Task 7.5 – Reinstate Dashboard Analytics (High)

- Recreate `useDashboard*` hooks with shared filter context and caching; port widget components (KPI, type/severity charts, daily trend, recent incidents) and align styling to the updated design system.
- Restore CSV export wiring to `/api/dashboard/export`, including success/error banners, “Download again” flow, and abort logic.
- Re-enable integration and Playwright specs for the dashboard route, ensuring filter propagation to map/table quick actions.

### Task 7.6 – Reintroduce Strategic Analytics & Overlays (High)

- Restore `/strategic` route and layout, add monthly/quarterly trend charts, type explorer, and upcoming panel placeholders using the strategic hooks/services.
- Reapply hotspot, coverage, response-time, and priority overlay cards integrated with the rebuilt Leaflet map, including refresh/cancel controls and legends.
- Confirm shared filters remain in sync with dashboard and map contexts; cover key flows with integration & Playwright tests.

### Task 7.7 – Frontend Quality Automation (High)

- Reinstate Vitest coverage thresholds, MSW-driven integration suites, and Playwright smoke/regression workflows tailored to the rebuilt surfaces.
- Wire CI (lint, unit, integration, e2e) for `client/` and re-enable coverage reports for the Manager Agent.

### Task 7.8 – Documentation & Enablement Refresh (Medium)

- Update `docs/frontend/map.md`, `dashboard.md`, and `strategic.md` once rebuilt features land; add a new `frontend-rebuild-roadmap` section summarising parity status.
- Refresh `client/README.md` with dev setup, test commands, and design system references; generate release notes for the rebuilt UI.

## 5. Design Tokens & Component Guidelines

- **Colour system**: Port the severity and status palette from `client-old/src/index.css` (`--color-primary`, severity badges) and align with Tailwind via CSS custom properties (`--fs-color-critical`, etc.). Map severity colours to tokens consumed by map markers, table badges, and charts; expose as Tailwind theme extensions.
- **Typography**: Retain Inter/Sego UI stack, reapply heading scales from legacy SCSS (`h1`–`h4`) and ensure Tailwind `text-*` utilities reference the same scale. Document responsive typography decisions in this roadmap and `client/src/styles/globals.css`.
- **Spacing & radius**: Adopt consistent radius tokens (legacy used 8/12px; new Shadcn defaults use `--radius`). Define `--fs-radius-sm/md/lg` so Leaflet popups, cards, and dashboards use consistent curvature.
- **Component guidelines**:
  - Use Shadcn primitives (`Card`, `Badge`, `Dialog`, `Tabs`) for shell UI, but wrap them in domain components to encapsulate data requirements (e.g., `IncidentSummaryCard` vs. direct `Card` usage).
  - Keep Leaflet overlays styled via SCSS modules imported into Tailwind by enabling `@layer` utilities for map-specific tweaks; reuse existing `_map.scss`, `_strategic/*.scss` partials for complex overlays.
  - Document severity/status legend tokens and breakpoints in `docs/frontend/frontend-rebuild-roadmap.md` to guide future contributors.

## 6. Quick Wins, Risks, & Dependencies

### Quick Wins

- Copy legacy stores/hooks/services into `client/` with minimal refactors to rehydrate functionality quickly.
- Leverage the existing Shadcn component library for forms/modals instead of rebuilding from scratch.
- Re-enable Vitest/Playwright using the legacy config as a blueprint to regain CI confidence early.

### Risks & Open Decisions

- **Map stack alignment**: Confirm we will continue using Leaflet (recommended for parity) instead of keeping the custom canvas mock; decision impacts overlay roadmap.
- **Styling convergence**: Decide whether to keep Tailwind 4 plus SCSS partials or migrate the legacy SCSS tokens fully into Tailwind theme extensions; avoid dual maintenance.
- **Design approval**: Validate colour/typography tokens with design stakeholders before porting to avoid rework.

### Backend / External Dependencies

- Verify all `/api/dashboard/*` and `/api/strategic/*` endpoints remain stable post-Phase 6; coordinate with backend owners before reinstating hooks.
- Ensure PostGIS-backed overlays (hotspots, coverage buffers, response metrics) still deliver the GeoJSON contracts expected by legacy Leaflet components.
- Schedule time with QA to revive MSW fixtures and Playwright data seeding once frontend endpoints are wired back to the server.
