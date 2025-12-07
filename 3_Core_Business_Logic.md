# Anatomy of the "Core" (Critical Business Logic)

## Star Functions/Classes

### 1. `IncidentService.createIncident`
**Location:** `server/src/services/incidentsService.ts`

This is the heart of the system, responsible for ingesting new emergency incidents. It acts as the gatekeeper, ensuring data integrity before persistence.

**Line-by-Line Explanation (Pseudocode):**
1.  **Input Parsing**: The function accepts a raw payload (`CreateIncidentRequest`). It rigorously parses and validates every field:
    *   `incidentNumber` must match a specific pattern (letters, digits, separators).
    *   Dates (`occurrenceAt`, `reportedAt`, etc.) are parsed to ISO-8601.
    *   Strings are trimmed; numbers are checked for non-negativity.
    *   Geospatial coordinates (`latitude`, `longitude`) are validated for range.
2.  **Logical Validation**: It enforces temporal logic rules:
    *   `reportedAt` cannot be before `occurrenceAt`.
    *   `dispatchAt` cannot be before `reportedAt`.
    *   `arrivalAt` cannot be before `dispatchAt`.
    *   `resolvedAt` cannot be before `arrivalAt`.
3.  **Status Derivation**: If the user didn't explicitly set `isActive`, it derives it: if the status is `RESOLVED` or `CANCELLED`, `isActive` becomes `false`.
4.  **Persistence Call**: It constructs a clean `CreateIncidentInput` object and calls `repository.createIncident`.
5.  **Error Handling**: It catches errors. If it's a "Unique Violation" (code 23505), it throws a 409 Conflict (Incident exists). If it's a lookup error (e.g., invalid Station Code), it throws a 400 Bad Request.

### 2. `IncidentRepository.createIncident`
**Location:** `server/src/db/repositories/incidentsRepository.ts`

This class handles the raw database interaction, including transaction management and foreign key resolution.

**Line-by-Line Explanation (Pseudocode):**
1.  **Transaction Start**: It begins a database transaction to ensure atomicity.
2.  **Reference Resolution**: It calls `resolveIncidentReferences`. This helper looks up the integer `ID`s for text codes provided in the API (e.g., converts `FIRE_STRUCTURE` to ID `5`). If a required code (Type, Severity, Status) is missing, it throws an error. Optional codes (Source, Weather, Station) return `null` if missing.
3.  **Insert with Geospatial Magic**: It executes the SQL `INSERT`.
    *   Critically, it converts the lat/lon into a PostGIS geometry: `ST_SetSRID(ST_Point(?, ?), 4326)`. This enables future spatial queries.
    *   `metadata` is cast to JSONB.
4.  **Return & Fetch**: It returns the new ID. Then, it immediately calls `getIncidentDetail` to fetch the fully populated object (joining types, severities, etc.) to return to the client.

## Data Flow: "Creating an Incident"

**Scenario:** A dispatcher enters a new fire incident via the Frontend.

1.  **Frontend Entry (`CreateIncidentPage`)**: The user fills out the form. The component validates inputs locally.
2.  **Service Call (`client/src/services/api-client.ts`)**: The frontend calls `apiClient.incidents.create(payload)`. This sends a `POST /incidents` request.
3.  **Backend Route (`server/src/routes/incidents.ts` -> `server/src/controllers/incidentsController.ts`)**: The Express router receives the request and directs it to the controller.
4.  **Service Processing (`server/src/services/incidentsService.ts`)**: The `IncidentService` receives the request body. It validates dates, checks logical constraints (arrival > dispatch), and sanitizes strings.
5.  **Repository Logic (`server/src/db/repositories/incidentsRepository.ts`)**:
    *   The repository resolves the "codes" (e.g., "HIGH", "OPEN") to their database primary keys (IDs) by querying lookup tables (`incident_severities`, `incident_statuses`).
    *   It creates a PostGIS point from the coordinates.
    *   It inserts the record into the `incidents` table.
6.  **Database Storage (`PostgreSQL`)**: The data is committed. Triggers automatically update the `updated_at` timestamp.
7.  **Response**: The full incident object is returned up the chain (Repo -> Service -> Controller -> Frontend).
8.  **Frontend Update**: The React Query cache is invalidated or updated, causing the **Map** and **Table** to refresh and show the new incident immediately.

## Database Deep Dive

The database is a relational PostgreSQL instance heavily utilizing **PostGIS**.

*   **Key Tables**:
    *   `incidents`: The central fact table. Contains `location` (Geometry), foreign keys to lookups, and timestamps.
    *   `stations`: Represents fire/police stations. Also has `location` (Geometry) and `response_zone_id`.
    *   `response_zones`: Defines polygon boundaries for service areas (`MultiPolygon`).
*   **Data Integrity**:
    *   **Foreign Keys**: Strict relationships enforce validity (e.g., an incident must have a valid `type_id`).
    *   **Check Constraints**:
        *   `chk_incident_temporal`: Ensures time travel isn't possible (e.g., occurrence <= reported).
        *   `incidents_casualty_non_negative`: Prevents negative casualty counts.
*   **Geospatial Indexing**: `GIST` indexes are applied to `incidents.location` and `stations.location`, making spatial queries (like "find incidents in this viewport") extremely fast.
