# Design Patterns and Code Style

## Pattern Detection

### 1. Repository Pattern (Backend)
*   **File:** `server/src/db/repositories/incidentsRepository.ts`
*   **Purpose:** Decouples the business logic (Service) from the data access logic (SQL/Knex). The Service asks for "an incident"; the Repository handles the complexity of "SELECT * FROM incidents JOIN types ...".
*   **Evidence:** The class `IncidentRepository` encapsulates methods like `listIncidents`, `createIncident`, and `findIncidentSummary`.

### 2. Service Layer Pattern (Backend)
*   **File:** `server/src/services/incidentsService.ts`
*   **Purpose:** Encapsulates business rules and orchestrates the flow. It doesn't know about SQL, and it doesn't know about HTTP. It deals with domain objects and validation.
*   **Evidence:** `IncidentService` contains methods that validate inputs (dates, logical order of timestamps) before calling the repository.

### 3. Singleton Pattern (Inferred)
*   **File:** `server/src/services/incidentsService.ts` (Line: `export const incidentService = new IncidentService();`)
*   **Purpose:** Ensures only one instance of the service exists efficiently.
*   **Evidence:** The file exports a pre-instantiated instance of the class, which is then imported by controllers.

### 4. Controller Pattern (Backend)
*   **File:** `server/src/controllers/incidentsController.ts`
*   **Purpose:** Handles the HTTP layer (Express `req`/`res`). It parses parameters, calls the Service, and formats the HTTP response (status codes, JSON).

### 5. Hook Pattern (Frontend)
*   **File:** `client/src/hooks/useIncidentsData.ts`
*   **Purpose:** Encapsulates data fetching logic and state synchronization.
*   **Evidence:** `useIncidentsTableData` uses `useQuery` from React Query to manage the lifecycle of incident data fetching, exposing a simple API to components.

### 6. Store Pattern (Frontend)
*   **File:** `client/src/store/incident-filters-store.ts`
*   **Purpose:** Centralized state management for application-wide data (filters).
*   **Evidence:** Uses `zustand`'s `create` method to define a store with actions (`setFilters`, `reset`).

## Style and Conventions

### Code Quality
*   **Modularity:** The code is highly modular. Business logic is strictly separated from data access and HTTP handling.
*   **Function Size:** Most functions are focused and of reasonable size.
    *   *Exception:* `IncidentRepository.listIncidents` is quite long because it handles complex dynamic query building (filtering, sorting, joining) and mapping results. This is acceptable for a repository method handling search.
*   **Naming:** Variable names are descriptive (`incidentNumber`, `occurrenceAt`, `isTerminal`). Boolean flags are prefixed correctly (`isActive`, `hasPrevious`).
*   **Type Safety:** TypeScript is used extensively. Interfaces (e.g., `IncidentDetail`, `CreateIncidentRequest`) are defined to ensure contract safety between layers.
*   **Validation:** Validation is "Fail Fast" and explicit. The `IncidentService` manually validates every field rather than relying solely on database constraints or implicit casting, which is a robust practice.
*   **Logging:** There is a custom logger usage (`serviceLog`, `repoLog`) rather than raw `console.log` scatter, helping with debugging specific scopes.
