# Client-Side Performance & Data Strategy

## The "Map Collapse" Problem

When plotting geospatial data, a naive approach ("fetch everything, render everything") leads to catastrophic failure.

*   **DOM Overload**: Rendering 10,000 DOM nodes (Markers) causes the browser's layout engine to freeze.
*   **Network Congestion**: Transferring 10MB of JSON blocks the main thread during parsing.
*   **User Experience**: A map covered in overlapping pins is unreadable ("Pin Confetti").

This application implements a multi-layered strategy to prevent this collapse.

## 1. Client-Side Clustering (The Anti-Crash Mechanism)

**Implementation**: `client/src/components/map/IncidentClusterLayer.tsx` & `client/src/workers/incident-worker.ts`

The application uses **Supercluster** running inside a **Web Worker** to aggregate points off the main thread.

*   **How it works**:
    1.  **Ingestion**: Raw incident data (thousands of points) is sent to the Worker (`SET_DATA`).
    2.  **Indexing**: The Worker builds a spatial index (KDB-Tree) using `Supercluster`.
    3.  **Aggregation**: When the map moves/zooms, the UI sends the new Bounding Box (`bbox`) and Zoom Level to the Worker (`GET_CLUSTERS`).
    4.  **Response**: The Worker returns a mix of "Clusters" (aggregates) and "Leaves" (individual points).
    5.  **Rendering**: The Main Thread renders only the visible clusters/markers (e.g., 50 clusters instead of 10,000 markers).

*   **Why it's key**:
    *   **Main Thread Freedom**: Heavy math happens in the background. The map remains interactive (pan/zoom) even while processing 50k points.
    *   **Visual Hierarchy**: Users see "245 Incidents here" instead of a blob of color.
    *   **Logarithmic Scaling**: The visual weight of clusters (`getClusterSize`) scales logarithmically, preventing giant bubbles from obscuring the map.

## 2. High-Level Data Loading Optimizations

### A. Viewport-Based Prioritization ("Load What You See")

**Implementation**: `client/src/hooks/useIncidentsData.ts` (`fetchIncidentsAggregated`)

Instead of a simple `GET /incidents`, the hook implements a sophisticated "Phased Loading" strategy.

1.  **Viewport Phase**:
    *   Prioritizes fetching data *inside* the user's current view.
    *   Sends `viewportBounds` (North/South/East/West) to the backend.
    *   **Benefit**: Users see local data immediately.

2.  **Global Phase (Background)**:
    *   After the viewport is filled, it continues fetching the rest of the dataset in the background.
    *   **Benefit**: When the user pans the map later, the data is already there (Instant interaction).

3.  **Incremental Emission (`emitPartial`)**:
    *   The hook yields results as they arrive (streaming-like behavior).
    *   The UI updates progressively, rather than waiting for a generic "Loading..." spinner to finish for the whole dataset.

### B. Intelligent Caching (React Query + IDB)

**Implementation**: `client/src/hooks/useIncidentsData.ts`

*   **Stale-While-Revalidate**:
    *   React Query serves cached data *instantly* while a background refetch occurs.
    *   **Impact**: Zero "flicker" when switching tabs or filters.
*   **Persistence (IndexedDB)**:
    *   Uses `idb-keyval` to persist the incident cache to the browser's IndexedDB.
    *   **Impact**: On page reload, the map populates *instantly* from local storage while the network request warms up.
*   **Delta Sync**:
    *   Checks `syncStatus` (Last Modified Timestamp) from the server.
    *   If the local cache is fresh, **zero network transfer** occurs for the body.
    *   If slight changes occurred, it requests a "Delta" (only changed rows), merging them into the large local cache.

### C. Server-Side Pagination & Render Caps

**Implementation**: `server/src/controllers/incidentsController.ts` & `client/src/store/incident-filters-store.ts`

*   **Render Limits**:
    *   The store enforces a hard limit (e.g., `ACTIVE_RENDER_LIMIT_MAX = 10,000`).
    *   This protects the browser from running out of memory even if the backend *could* return 1 million rows.
*   **Pagination (Table View)**:
    *   The Table View (`TableView.tsx`) uses traditional server-side pagination (`page=1&pageSize=25`).
    *   It does *not* try to load the map's dataset. It requests a lean slice of data specifically for the grid.

## 3. Payload Optimization

*   **Lite Incidents**:
    *   The list endpoint returns a `LiteIncident` DTO, stripping heavy text fields (like `narrative` or full `metadata` JSON) that aren't needed for pins.
    *   **Detail on Demand**: Only when a user clicks a pin does `useIncidentDetail` fetch the full heavy record (`GET /incidents/:id`).

## Summary

The system achieves high performance through a pipeline of:
1.  **Backend**: Spatial Indexing (PostGIS) + Efficient Payload (Lite DTOs).
2.  **Transport**: Viewport Prioritization + Delta Sync.
3.  **Frontend**: Web Worker Clustering + Virtualization + IndexedDB Persistence.
