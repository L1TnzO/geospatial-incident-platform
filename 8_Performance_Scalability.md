# Performance and Scalability

## 1. Database Optimization (The Core Bottleneck)

*   **Spatial Indexing**:
    *   **Evidence**: `server/db/migrations/202510010001_initial_schema.js`
    *   **Implementation**: `CREATE INDEX idx_incidents_location ON incidents USING GIST (location)`.
    *   **Impact**: This is the single most important performance feature. It allows `ST_Within(location, screen_bounds)` queries to run in milliseconds even with millions of rows. Without it, the map would freeze.
*   **Temporal Indexing**:
    *   **Evidence**: `idx_incidents_occurrence_at`.
    *   **Impact**: Speeds up "Last 24 Hours" or "Historic Trend" queries.
*   **Compound Indexes**:
    *   **Evidence**: `incident_daily_metrics` has a unique constraint on `(metric_date, type_id, severity_id, station_id)`. This implicitly acts as an index for these lookups.

## 2. Query Optimization Strategy

*   **Aggregation Tables**:
    *   **Evidence**: `incident_daily_metrics`, `incident_geohash_tiles`.
    *   **Strategy**: The schema includes "Pre-calculated" tables.
    *   **Why?**: Calculating "Total Incidents by Type for 2024" on the fly from the raw `incidents` table (1M+ rows) is slow. Querying a pre-aggregated `metrics` table (365 rows) is instant.
    *   **Recommendation**: Ensure a Cron Job or Trigger keeps these tables in sync (Ref: `StrategicAnalyticsService` seems to calculate on the fly currently with caching; moving to materialized views would be the next step).

## 3. Caching Strategy

*   **Application-Level Caching**:
    *   **File**: `server/src/services/strategicService.ts`.
    *   **Mechanism**: In-memory `Map<string, CacheEntry>`. `STRATEGIC_CACHE_TTL_MS = 5 * 60 * 1000` (5 mins).
    *   **Impact**: Expensive aggregations (Trends, Heatmaps) are computed once and served instantly for subsequent requests.
    *   **Scalability Limit**: This is **Local Memory**. If you scale the backend to 5 replicas (Kubernetes), each has its own cache.
    *   **Future Scale**: Replace `Map` with **Redis** to share cache across instances.

## 4. Frontend Optimization

*   **Virtualization**:
    *   **Table View**: If `TableView` renders 1000 rows, the DOM will lag.
    *   **Solution**: `tanstack/react-query` handles pagination (`useIncidentsTableData`). The UI likely renders only the current page (25 rows), preventing DOM overload.
*   **Map Clustering**:
    *   **Evidence**: `supercluster` dependency in `client/package.json`.
    *   **Impact**: When zoomed out, rendering 10,000 markers crashes the browser. Clustering groups them into single "bubble" markers, keeping the DOM light.
*   **Bundle Size**:
    *   **Tool**: `Vite`.
    *   **Strategy**: Tree-shaking is automatic. Dynamic imports (`React.lazy`) should be used for heavy routes like `StrategicPage`.

## 5. Horizontal Scalability

*   **Statelessness**: The backend appears stateless (tokens likely sent per request, cache is transient). This means you can run 10 instances behind a Load Balancer (Nginx/AWS ALB) without sticky sessions.
*   **Database Limits**: Postgres is vertical scaling. To scale writes, you'd eventually need Read Replicas (for the heavy `StrategicService` reads) and a Primary for writes (`createIncident`).
