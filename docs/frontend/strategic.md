# Strategic Analytics Guide

Phase 6 introduces executive-facing analytics that span months and quarters of incident history plus early operations readiness views. This guide captures the frontend plumbing that fetches the backend `/api/strategic/*` endpoints and documents the `/strategic` route layout so future UI tasks can focus on presentation polish.

## Route & layout overview

- **Entry point:** `client/src/pages/StrategicPage.tsx` renders `StrategicLayout` inside the global shell.
- **Layout shell:** `client/src/layouts/StrategicLayout.tsx` arranges four sections:
  1. **Trend intelligence** — A month-over-month trend chart with 6/12/24-month selectors, CSV/PNG export buttons, and a grouped quarter-over-quarter comparison chart with timeframe toggles, delta annotations, and CSV/PNG exports.
  2. **Composition & concentration** — The interactive type trend explorer with moving-average windows, the hotspot heatmap overlay card (Leaflet layer with resolution/intensity controls, refresh/cancel actions, and legend), the station coverage buffer overlay card (per-station toggles, metadata, refresh/cancel), plus the supporting hotspot summary metrics card.
  3. **Response & readiness** — Response metrics and priority scoring cards that surface the new backend analytics.
  4. **Upcoming panels** — Placeholder cards describing planned executive widgets.
- **Navigation:** The global header now exposes a **Strategic** tab (`/strategic`) alongside Overview and Dashboard; active states are handled via `NavLink` for accessibility.

## Service layer

- **Location:** `client/src/services/strategicAnalyticsService.ts`
- **Exports:**
  - `fetchMonthlyTrends({ months?, refresh?, ...filters })`
  - `fetchQuarterlyTrends({ quarters?, refresh?, ...filters })`
  - `fetchTypeTimelines({ months?, refresh?, ...filters })`
  - `fetchHotspots({ resolution?, refresh?, ...filters })`
  - `fetchCoverageBuffers({ refresh?, ...filters })`
  - `fetchResponseMetrics({ groupBy?, resolution?, refresh?, ...filters })`
  - `fetchPriorityScores({ groupBy?, resolution?, decayHalfLifeDays?, refresh?, ...filters })`
- **Behaviour:**
  - Reuses the dashboard query-string conventions (`typeCodes`, `severityCodes`, `statusCodes`, date ranges, `incidentNumber`, `isActive`).
  - Accepts optional window controls (`months`, `quarters`), hotspot/response grid `resolution`, and priority score decay controls while preserving shared filters.
  - Passes `refresh=true` when a manual refresh is requested so the server can bypass its cache.
  - Throws rich `Error` instances with backend messages when a request fails.

## Hooks

All hooks live under `client/src/hooks` and share a common contract via `useStrategicQuery`.

| Hook                                                                                                                               | Returns                                                 | Notes                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useStrategicMonthlyTrends({ months?, filters?, autoRefreshMs?, availableTimeframes? })`                                           | `StrategicMonthlyTrendsState`                           | Tracks a cache per timeframe (6/12/24 months by default), exposes `timeframe`, `setTimeframe`, exports, and refresh helpers.                         |
| `useStrategicQuarterlyTrends({ quarters?, filters?, autoRefreshMs?, availableTimeframes? })`                                       | `StrategicQuarterlyTrendsState`                         | Tracks cached quarter windows (4/8 quarters by default), exposes `timeframe`, `setTimeframe`, exports, and refresh helpers for the comparison chart. |
| `useStrategicTypeTimelines({ months?, filters?, autoRefreshMs?, availableWindows?, defaultTypeCode?, defaultMovingAverageDays? })` | `StrategicTypeTimelinesState`                           | Tracks type metadata, selected type, moving-average window selections, caches trend calculations per type/window, and synchronizes shared filters.   |
| `useStrategicHotspots({ resolution?, filters?, autoRefreshMs? })`                                                                  | `StrategicQueryState<StrategicHotspotResponse>`         | Outputs gridded heatmap metadata + cells suitable for Leaflet overlays, exposing `refresh()` and `cancel()` helpers for manual control.              |
| `useStrategicCoverageBuffers({ filters?, autoRefreshMs? })`                                                                        | `StrategicQueryState<StrategicCoverageResponse>`        | Fetches per-station coverage polygons, exposing refresh/cancel for manual control and supporting map overlay toggles.                                |
| `useStrategicResponseMetrics({ groupBy?, resolution?, autoRefreshMs? })`                                                           | `StrategicQueryState<StrategicResponseMetricsResponse>` | Benchmarks response times by station/grid with normalization, percentile ranks, and sample caps.                                                     |
| `useStrategicPriorityScores({ groupBy?, resolution?, decayHalfLifeDays?, autoRefreshMs? })`                                        | `StrategicQueryState<StrategicPriorityScoreResponse>`   | Surfaces severity-weighted demand signals for station or grid overlays, with optional time decay.                                                    |

All hooks (apart from the specialised monthly trends state) expose:

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

`autoRefreshMs` controls the TTL-driven refresh cadence (default 5 minutes, pass `null` to disable). Manual calls to `refresh()` immediately request fresh data with `refresh=true`. The monthly hook extends this contract with timeframe selection (`timeframe`, `setTimeframe`, `availableTimeframes`) and reuses cached responses when switching between windows to keep the UI responsive. The type timelines hook adds `availableTypes`, `selectedTypeCode`, `setSelectedTypeCode`, `availableWindows`, and `setMovingAverageWindow`, caches trend calculations per type/window combination, and pushes selections back into the shared filter store so other widgets (map, table, strategic cards) stay in sync.

The derived monthly state shape is:

```ts
type StrategicMonthlyTrendsState = {
  timeframe: number;
  setTimeframe: (months: number) => void;
  availableTimeframes: number[];
} & StrategicQueryState<StrategicMonthlyTrendResponse>;
```

```ts
type StrategicQuarterlyTrendsState = {
  timeframe: number;
  setTimeframe: (quarters: number) => void;
  availableTimeframes: number[];
} & StrategicQueryState<StrategicQuarterlyTrendResponse>;
```

```ts
type StrategicTypeTimelinesState = {
  availableTypes: Array<{ code: string; name: string }>;
  selectedTypeCode: string | null;
  selectedTypeName: string | null;
  setSelectedTypeCode: (code: string | null) => void;
  availableWindows: number[];
  movingAverageWindow: number;
  setMovingAverageWindow: (days: number) => void;
  selectedSeries: StrategicTypeTrendPoint[];
  movingAverageSeries: StrategicTypeTrendPoint[];
  summary: StrategicTypeTimelineSummary;
} & StrategicQueryState<StrategicTypeTimelineResponse>;
```

### Hotspot overlay component

- **Location:** `client/src/components/strategic/StrategicHotspotOverlayCard.tsx`
- **Behaviour:**
  - Renders a Leaflet `MapContainer` with the strategic hotspot grid as a choropleth overlay (`StrategicHotspotLayer`).
  - Provides resolution dropdown (kept in sync with backend metadata) and intensity scaling slider (0.5×–3× exponent) with accessible labels.
  - Exposes refresh & cancel buttons wired to `useStrategicHotspots` so long-running requests can be aborted.
  - Shows a responsive legend/metadata footer and guards empty/error states with actionable messaging.
- **Styling:** SCSS lives in `client/src/styles/strategic/_hotspot-overlay.scss` and is bundled via `strategic.scss`.

### Coverage overlay component

- **Location:** `client/src/components/strategic/StrategicCoverageOverlayCard.tsx`
- **Behaviour:**
  - Renders Leaflet coverage polygons (`StrategicCoverageOverlayLayer`) with per-station toggles and hover tooltips showing radius, status, and updated timestamps.
  - Provides “Enable all / Disable all” controls plus refresh & cancel buttons wired to `useStrategicCoverageBuffers`.
  - Includes a metadata footer (station counts, visible selection, generated timestamp) and handles empty/error states with actionable messaging.
- **Styling:** SCSS lives in `client/src/styles/strategic/_coverage-overlay.scss` and is bundled via `strategic.scss` alongside the hotspot styles.

### Shared filters

`useStrategicQuery` delegates to `useStrategicFilters`, which currently aliases `useDashboardFilters`. This keeps strategic analytics in sync with the incidents table and existing dashboard filters. If strategic surfaces require bespoke filters later, swap the implementation inside `useStrategicFilters` without touching the hooks or services.

## Testing

- **Service tests:** `client/src/services/strategicAnalyticsService.test.ts` mock `fetch` to verify query-string construction, refresh semantics, and error propagation.
- **Hook tests:** `client/src/hooks/useStrategicAnalytics.test.tsx` use MSW to cover loading, manual refresh flows, TTL auto-refresh, error handling, hotspot query params, and the response-metric/priority-score/type-timeline hooks.
- **Component tests:** `client/src/components/strategic/StrategicQuarterComparisonChart.test.tsx` validate grouped bar rendering, timeframe toggles, CSV exports, and error/loading states; `client/src/components/strategic/StrategicTypeTrendExplorer.test.tsx` assert dropdown behaviour, moving-average window toggles, refresh callback wiring, and empty-state rendering; `client/src/components/strategic/StrategicHotspotOverlayCard.test.tsx` covers hotspot overlay rendering (resolution/intensity controls, refresh/cancel flows, and error/empty states); `client/src/components/strategic/StrategicCoverageOverlayCard.test.tsx` verifies coverage toggles, bulk enable/disable, refresh/cancel states, and empty/error handling.
- **Page integration test:** `client/src/components/StrategicPage.integration.test.tsx` mounts `StrategicPage` with MSW handlers to assert rendering, timeframe toggles (monthly + quarterly), type explorer filter propagation, refresh actions, and timestamp wiring.
- **Playwright coverage:** `client/tests/e2e/dashboard.spec.ts` includes a strategic scenario that hits `/strategic`, verifies the monthly and quarterly timeframe controls (including cached re-selection and export affordances), interacts with the hotspot overlay (resolution/intensity/refresh controls), toggles station coverage overlays (per-station enable/disable + refresh), exercises the type trend explorer (type selection + moving average), and confirms navigation/refresh flows.

Run the suite with:

```bash
npm run lint:client
npm run test:client -- --runTestsByPath src/services/strategicAnalyticsService.test.ts src/hooks/useStrategicAnalytics.test.tsx src/components/strategic/StrategicHotspotOverlayCard.test.tsx src/components/strategic/StrategicCoverageOverlayCard.test.tsx src/components/StrategicPage.integration.test.tsx
npm --prefix client run test:e2e -- --grep strategic
```

(Regular `npm run test:client` already covers these files.)

## Next steps for UI tasks

- Replace placeholder cards with production components (resource readiness index, forecasts, mitigation recommendations) as data products land.
- Add Leaflet hotspot overlays that consume `useStrategicHotspots` once map requirements finalize.
- Incorporate executive filter presets once Phase 6 filter requirements land (e.g., severity or region bundles).
- Layer charting primitives (Stacked area/column charts) on top of the monthly/quarterly/time-series data.
