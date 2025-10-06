# Strategic Analytics Guide

Phase 6 introduces executive-facing analytics that span months and quarters of incident history. This guide captures the frontend plumbing that fetches the backend `/api/strategic/*` endpoints and documents the `/strategic` route layout so future UI tasks can focus on presentation polish.

## Route & layout overview

- **Entry point:** `client/src/pages/StrategicPage.tsx` renders `StrategicLayout` inside the global shell.
- **Layout shell:** `client/src/layouts/StrategicLayout.tsx` arranges three sections:
  1. **Trend intelligence** — Monthly and quarterly cards with shared refresh controls and auto-refresh timestamps.
  2. **Composition & concentration** — Type timelines and hotspot summaries (Leaflet overlay TBD).
  3. **Upcoming panels** — Placeholder cards describing planned executive widgets.
- **Navigation:** The global header now exposes a **Strategic** tab (`/strategic`) alongside Overview and Dashboard; active states are handled via `NavLink` for accessibility.

Strategic cards reuse a shared styling bundle under `client/src/styles/strategic/` and lean on CSS grid to stay responsive.

## Service layer

- **Location:** `client/src/services/strategicAnalyticsService.ts`
- **Exports:**
  - `fetchMonthlyTrends({ months?, refresh?, ...filters })`
  - `fetchQuarterlyTrends({ quarters?, refresh?, ...filters })`
  - `fetchTypeTimelines({ months?, refresh?, ...filters })`
  - `fetchHotspots({ resolution?, refresh?, ...filters })`
- **Behaviour:**
  - Reuses the dashboard query-string conventions (`typeCodes`, `severityCodes`, `statusCodes`, date ranges, `incidentNumber`, `isActive`).
  - Accepts optional window controls (`months`, `quarters`) and hotspot `resolution` while preserving shared filters.
  - Passes `refresh=true` when a manual refresh is requested so the server can bypass its cache.
  - Throws rich `Error` instances with backend messages when a request fails.

## Hooks

All hooks live under `client/src/hooks` and share a common contract via `useStrategicQuery`.

| Hook                                                                   | Returns                           | Notes                                                                                   |
| ---------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------- |
| `useStrategicMonthlyTrends({ months?, filters?, autoRefreshMs? })`     | `StrategicMonthlyTrendResponse`   | Twelve-month window by default, auto refreshes every 5 minutes unless disabled.         |
| `useStrategicQuarterlyTrends({ quarters?, filters?, autoRefreshMs? })` | `StrategicQuarterlyTrendResponse` | Surfaces both the raw series and summary deltas for executive KPI cards.                |
| `useStrategicTypeTimelines({ months?, filters?, autoRefreshMs? })`     | `StrategicTypeTimelineResponse`   | Includes totals-per-month plus per-type time series ready for stacked/segmented charts. |
| `useStrategicHotspots({ resolution?, filters?, autoRefreshMs? })`      | `StrategicHotspotResponse`        | Outputs gridded heatmap metadata + cells suitable for Leaflet overlays.                 |

Each hook exposes:

```ts
{
  status: 'idle' | 'loading' | 'success' | 'error',
  data: ResponseType | null,
  error: string | null,
  lastUpdated: string | null,
  refresh: () => void,
  isIdle: boolean,
  isLoading: boolean,
  isSuccess: boolean,
  isError: boolean,
}
```

`autoRefreshMs` controls the TTL-driven refresh cadence (default 5 minutes, pass `null` to disable). Manual calls to `refresh()` immediately request fresh data with `refresh=true`.

### Shared filters

`useStrategicQuery` delegates to `useStrategicFilters`, which currently aliases `useDashboardFilters`. This keeps strategic analytics in sync with the incidents table and existing dashboard filters. If strategic surfaces require bespoke filters later, swap the implementation inside `useStrategicFilters` without touching the hooks or services.

## Testing

- **Service tests:** `client/src/services/strategicAnalyticsService.test.ts` mock `fetch` to verify query-string construction, refresh semantics, and error propagation.
- **Hook tests:** `client/src/hooks/useStrategicAnalytics.test.tsx` use MSW to cover loading, manual refresh flows, TTL auto-refresh, error handling, and hotspot query params. The tests mock `useStrategicFilters` to remain decoupled from the incidents table store.
- **Page integration test:** `client/src/components/StrategicPage.integration.test.tsx` mounts `StrategicPage` with MSW handlers to assert rendering, refresh actions, and timestamp wiring.
- **Playwright coverage:** `client/tests/e2e/dashboard.spec.ts` includes a strategic scenario that hits `/strategic`, verifies key cards, and confirms navigation/refresh flows.

Run the suite with:

```bash
npm run lint:client
npm run test:client -- --runTestsByPath src/services/strategicAnalyticsService.test.ts src/hooks/useStrategicAnalytics.test.tsx src/components/StrategicPage.integration.test.tsx
npm run test:client:e2e -- strategic
```

(Regular `npm run test:client` already covers these files.)

## Next steps for UI tasks

- Replace placeholder cards with production components (resource readiness index, forecasts, mitigation recommendations) as data products land.
- Add Leaflet hotspot overlays that consume `useStrategicHotspots` once map requirements finalize.
- Incorporate executive filter presets once Phase 6 filter requirements land (e.g., severity or region bundles).
- Layer charting primitives (Stacked area/column charts) on top of the monthly/quarterly/time-series data.
