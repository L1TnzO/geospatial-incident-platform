# Design Patterns and Code Style

## Pattern Detection

### 1. Repository Pattern (Data Access Abstraction)
*   **File:** `server/src/db/repositories/incidentsRepository.ts`
*   **Context:** The application separates *Data Access* from *Business Logic*.
*   **Implementation:** The `IncidentRepository` class wraps Knex queries. It returns domain objects (`IncidentListItem`), not raw DB rows.
*   **Benefit:** Allows swapping the DB implementation (theoretical) or mocking the DB easily in unit tests (`incidentsService.test.ts` mocks the repo, not Knex).

### 2. Service Layer Pattern (Domain Logic Encapsulation)
*   **File:** `server/src/services/incidentsService.ts`
*   **Context:** Core business rules reside here.
*   **Implementation:** Functions like `createIncident` handle validation, cache invalidation, and orchestrate the flow.
*   **Benefit:** Keeps Controllers "Skinny" (only HTTP concerns) and Repositories "Dumb" (only SQL concerns).

### 3. Singleton Pattern (Service Instantiation)
*   **File:** `server/src/services/incidentsService.ts`
*   **Implementation:** `export const incidentService = new IncidentService();`
*   **Benefit:** Ensures efficient memory usage. The stateful service (containing the `metadataCache`) is shared across all requests.

### 4. Strategy Pattern (Inferred in StrategicService)
*   **File:** `server/src/services/strategicService.ts`
*   **Context:** `getResponseMetrics` handles `station`, `grid`, and `zone` grouping.
*   **Implementation:** The code uses conditional logic (if `groupBy === 'station'`) to execute different aggregation strategies (SQL queries) while returning a consistent Interface.
*   **Refinement:** While implemented with `if/else`, it conceptually follows the Strategy pattern of swapping algorithms based on runtime context.

### 5. Provider Pattern (Frontend State)
*   **File:** `client/src/providers/auth-provider.tsx` (Inferred from usage in `App.tsx`)
*   **Context:** Authentication state must be available globally.
*   **Implementation:** React Context API wraps the app. Components consume `useAuth()` to access `user` state without prop drilling.

### 6. Custom Hook Pattern (Frontend Logic)
*   **File:** `client/src/hooks/useIncidentsData.ts`
*   **Context:** Fetching data involves state (loading, error, data).
*   **Implementation:** Wraps `react-query` logic. Components call `const { incidents, isLoading } = useIncidentsData()`.
*   **Benefit:** Decouples UI components from the specific data-fetching library (React Query).

## Style and Conventions

*   **Code Quality**: High.
    *   **Strict Typing**: Interfaces are used for everything (`CreateIncidentRequest`, `IncidentDetail`).
    *   **Fail Fast**: Validation occurs immediately at the Service entry point.
    *   **Explicit Returns**: Functions declare return types explicitly (`: Promise<IncidentDetail>`).
*   **Modularization**:
    *   **Backend**: Distinct folders for `controllers`, `services`, `repositories`, `types`.
    *   **Frontend**: `components/` are likely atomic. `hooks/` separate logic from view.
*   **Consistency**:
    *   **Naming**: `camelCase` for variables/functions, `PascalCase` for Classes/Components.
    *   **Async/Await**: Used consistently over `.then()` chains.
    *   **Logging**: Uses a custom scoped logger (e.g., `serviceLog`, `repoLog`) instead of generic `console.log`, aiding debugging in a busy server logs.
