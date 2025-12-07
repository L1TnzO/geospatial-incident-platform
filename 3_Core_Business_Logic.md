# Anatomy of the "Core" (Critical Business Logic)

## Star Functions/Classes

### 1. `IncidentService.createIncident` (Transactional Write)
**Location:** `server/src/services/incidentsService.ts`

This function is the "Gatekeeper" of the system. It ensures that no invalid or logically inconsistent data enters the database.

**Line-by-Line Explanation (Pseudocode):**
1.  **Validation**:
    *   **Syntax**: Checks if `incidentNumber` matches regex (e.g., `INC-2023-001`).
    *   **Temporal Logic**: Ensures `reportedAt` >= `occurrenceAt`, `arrivalAt` >= `dispatchAt`. This prevents "Time Travel" bugs.
    *   **Geospatial**: Validates Lat/Lon bounds (-90 to 90, -180 to 180).
2.  **Status Logic**:
    *   If `status` is `RESOLVED` or `CANCELLED`, it forces `isActive = false`.
3.  **Persistence (Delegate to Repository)**:
    *   Calls `repository.createIncident`.
    *   **Error Handling**: Catches specific DB errors (Duplicate Key `23505`) and converts them to `HttpError.conflict` (409), ensuring the API user gets a clean error message, not a raw SQL dump.
4.  **Cache Invalidation**:
    *   Calls `this.clearCaches()`. This is critical. Since `IncidentService` caches metadata (stats), a new insert makes those stats stale. This line ensures the next dashboard load gets fresh data.

### 2. `StrategicAnalyticsService.getMonthlyTrend` (Complex Read/Aggregation)
**Location:** `server/src/services/strategicService.ts`

This function powers the executive dashboard. It's "Star" material because it handles **caching**, **temporal alignment**, and **derived metrics** (Month-over-Month growth).

**Line-by-Line Explanation (Pseudocode):**
1.  **Input Parsing**: Determines the time window (e.g., "Last 12 Months"). Defaults to 12 if not provided.
2.  **Cache Check**: Generates a cache key based on filters (`strategic:monthly:type=FIRE...`). If data is in memory and fresh (`< 5 mins`), returns it immediately.
3.  **Data Fetching**:
    *   Calculates the "Fetch Range". Note: It fetches *more* data than requested (e.g., previous year) to calculate trends.
    *   Calls `repository.getIncidentCountsByReportedMonth`.
4.  **Algorithm - Series Generation**:
    *   Iterates month-by-month from Start to End.
    *   **Gap Filling**: If the DB returns no data for "Feb", the loop ensures "Feb" is present in the output with `count: 0`.
    *   **Calculations**:
        *   `MoM (Month-over-Month)`: `(Current - Previous) / Previous`.
        *   `YoY (Year-over-Year)`: Looks back 12 indexes to compare with the same month last year.
5.  **Cache Set**: Stores the expensive result in memory for 5 minutes.
6.  **Return**: Returns a rich object with the series and summary totals.

## Data Flow: "Creating an Incident"

1.  **Frontend**: User submits form. `api-client.ts` POSTs to `/api/incidents`.
2.  **Controller**: `incidentsController.ts` receives request.
3.  **Service**: `incidentsService.ts` validates data.
4.  **Repository**: `incidentsRepository.ts`
    *   **Lookup Resolution**: Converts "FIRE" (string) -> `type_id` (int).
    *   **Geometry Creation**: `ST_SetSRID(ST_Point(lon, lat), 4326)`.
    *   **Insert**: SQL `INSERT INTO incidents ...`.
5.  **Database**: PostGIS stores the point. Triggers update `updated_at`.
6.  **Return Path**: The full object (with joined names) is returned.

## Database Deep Dive

**Schema Analysis (`server/db/migrations/202510010001_initial_schema.js`):**

*   **Core Table: `incidents`**
    *   `id`: BigInt Primary Key.
    *   `location`: `geometry(Point, 4326)`. **Critical**: Uses SRID 4326 (WGS 84 - Lat/Lon).
    *   **Foreign Keys**: `type_id`, `severity_id`, `status_id`. These normalize the data, ensuring data quality (no free-text "Fire" vs "fire").
    *   **JSONB**: `metadata`. Allows storing flexible, unstructured data (e.g., "Commander Name", "Specific Apparatus Used") without changing the schema.
    *   **Constraints**:
        *   `chk_incident_temporal`: Database-level enforcement of time logic. Even if the Service layer fails, the DB will reject impossible timelines.

*   **Indexes (Performance)**:
    *   `idx_incidents_location`: **GIST Index**. Essential for "Map View" queries (`ST_Within`). Without this, map loading would scan the whole table (O(N)). With it, it's Logarithmic (O(log N)).
    *   `idx_incidents_occurrence_at`: B-Tree Index. Essential for "Dashboard Timeline" filtering.
    *   `idx_incidents_geohash`: Text Index. Used for clustering/heatmap optimizations.

*   **Complex Queries (Knex)**:
    *   **Hotspots (`getIncidentHotspotAggregates`)**:
        *   Uses `ST_MakeEnvelope` to create a dynamic grid.
        *   Uses `GROUP BY` on calculated grid cells (`floor(x/size)`, `floor(y/size)`).
        *   This creates a server-side heatmap, sending only aggregated squares to the frontend (Massive performance gain over sending 10k points).
