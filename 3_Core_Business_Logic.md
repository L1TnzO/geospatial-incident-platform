# Anatomy of the "Core" (Critical Business Logic)

## 1. Star Function Deep Dive: `IncidentService.createIncident`

**Location**: `server/src/services/incidentsService.ts`

This function represents the "Write" side of the core domain. It is responsible for the integrity of the most important entity: the Incident.

### Pseudocode & Logic Breakdown

```typescript
async createIncident(payload: CreateIncidentRequest): Promise<IncidentDetail> {
  // 1. Data Sanitization & Parsing
  // - Strings are trimmed.
  // - Dates are parsed from ISO-8601 strings to JS Date objects.
  // - Geo-coordinates are cast to numbers.
  // - "Active" status is inferred if not provided (Default: True).

  // 2. Structural Validation
  // - Check Regex: Incident Number must be alphanumeric (e.g., "INC-2023-001").
  // - Check Range: Lat (-90 to 90), Lon (-180 to 180).
  // - Check Logical: Casualty count cannot be negative.

  // 3. Temporal Logic Validation (The "Time Travel" Check)
  // - If ReportedAt < OccurrenceAt -> THROW "Cannot report before it happens"
  // - If DispatchAt < ReportedAt -> THROW "Cannot dispatch before reporting"
  // - If ArrivalAt < DispatchAt -> THROW "Cannot arrive before leaving"
  // - If ResolvedAt < ArrivalAt -> THROW "Cannot resolve before arriving"

  // 4. Persistence (Repository Call)
  // - Calls repository.createIncident(cleanInput).
  // - This runs inside a Database Transaction (implied by Knex usage).

  // 5. Error Handling
  // - Catches Postgres Error 23505 (Unique Constraint Violation).
  // - Translates it to a semantic `HttpError.conflict("Incident already exists")`.
  // - Catches Foreign Key errors (e.g., Invalid Station ID) and throws 400 Bad Request.

  // 6. Cache Invalidation
  // - Calls this.clearCaches().
  // - This ensures that the "Dashboard Statistics" (cached in memory) are wiped,
  //   so the next dashboard load includes this new incident.

  return newIncident;
}
```

**Why this matters**: This function acts as the **Anti-Corruption Layer**. By strictly validating inputs here, we guarantee that the database never contains "Time Travel" paradoxes or invalid coordinates. The Frontend can be buggy, but the Service ensures the Data is clean.

## 2. Star Function Deep Dive: `StrategicAnalyticsService.getMonthlyTrend`

**Location**: `server/src/services/strategicService.ts`

This function powers the executive dashboard. It transforms raw rows into business intelligence.

### Logic Breakdown

1.  **Input Parsing**: Determines the time window (e.g., `months=12`).
2.  **Caching**: Generates a cache key based on the filter hash (e.g., `strategic:monthly:{type:FIRE, region:NORTH}`).
    *   If key exists in `this.cache` and is not expired (5 min TTL), return immediately.
3.  **Data Fetching**:
    *   Calculates the date range. **Crucially**, it fetches *extra* history (previous year) to calculate "Year-over-Year" (YoY) growth, even if the user only asked for "Current Year".
    *   Executes `repository.getIncidentCountsByReportedMonth` (GROUP BY month).
4.  **Time Series Generation (The "Gap Filling" Algorithm)**:
    *   The DB only returns months *with data*. (e.g., Jan: 10, Mar: 5).
    *   The Service iterates through *every requested month*.
    *   If a month is missing in the DB result, it injects a record with `count: 0`.
    *   **Reason**: Charts need continuous axes. You can't skip February just because there were no fires.
5.  **Derived Metrics Calculation**:
    *   For each month `M`:
        *   `MoM %` = `(Count(M) - Count(M-1)) / Count(M-1)`
        *   `YoY %` = `(Count(M) - Count(M-12)) / Count(M-12)`
6.  **Return**: A complex object containing the Series (for the chart) and Summary Totals (for the KPI cards).

## 3. Database Deep Dive

The database schema is the foundation of the architecture.

### Key Tables & Relationships

*   `incidents` (The Fact Table)
    *   **Primary Key**: `id` (BigSerial). Used for internal joins.
    *   **Natural Key**: `incident_number` (Unique String). Used for API lookups.
    *   **Foreign Keys**:
        *   `type_id` -> `incident_types` (Enforced categorization).
        *   `severity_id` -> `incident_severities` (Enforced priority).
        *   `primary_station_id` -> `stations` (Nullable, enforcing referential integrity to physical infra).
    *   **Columns**:
        *   `location` (`geometry(Point, 4326)`): The PostGIS geometry.
        *   `metadata` (`jsonb`): Allows schema-less extension (e.g., "Commander Name", "Specific Apparatus"). This is a "Hybrid SQL/NoSQL" approach.

*   `stations` (The Dimension Table)
    *   Represents physical assets.
    *   Has `location` (Geometry) and `response_zone_id`.

*   `incident_daily_metrics` (The Aggregate Table)
    *   **Purpose**: Performance.
    *   **Content**: Pre-calculated sums of incidents by day/type.
    *   **Usage**: The Dashboard reads from this instead of counting millions of rows in `incidents` every time.

### Indexing Strategy (Performance)

1.  **GIST Index (`idx_incidents_location`)**:
    *   **Type**: Generalized Search Tree.
    *   **Use Case**: Spatial queries like `ST_Within(location, ?)` and `ST_DWithin`.
    *   **Benefit**: Makes map queries `O(log N)` instead of `O(N)`. Without this, map panning would be unusable at scale.

2.  **B-Tree Index (`idx_incidents_occurrence_at`)**:
    *   **Use Case**: Range filtering (`WHERE occurrence_at BETWEEN ? AND ?`).
    *   **Benefit**: Essential for the Dashboard time-slider.

3.  **Unique Constraints**:
    *   `incident_number` must be unique. This prevents duplicate data entry from race conditions or double-clicks in the UI.

### Constraints & Integrity

*   **Check Constraints**:
    *   `chk_incident_temporal`: The DB *also* enforces the time-travel logic (`occurrence <= reported`). This is "Defense in Depth". Even if a developer bypasses the Service layer (e.g., manual SQL insert), the DB rejects invalid data.
    *   `casualty_count >= 0`: Prevents negative integers.

## 4. Data Flow: The Lifecycle of an Incident

1.  **Creation (Frontend -> Backend)**:
    *   User fills form. React validates fields locally.
    *   `POST /incidents` with JSON body.
2.  **Ingestion (Backend Service)**:
    *   `IncidentService` validates rules.
    *   Resolves "Codes" (Strings) to "IDs" (Integers) using Lookup Tables.
3.  **Storage (Database)**:
    *   Row inserted. `created_at` timestamp set automatically.
    *   PostGIS indexes updated.
4.  **Propagation (React Query)**:
    *   Frontend receives success response.
    *   Invalidates `['incidents', 'list']` query key.
    *   Triggers a background refetch of the Incident List.
5.  **Visualization (Map)**:
    *   New list arrives.
    *   Passed to Web Worker.
    *   Worker adds new point to Supercluster index.
    *   Map re-renders with the new pin visible.
