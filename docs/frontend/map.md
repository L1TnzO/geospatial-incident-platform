# Map Experience Guide

This guide explains how the Geospatial Incident Platform map works, the endpoints it consumes, and how to validate the new functionality introduced in Tasks 3.4–3.8. Share it with frontend contributors, QA, and stakeholders who need a walkthrough of the incident map and station overlay.

## Architecture & Data Flow

- Component entry point: `client/src/components/MapView.tsx`
- Data hooks:
  - `useIncidents()` fetches `/api/incidents` once, capping results at 5 000 summaries to satisfy RF07. It exposes loading/error states, pagination metadata, and a remainder indicator when more incidents exist than the cap renders.
  - `useStations({ isActive: true })` fetches `/api/stations` and memoizes results per filter. Requests rely on browser caching via `AbortController` and an in-memory cache for quick toggles.
- State management:
  - `useMapStore` stores the current map center/zoom.
  - `useMapPreferencesStore` stores UI preferences (currently only the station overlay toggle).
  - `useIncidentDetailStore` tracks the incident selected in the popup and controls whether the detail modal is open.
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

- `IncidentDetailModal` subscribes to `useIncidentDetailStore` to display the selected incident number.
- The modal currently shows placeholder text noting that Task 4.x will hydrate it with `/api/incidents/{incidentNumber}` data.
- Closing the modal resets state via `closeIncident()` and returns focus to the previous context (button-driven interactions already retain focus).

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

- **Incident detail modal**: will render API payloads (units, assets, narratives) when Task 4.x integrates the detail endpoint.
- **Response zones**: polygon overlays and analytics layers can consume the `responseZone.boundary` GeoJSON returned by `/api/stations`.
- **Filters**: map controls for severity/type/date filtering will reuse `useIncidents` filtering options once the backend exposes query parameters.

## Related Documentation

- [`docs/api/incidents-and-stations.md`](../api/incidents-and-stations.md) — Endpoint reference powering the map.
- [`docs/data-model/README.md`](../data-model/README.md) — Schema context for incidents and stations.
- [`docs/operations/testing.md`](../operations/testing.md) — Integration test workflow covering backend and frontend suites.
