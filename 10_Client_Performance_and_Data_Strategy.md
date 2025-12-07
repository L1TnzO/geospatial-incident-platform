# Client-Side Performance & Data Strategy

## The Challenge: Visualizing "Big Data" on the Web

Geospatial applications face a unique challenge: The dataset (incidents) is massive, but the viewport (screen) is small. Loading 100,000 points crashes the browser.

## 1. The Clustering Pyramid (Frontend)

**Implementation**: `client/src/workers/incident-worker.ts` using `Supercluster`.

### Why a Web Worker?
JavaScript is single-threaded. If we calculate clusters on the Main Thread:
1.  User pans map.
2.  JS loop starts (100ms).
3.  Browser cannot repaint.
4.  **Result**: "Jank" / Stuttering.

**Solution**:
*   The Worker runs in a separate thread.
*   The Main Thread stays free to handle Touch/Scroll events at 60fps.
*   When the Worker finishes, it posts a message: "Here are the new markers". React updates the DOM in one batch.

### Supercluster Internals
*   **Index**: It builds a KDB-Tree (spatial index).
*   **Zoom Levels**: It pre-calculates clusters for every zoom level (0-19).
*   **Performance**: `load()` takes `O(N log N)`. `getClusters()` takes `O(1)` (very fast).

## 2. Data Fetching Strategy: "The Onion Model"

The application uses `useIncidentsData.ts` to implement a multi-layered fetching strategy.

### Layer 1: Viewport Priority
*   **Logic**: "Load what the user sees *first*."
*   **Mechanism**: The `useMapStore` tracks bounds. The API request sends `bbox`.
*   **Benefit**: Time-to-First-Byte is low because the DB query is fast (Spatial Index).

### Layer 2: Background Fill
*   **Logic**: "Load the rest while the user thinks."
*   **Mechanism**: Once the viewport is loaded, a second query runs for the global dataset (paginated).
*   **Benefit**: When the user zooms out, the data is already in RAM. No loading spinner.

### Layer 3: Delta Synchronization
*   **Logic**: "Don't re-download what we already have."
*   **Mechanism**:
    1.  Client asks: "What is the timestamp of the latest incident?" (`HEAD /incidents`).
    2.  Server says: `2023-10-27T10:00:00Z`.
    3.  Client checks local IndexedDB. If matches -> Use cache.
    4.  If different -> Fetch only `?since=...`.

## 3. Render Optimization

### React Query Caching
*   **Key**: `['incidents', { typeCodes: ... }]`.
*   **Behavior**:
    *   If user switches to "Analytics" tab and back to "Map", the Map renders *instantly* from cache.
    *   Background refetch happens silently.

### Transient State (Zustand)
*   **Problem**: Updating React State (`useState`) triggers a re-render of the component tree.
*   **Scenario**: Mouse hover over a map pin.
*   **Optimization**: Zustand allows updating the "Selected ID" without re-rendering the entire Map Layout. Only the Popup component listens to that specific slice of state.

## 4. Network Payload Optimization

### DTOs (Data Transfer Objects)
*   **LiteIncident**: Contains `{ id, lat, lng, type }`. Size: ~100 bytes.
*   **FullIncident**: Contains `{ narrative, metadata, logs }`. Size: ~5KB.
*   **Strategy**: The "List/Map" endpoint returns `LiteIncident[]`. The "Detail" endpoint returns `FullIncident`.
*   **Impact**: Reduces bandwidth by 98% for the initial load.

### GeoJSON vs Proprietary JSON
*   **Format**: The API returns standard JSON, not GeoJSON `FeatureCollection` for the list.
*   **Reason**: GeoJSON is verbose (`"type": "Feature", "properties": { ... }`). Flat JSON is smaller.
*   **Client Conversion**: The frontend converts it to GeoJSON/Supercluster format on the fly. CPU is cheap; Bandwidth is expensive (on mobile).
