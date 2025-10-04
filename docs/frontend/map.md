# Map Experience Guide

This guide explains how the Geospatial Incident Platform map works, the endpoints it consumes, and how to validate the new functionality introduced in Tasks 3.4–3.8. Share it with frontend contributors, QA, and stakeholders who need a walkthrough of the incident map and station overlay.

> **Navigation note:** The global header now exposes two routes—**Overview** (map/table experience) and **Dashboard** (analytics scaffold). Use the Overview tab or visit `/overview` to follow this guide; jump to `/dashboard` for analytics details covered in [`docs/frontend/dashboard.md`](./dashboard.md).

## Architecture & Data Flow

- Component entry point: `client/src/components/MapView.tsx`
- Data hooks:
  - `useIncidents()` fetches `/api/incidents` once, capping results at 5 000 summaries to satisfy RF07. It exposes loading/error states, pagination metadata, and a remainder indicator when more incidents exist than the cap renders.
  - `useStations({ isActive: true })` fetches `/api/stations` and memoizes results per filter. Requests rely on browser caching via `AbortController` and an in-memory cache for quick toggles.
  - `useIncidentSearch()` hydrates `/api/incidents/meta`, debounces `/api/incidents/search` lookups, and exposes `search`, `lastResult`, and error/loading flags for the global search bar.
- State management:
  - `useMapStore` stores the current map center/zoom.
  - `useMapPreferencesStore` stores UI preferences (currently only the station overlay toggle).
  - `useIncidentDetailStore` tracks the incident selected in the popup and controls whether the detail modal is open.
  - `useIncidentTableData` now responds to an `incidentNumber` filter that the search bar toggles to automatically surface the located incident in the table.
- Rendering pipeline:
  1. `MapContainer` (Leaflet) renders the tile layer and orchestrates the viewport.
  2. `IncidentClusterLayer` clusters incidents with `supercluster` and renders cluster markers or individual incident markers with popups.
  3. `StationLayer` renders optional fire station markers (disabled until the toggle is enabled) with custom icons.
  4. `IncidentDetailModal` opens when a user clicks **View details** in the popup (placeholder detail body until Task 4.x).

## Incident Clusters & Popups

- Clustering is powered by `supercluster` with a radius of 60 pixels and a max zoom of 18.
- Clicking a cluster zooms the map to the cluster’s expansion zoom level (capped at the map’s max zoom).
- Individual markers display a popup via `IncidentPopup` that surfaces severity, status, occurrence/report timestamps, and a detail button.
- The severity chip uses the `colorHex` provided by the API to maintain a consistent legend.

## Remainder Indicator

The banner above the map displays **“Showing X of Y incidents”** when more incidents exist than the 5 000 render cap. This ensures users know additional data is available via filters or server pagination.

## Station Overlay

- Toggle: `<input type="checkbox">` bound to `useMapPreferencesStore.showStations`.
- When enabled, the map renders custom div-icon markers with a 🚒 glyph.
- Each station popup shows the station code, active status, and contact phone. Response zone boundaries are fetched but currently not drawn—future work may plot polygons or coverage circles.
- The hook memoizes results so repeatedly toggling stations avoids additional network requests unless the user explicitly refreshes.

## Detail Modal

- `IncidentDetailModal` subscribes to `useIncidentDetailStore`, which now prefetches `/api/incidents/{incidentNumber}` when the modal opens from either the map or the incidents table.
- Responses are cached in-memory by incident number to prevent redundant requests; retry/loader states surface in the modal header when fetches are pending or fail.
- Closing the modal resets selection via `closeIncident()` and aborts any in-flight detail fetch to keep the store consistent with user intent.

## Incident Search & Table Sync

- The dashboard header renders `IncidentSearchBar` (see `client/src/components/IncidentSearchBar.tsx`). It loads `/api/incidents/meta` for placeholder text, debounces `/api/incidents/search`, and persists the five most recent hits to `localStorage` (`gip::incidentSearchHistory::v1`).
- On a successful lookup, the search bar:
  1. Calls `useMapStore.setView` with the incident's coordinates (zoom `14`) to recenter the map.
  2. Invokes `useIncidentDetailStore.openIncident`, priming the detail modal cache and highlighting the matching row in the table.
  3. Passes the uppercase incident number to `useIncidentTableData.setFilters`, which re-fetches the table with an `incidentNumber` filter so the located record appears at the top.
- The incident table listens for changes to the selected incident. When the modal closes (`closeIncident()`), it clears the incident-number filter so pagination returns to the previous view.
- Component-level tests (`IncidentSearchBar.test.tsx`, `IncidentTable.test.tsx`) cover success/error states, history persistence, and the cross-store integration described above.

## Testing & Validation

- Frontend map integration test: `client/src/components/MapView.integration.test.tsx` mocks API responses and verifies clustering, station toggle, and detail modal wiring.
- Run with:

```bash
npm --prefix client run test -- --run MapView.integration.test.tsx
```

(Or `npm run test` from the repo root to execute the full suite.)

- Backend integration tests validating `/api/incidents` and `/api/stations` reside under `server/tests/db/` and execute with `npm run test:server:integration`.
- See [`docs/operations/testing.md`](../operations/testing.md) for prerequisites (Docker Compose stack, migrations, seeds) and command reference.

## Troubleshooting

| Symptom                         | Resolution                                                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Map renders no incidents        | Confirm `/api/incidents` is reachable (browser network tab). Backend logs report query errors in development. Re-run `make db-seed` if the database is empty.                   |
| Station toggle shows error      | Station hook surfaces API errors in the toolbar. Check the backend server logs; invalid `isActive` query strings will return `400 BAD_REQUEST`.                                 |
| Clusters never expand           | Ensure the max zoom is not locked (drag the zoom control). If clusters still fail to expand, verify `supercluster` dependencies by re-running `npm install`.                    |
| Detail modal immediately closes | The detail store requires the popup button event; ensure nothing is calling `closeIncident()` during render (custom integrations should avoid manipulating the store directly). |

## Roadmap Notes

- **Incident detail modal**: future polish will layer richer formatting (attachments, responder checklists) and orchestrate refresh cues with dashboard metrics.
- **Response zones**: polygon overlays and analytics layers can consume the `responseZone.boundary` GeoJSON returned by `/api/stations`.
- **Filters**: map controls for severity/type/date filtering will reuse `useIncidents` filtering options once the backend exposes query parameters.

## Related Documentation

- [`docs/api/incidents-and-stations.md`](../api/incidents-and-stations.md) — Endpoint reference powering the map.
- [`docs/data-model/README.md`](../data-model/README.md) — Schema context for incidents and stations.
- [`docs/operations/testing.md`](../operations/testing.md) — Integration test workflow covering backend and frontend suites.
