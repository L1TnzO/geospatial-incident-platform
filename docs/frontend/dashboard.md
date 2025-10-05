# Dashboard Analytics Guide

The dashboard route (`/dashboard`) hosts the analytics surface that complements the map-driven overview. This document explains the layout, placeholder widgets, and integration hooks introduced in Task 5.2.

## Route overview

- **Entry point:** `client/src/pages/DashboardPage.tsx` renders `DashboardLayout` within the shared app shell.
- **Layout:** `client/src/layouts/DashboardLayout.tsx` defines three sections—Key Performance Indicators, Incident Distribution, and Recent Incidents—wired to dedicated placeholder components under `client/src/components/dashboard/`.
- **Navigation:** The global header now exposes **Overview** and **Dashboard** tabs. `NavLink` automatically applies `aria-current="page"`, so keyboard and assistive tech users can confirm which view is active.

## Placeholder widgets

| Component        | Path                           | Purpose                                                                                                                                                                                                        |
| ---------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| KPI row          | `DashboardKPIRow.tsx`          | Renders the **Incidents (Last 24h)** KPI card with trend arrow, signed delta, percentage change, comparison tooltip, and manual refresh button backed by `/api/dashboard/kpi/last-24h`.                        |
| Charts grid      | `DashboardChartsGrid.tsx`      | Hosts the type distribution bar chart, severity mix list, and daily trend summary. Each widget consumes its own endpoint (`/incidents/by-type`, `/incidents/severity-distribution`, `/incidents/daily-trend`). |
| Recent incidents | `DashboardRecentIncidents.tsx` | Lists the latest incidents returned by `/api/dashboard/incidents/recent`, including severity/status chips and localized timestamps.                                                                            |

All widgets accept result objects from their respective hooks, ensuring we can drop in real charting/visualization libraries in Tasks 5.3+ without rewriting container logic.

## Data hooks & services

- `useDashboardFilters.ts` reuses the incident table filters (`useIncidentTableData`) so the dashboard respects the same query parameters as the overview.
- `useDashboardLast24HoursKpi.ts`, `useDashboardTypeDistribution.ts`, `useDashboardSeverityDistribution.ts`, and `useDashboardDailyTrend.ts` each call their respective `/api/dashboard/*` endpoints while exposing a common status shape.
- `useDashboardAggregations.ts` simply composes the granular hooks above for scenarios where a single selector is still convenient.
- `useDashboardRecentIncidents.ts` reads `/api/dashboard/incidents/recent` with the same filter set and lifecycle handling.
- `dashboardService.ts` centralizes API helpers and typed payloads defined in `types/dashboard.ts`.

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

## Styling & responsiveness

Dashboard-specific styles live in `src/styles/dashboard/dashboard.scss` and are already imported through `index.scss`. The grid layout:

- Uses `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))` to collapse charts into a single column on narrow viewports.
- Adapts paddings for tablet screens (`max-width: 768px`) and keeps KPI/Recent cards legible on touch devices.
- Defines shared utility classes (`.dashboard-placeholder`, `.dashboard-error`, `.dashboard-empty`, `.dashboard-loading`) for consistent skeleton and error messaging.

## Testing

- **Unit:** `DashboardLayout.test.tsx` verifies loading and empty states for the three sections by mocking the data hooks.
- **Unit:** `DashboardKPIRow.test.tsx` exercises KPI loading, success (up & flat trends), and error retry flows against mocked hook state.
- **Unit:** `DashboardTypeDistributionChart.test.tsx` covers loading, error, empty, and toggle/tooltip behaviour for the type chart.
- **Routing:** `AppRouting.test.tsx` asserts the Overview⇄Dashboard navigation flow and `aria-current` handling in the header.
- **E2E:** `tests/e2e/dashboard.spec.ts` now includes a smoke test that visits `/dashboard`, ensures the nav tab is active, and checks that stub data renders.

Run the tests with:

```bash
npm --prefix client run test -- DashboardLayout.test.tsx AppRouting.test.tsx
npm --prefix client run test:e2e -- dashboard
```

(Replace the filenames with `--run` filters as needed.)

## Next steps

- Replace placeholder lists with real chart components once backend aggregations are finalized (Tasks 5.3–5.5).
- Extend `DashboardFilters` to surface quick filters when the incident table gains saved presets.
- Consider wiring WebSocket updates or Server-Sent Events for near-real-time KPI refreshes.
