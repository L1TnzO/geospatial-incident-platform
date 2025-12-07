# Performance and Scalability

## 1. Database Optimization

PostgreSQL + PostGIS is powerful, but optimization is key for scale.

### Indexing Strategy Deep Dive
*   **Spatial Index (`GIST`)**:
    *   **Mechanism**: The R-Tree structure recursively splits space into bounding boxes.
    *   **Impact**: Querying "Find points in this viewport" becomes `O(log N)`.
    *   **Maintenance**: GIST indexes can get bloated. Requires periodic `VACUUM ANALYZE`.
*   **Covering Indexes**:
    *   **Observation**: `incident_daily_metrics` has a unique constraint on multiple columns. This acts as a covering index for queries filtering by Date + Station.
    *   **Result**: The DB reads from the Index Only (RAM), avoiding disk I/O to the Table Heap.

### Connection Pooling
*   **Knex Pool**: By default, Knex uses `tarn.js` for pooling.
*   **Settings**: `min: 2, max: 10`.
*   **Scaling Issue**: If we scale Node.js to 10 instances, we have 100 connections. Postgres creates a process per connection (heavy).
*   **Solution**: Use **PgBouncer** in production to multiplex thousands of client connections into a small pool of DB connections.

## 2. Caching Layers

### Tier 1: Browser Cache (HTTP)
*   **Static Assets**: Vite hashes filenames (`index.a1b2.js`). These can be cached forever (`Cache-Control: max-age=31536000`).
*   **API Responses**: Currently `no-cache`. Could add `ETag` support to return `304 Not Modified` for polling.

### Tier 2: Application Cache (In-Memory)
*   **Implementation**: `StrategicService` uses a `Map`.
*   **Pros**: Ultra-fast (nanoseconds).
*   **Cons**:
    *   **Memory Leaks**: If the Map grows unbounded. (Current code uses TTL cleanups).
    *   **Inconsistency**: In a cluster, Server A might have stale stats vs Server B.
*   **Future**: Move to Redis.

### Tier 3: Client State (React Query)
*   **Stale-While-Revalidate**: The user sees stale data instantly while the network updates it.
*   **Optimistic Updates**: When creating an incident, we can update the cache *before* the server responds, making the UI feel "instant".

## 3. Frontend Rendering Optimization

### Map Clustering
*   **The Problem**: 50,000 Markers = 50,000 DOM Nodes. Chrome crashes at ~5,000.
*   **The Solution**: Supercluster (KDB-Tree).
*   **Web Worker**: Moving this logic off-thread is the single biggest performance win. It allows the map to pan at 60fps even while calculating clusters.

### Virtualization
*   **List View**: If the user scrolls through 10,000 incidents, rendering `<li>` for each is slow.
*   **Strategy**: Use `react-window`. Only render the 20 items currently on screen.

### Code Splitting
*   **Routes**: `StrategicPage` imports heavy charting libraries (`Recharts`).
*   **Optimization**: Use `React.lazy(() => import('./pages/StrategicPage'))`. This removes 200KB from the initial bundle load.

## 4. Horizontal Scalability Strategy

### Backend (Stateless)
*   **Session State**: Currently relies on JWT (stateless). This is good.
*   **Scaling**: Can deploy N replicas behind a Load Balancer.
*   **Bottleneck**: The Database.

### Database (Stateful)
*   **Read Replicas**: `StrategicService` (Analytics) does heavy READ operations.
    *   **Strategy**: Configure Knex to send SELECT queries to a Read Replica, keeping the Primary free for WRITEs (`createIncident`).
*   **Sharding**:
    *   **Geo-Sharding**: Partition data by Region (e.g., "North", "South"). PostGIS handles this well.
