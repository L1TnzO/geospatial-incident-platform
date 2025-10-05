# Dashboard Analytics Guide

The dashboard route (`/dashboard`) hosts the analytics surface that complements the map-driven overview. This document explains the layout, placeholder widgets, and integration hooks introduced in Task 5.2.

## Route overview

- **Entry point:** `client/src/pages/DashboardPage.tsx` renders `DashboardLayout` within the shared app shell.
- **Layout:** `client/src/layouts/DashboardLayout.tsx` defines three sections—Key Performance Indicators, Incident Distribution, and Recent Incidents—wired to dedicated placeholder components under `client/src/components/dashboard/`.
- **Navigation:** The global header now exposes **Overview** and **Dashboard** tabs. `NavLink` automatically applies `aria-current="page"`, so keyboard and assistive tech users can confirm which view is active.

## Placeholder widgets

| Component        | Path                           | Purpose                                                                                                                                                                                                           |
| ---------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| KPI row          | `DashboardKPIRow.tsx`          | Renders the **Incidents (Last 24h)** KPI card with trend arrow, signed delta, percentage change, comparison tooltip, and manual refresh button backed by `/api/dashboard/kpi/last-24h`.                           |
| Charts grid      | `DashboardChartsGrid.tsx`      | Hosts the type distribution bar chart, severity donut chart, and daily trend summary. Each widget consumes its own endpoint (`/incidents/by-type`, `/incidents/severity-distribution`, `/incidents/daily-trend`). |
| Recent incidents | `DashboardRecentIncidents.tsx` | Lists the latest incidents returned by `/api/dashboard/incidents/recent`, rendering severity badges, status/station metadata, and quick actions that recenter the map or open the incident detail modal.          |

All widgets accept result objects from their respective hooks, ensuring we can drop in real charting/visualization libraries in Tasks 5.3+ without rewriting container logic.

## Data hooks & services

- `useDashboardFilters.ts` reuses the incident table filters (`useIncidentTableData`) so the dashboard respects the same query parameters as the overview.
- `useDashboardLast24HoursKpi.ts`, `useDashboardTypeDistribution.ts`, `useDashboardSeverityDistribution.ts`, and `useDashboardDailyTrend.ts` each call their respective `/api/dashboard/*` endpoints while exposing a common status shape.
- `useDashboardAggregations.ts` simply composes the granular hooks above for scenarios where a single selector is still convenient.
- `useDashboardRecentIncidents.ts` reads `/api/dashboard/incidents/recent` with the same filter set and lifecycle handling.
- `useDashboardExport.ts` wraps the CSV export lifecycle—deriving filters, managing the abort controller, surfacing status/metadata, and triggering the download via `triggerBrowserDownload`.
- `dashboardService.ts` centralizes API helpers and typed payloads defined in `types/dashboard.ts`, including `exportDashboardCsv` which calls `/api/dashboard/export` and resolves filename metadata.

Each hook returns plain objects, making them easy to mock in Vitest or swap with MSW handlers during local development.

### Incidents (Last 24h) KPI card

- **Component:** `DashboardKPIRow.tsx`
- **Hook:** `useDashboardLast24HoursKpi`
- **Endpoint:** `GET /api/dashboard/kpi/last-24h`

The card formats the current incident count, highlights the difference and percentage change versus the previous 24-hour window, and exposes both top-level timestamps and trend direction via semantic colours and accessible labels. Loading renders shimmer placeholders, errors surface the service message with a retry button, and empty states explain that activity has not been detected yet. The inline **Refresh KPI** button calls the hook’s `refresh()` method, which reissues the API request with `refresh=true` to bust any caches.

### Incident type distribution chart

- **Component:** `DashboardTypeDistributionChart.tsx`
- **Hook:** `useDashboardTypeDistribution`
- **Endpoint:** `GET /api/dashboard/incidents/by-type`

The chart renders each incident type as a horizontal bar with responsive widths in either absolute counts or percentage mode. A segmented toggle switches the measurement, tooltips expose `{count} incidents ({percentage})`, and the footer includes refresh controls plus last-updated timestamps. Loading states display skeletons, errors surface retry buttons, and empty states nudge users to adjust filters.

### Severity distribution donut chart

- **Component:** `DashboardSeverityDistributionChart.tsx`
- **Hook:** `useDashboardSeverityDistribution`
- **Endpoint:** `GET /api/dashboard/incidents/severity-distribution`

The donut chart visualises severity buckets via a conic-gradient slice keyed to the backend-provided `colorHex` palette. The centre callout highlights the total incident count, while the legend lists `{severity} · {count} · {percentage}` entries with matching swatches. Loading/error/empty states mirror the other widgets, and the **Refresh data** button reissues the request with cache-busting semantics. Tooltip labels and `aria-label`s expose the severity metadata for assistive technologies.

### Daily trend line chart

- **Component:** `DashboardDailyTrendChart.tsx`
- **Hook:** `useDashboardDailyTrend`
- **Endpoint:** `GET /api/dashboard/incidents/daily-trend`

The line chart renders the last 30 days of incident counts using a declarative SVG path. A translucent highlight and dashed overlay call out the most recent 7-day window, while the summary copy beneath the chart reiterates the `currentTotal`, `previousTotal`, signed delta, and trend direction (up, down, flat). Hover/focus tooltips use `<title>` nodes so every point exposes `{date}: {count} incidents`, and the bottom axis ticks surface start/mid/end dates for quick orientation. The refresh control mirrors other widgets and keeps timestamps in sync.

### Recent incidents panel

- **Component:** `DashboardRecentIncidents.tsx`
- **Hook:** `useDashboardRecentIncidents`
- **Endpoint:** `GET /api/dashboard/incidents/recent`

The panel surfaces the latest incidents as rich cards showing severity badges (colour-coded via the backend `colorHex`), the incident number, current status, assigned station, and a localized reported timestamp. Each card exposes **View on map** (recentres the Leaflet map, highlights the corresponding incident row, and preserves the modal state) and **Open details** (launches the shared incident detail modal after recentering). Loading states render a skeleton list, errors surface a retry button, and empty states explain that activity will appear once incidents arrive.

### Filtered CSV export

- **Hook:** `useDashboardExport.ts`
- **Service:** `exportDashboardCsv` (`dashboardService.ts`)
- **Endpoint:** `GET /api/dashboard/export`

The dashboard header now exposes an **Export CSV** pill button that respects the currently active dashboard filters. On click the button disables, renders as “Exporting…”, and the hook issues a `fetch` with `Response.blob()` to stream the CSV. Successful responses infer the filename from `Content-Disposition` (falling back to `incidents-yyyyMMdd-HHmm.csv`), trigger a browser download via `URL.createObjectURL`, and surface a toast-like banner with “Download again” / “Dismiss” actions. Errors flip the banner into an alert that explains the failure (including the 5 000 record cap) and offers a **Retry export** button. Users can cancel a long-running request via **Cancel export**, which aborts the underlying `AbortController`.

## Styling & responsiveness

Dashboard-specific styles live in `src/styles/dashboard/dashboard.scss` and are already imported through `index.scss`. The grid layout:

- Uses `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))` to collapse charts into a single column on narrow viewports.
- Adapts paddings for tablet screens (`max-width: 768px`) and keeps KPI/Recent cards legible on touch devices.
- Defines shared utility classes (`.dashboard-placeholder`, `.dashboard-error`, `.dashboard-empty`, `.dashboard-loading`) for consistent skeleton and error messaging.
- Adds `.dashboard-export`, `.dashboard-export-cancel`, `.dashboard-export-banner*`, and the `_recent-incidents.scss` partial so export controls and the recent incidents interactions align with the existing pill buttons and emphasise success/error states.

## Testing

- **Unit:** `DashboardLayout.test.tsx` verifies loading and empty states for the three sections by mocking the data hooks.
- **Unit:** `DashboardKPIRow.test.tsx` exercises KPI loading, success (up & flat trends), and error retry flows against mocked hook state.
- **Unit:** `DashboardTypeDistributionChart.test.tsx` covers loading, error, empty, and toggle/tooltip behaviour for the type chart.
- **Unit:** `DashboardSeverityDistributionChart.test.tsx` validates loading/error/empty cases and legend rendering for the severity donut.
- **Unit:** `DashboardDailyTrendChart.test.tsx` covers loading/error/empty flows and ensures the line chart and trend summary render correctly.
- **Unit:** `DashboardRecentIncidents.test.tsx` validates loading/error states, map recentering, modal launch actions, and disabled controls when coordinates are missing.
- **Unit:** `dashboardService.test.ts` asserts CSV filename resolution, fallback naming, and error handling for the export helper.
- **Unit:** `useDashboardExport.test.ts` exercises success, error, and cancellation flows while verifying download triggers.
- **Routing:** `AppRouting.test.tsx` asserts the Overview⇄Dashboard navigation flow and `aria-current` handling in the header.
- **Integration:** `DashboardPage.integration.test.tsx` validates happy-path rendering, export success (including download retry/dismiss), recenter behaviour for the recent incidents actions, and error surfacing when the export endpoint returns 500 responses.
- **E2E:** `tests/e2e/dashboard.spec.ts` now covers the export button lifecycle, verifies recent incident quick actions (table highlight + modal open), and ensures the surrounding widgets still behave.

Run the tests with:

```bash
npm --prefix client run test:client
npm --prefix client run test:client:e2e -- dashboard
```

(Replace the filenames with `--run` filters as needed.)

## Next steps

- Replace placeholder lists with real chart components once backend aggregations are finalized (Tasks 5.3–5.5).
- Extend `DashboardFilters` to surface quick filters when the incident table gains saved presets.
- Consider wiring WebSocket updates or Server-Sent Events for near-real-time KPI refreshes.
