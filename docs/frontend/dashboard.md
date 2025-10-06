# Dashboard Analytics Guide

The analytics dashboard (`/dashboard`) delivers KPIs, charts, recent activity, and the CSV export workflow that complements the real-time map. This guide documents the final feature set from Tasks 5.1–5.12 so contributors can extend the surface with confidence.

> _Screenshot placeholder_: capture the final dashboard layout for `assets/dashboard-overview.png` once UI polish lands.

## Route & layout overview

- **Entry point:** `client/src/pages/DashboardPage.tsx` renders `DashboardLayout` within the shared shell layout.
- **Layout shell:** `client/src/layouts/DashboardLayout.tsx` composes three regions:
  1. KPI row (24 h summary + export CTA)
  2. Charts grid (type distribution, severity donut, daily trend)
  3. Recent incidents panel
- **Navigation:** The global header exposes **Overview** (map/table) and **Dashboard** tabs. `NavLink` handles `aria-current="page"` so focus and screen-reader users know which surface is active.

## Widgets & data flow

Each widget consumes a dedicated hook under `client/src/hooks/` backed by `dashboardService.ts`. Hooks share a consistent shape — `{ data, isLoading, isError, error, refresh, lastUpdated }` — simplifying tests and container wiring.

### Incidents (last 24 h) KPI

- **Component:** `DashboardKPIRow.tsx`
- **Hook:** `useDashboardLast24HoursKpi`
- **Endpoint:** `GET /api/dashboard/kpi/last-24h`
- **Behaviour:**
  - Displays current count, signed delta, and percentage change versus the previous 24 h window.
  - Arrow direction (`up`/`down`/`flat`) and semantic colours align with severity badges for quick scanning.
  - Includes a **Refresh** pill button that calls `refresh(true)` and bypasses the 60 s API cache.
  - Loading uses skeleton cards; errors show retry copy and leave the export CTA disabled until data returns.

### Incident type distribution

- **Component:** `DashboardTypeDistributionChart.tsx`
- **Hook:** `useDashboardTypeDistribution`
- **Endpoint:** `GET /api/dashboard/incidents/by-type`
- **Behaviour:**
  - Renders horizontal bars sized by incident count; a toggle switches between absolute counts and percentages.
  - Tooltips expose `{count} incidents ({percentage}%)` so keyboard users and screen readers receive the same context.
  - Loading renders shimmer rows; errors show `Try again`; empty states nudge users to widen filters.

### Severity distribution donut

- **Component:** `DashboardSeverityDistributionChart.tsx`
- **Hook:** `useDashboardSeverityDistribution`
- **Endpoint:** `GET /api/dashboard/incidents/severity-distribution`
- **Behaviour:**
  - Conic-gradient donut keyed to backend `colorHex` values; centre callout surfaces total count.
  - Accessible legend lists `{severity} · {count} · {percentage}` with matching swatches and `aria-label`s.
  - Supports manual refresh, skeleton loading, and inline error messaging consistent with the type chart.

### 30-day daily trend

- **Component:** `DashboardDailyTrendChart.tsx`
- **Hook:** `useDashboardDailyTrend`
- **Endpoint:** `GET /api/dashboard/incidents/daily-trend`
- **Behaviour:**
  - Declarative SVG path over 30 days with highlighted 7-day windows and trend summary (delta + direction).
  - Hover/focus tooltips via `<title>` nodes keep things screen-reader friendly.
  - Summary chips call out `currentTotal` vs `previousTotal` with signed percentage change.

### Recent incidents panel

- **Component:** `DashboardRecentIncidents.tsx`
- **Hook:** `useDashboardRecentIncidents`
- **Endpoint:** `GET /api/dashboard/incidents/recent`
- **Behaviour:**
  - Lists the newest incidents (default 10, respecting active filters and `limit` <= 25).
  - Each card includes severity badges, status, station, reported timestamp, and two quick actions:
    - **View on map** — recenter Leaflet via `useMapStore.setView`, highlight the table row, and keep modal state in sync.
    - **Open details** — opens the shared incident detail modal after syncing map/table.
  - Handles loading placeholders, gracefully degrades when geometry is missing, and exposes retry/empty states.

### Filtered CSV export

- **Hook:** `useDashboardExport`
- **Service:** `exportDashboardCsv` (`dashboardService.ts`)
- **Endpoint:** `GET /api/dashboard/export`
- **Workflow:**
  - Pill button in the KPI header reads current filters from `useDashboardFilters` (which shares state with the incident table).
  - While exporting, the button disables and shows a spinner; a dismissible banner reports success or error.
  - Successful exports infer filenames from `Content-Disposition` (fallback: `incidents-YYYYMMDD-HHmmss.csv`), trigger a download via `URL.createObjectURL`, and keep a “Download again” link handy.
  - Errors (limit exceeded, unknown columns, network failures) surface the backend message and expose **Retry** / **Dismiss** actions.
  - Users can cancel in-flight requests — the hook aborts the underlying fetch and restores the idle state.

## Styling & theming

Dashboard-specific styles live under `client/src/styles/dashboard/` and are imported from `dashboard.scss` which the global `index.scss` already consumes. Key partials:

| Partial                  | Purpose                                                                        |
| ------------------------ | ------------------------------------------------------------------------------ |
| `_kpi.scss`              | KPI grid, cards, delta badges, export CTA, and cache-refresh animations.       |
| `_type-chart.scss`       | Horizontal bar layout, toggles, legend styling for type distributions.         |
| `_severity-chart.scss`   | Donut gradients, legend swatches, and responsive typography.                   |
| `_daily-trend.scss`      | SVG sizing, axes ticks, tooltip affordances, and trend summary chips.          |
| `_recent-incidents.scss` | Card layout, action buttons, skeleton loaders, and responsive stack behaviour. |

Responsive behaviour relies on CSS grid (`auto-fit` with min-width breakpoints) so charts collapse into a single column on tablets/phones without extra JavaScript.

## Testing checklist

Frontend coverage lives beside the components/hooks and in the integration/E2E suites:

| File                                          | Focus                                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `DashboardKPIRow.test.tsx`                    | Loading/empty/error states, trend direction labelling, refresh button wiring.             |
| `DashboardTypeDistributionChart.test.tsx`     | Count/percentage toggling, tooltips, empty messaging.                                     |
| `DashboardSeverityDistributionChart.test.tsx` | Swatch rendering, accessible legends, refresh behaviour.                                  |
| `DashboardDailyTrendChart.test.tsx`           | SVG rendering, highlighted windows, trend summary copy.                                   |
| `DashboardRecentIncidents.test.tsx`           | Map + modal actions, disabled states when coordinates absent.                             |
| `useDashboardExport.test.ts`                  | Success, error, and cancellation flows (ensures download helpers fire).                   |
| `dashboardService.test.ts`                    | Filename parsing, metadata headers, error mapping for the export service.                 |
| `DashboardPage.integration.test.tsx`          | End-to-end widget wiring, filter propagation, export banners, map/detail sync.            |
| `tests/e2e/dashboard.spec.ts`                 | Playwright coverage for KPI refresh, chart rendering, export workflow, and quick actions. |

Run the suites with:

```bash
npm --prefix client run test:client:integration
npm --prefix client run test:client:e2e -- dashboard
```

Remember to install Playwright browsers first (`npx playwright install`) and ensure the Vite dev server is running for the E2E suite.

## Related documents

- [`docs/api/dashboard.md`](../api/dashboard.md) — Backend endpoint reference and CSV export contract.
- [`docs/frontend/strategic.md`](./strategic.md) — Strategic analytics services/hooks that extend the dashboard dataset into long-range trend and hotspot surfaces.
- [`docs/frontend/map.md`](../frontend/map.md) — Map/table experience that shares filters, highlighting, and incident detail workflows.
- [`docs/operations/testing.md`](../operations/testing.md) — Full testing matrix (backend analytics suites, Playwright setup, troubleshooting).
- [`client/README.md`](../../client/README.md) — Contributor setup, scripts, and troubleshooting tips for the frontend stack.
