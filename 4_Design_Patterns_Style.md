# Design Patterns and Code Style

## 1. Architectural Patterns

### The Repository Pattern
*   **Definition**: A layer that mediates between the domain and data mapping layers using a collection-like interface for accessing domain objects.
*   **Implementation**: `server/src/db/repositories/incidentsRepository.ts`.
*   **Why here?**: It decouples the `IncidentService` from `Knex`. If we wanted to switch from Postgres to MongoDB (unlikely, but possible) or TypeORM, we would only rewrite the Repository, not the Service logic.
*   **Code Example**:
    ```typescript
    // Service doesn't know about SQL
    const incidents = await this.repository.listIncidents(filters);
    ```

### The Service Layer Pattern
*   **Definition**: Defines an application's boundary with a layer of services that establishes a set of available operations and coordinates the application's response in each operation.
*   **Implementation**: `server/src/services/incidentsService.ts`.
*   **Why here?**: It encapsulates the "Business Rules". Validation, Caching, and Authorization checks belong here, not in the Controller (which is just for HTTP) or the Repository (which is just for SQL).

### The Singleton Pattern
*   **Definition**: Ensure a class has only one instance and provide a global point of access to it.
*   **Implementation**:
    ```typescript
    // server/src/services/incidentsService.ts
    export const incidentService = new IncidentService();
    ```
*   **Why here?**: Node.js modules are cached, so exporting an instance effectively creates a Singleton. This is efficient as we don't need to instantiate the Service class for every request. It allows the Service to hold stateful caches (`this.metadataCache`).

## 2. Design Patterns (GoF & Modern)

### The Strategy Pattern (Implicit)
*   **Context**: `StrategicService.getResponseMetrics` needs to group data differently based on user input.
*   **Implementation**: The code switches behavior based on `groupBy` ('station' | 'grid' | 'zone'). While implemented as `if/else` blocks inside one method, conceptually it selects a different "Aggregation Strategy" (SQL Grouping) at runtime.

### The Provider Pattern (React)
*   **Context**: Sharing Authentication state across the component tree.
*   **Implementation**: `client/src/providers/auth-provider.tsx`.
*   **Mechanism**: Uses `React.createContext`. Components use `useAuth()` to consume the context without "Prop Drilling" (passing `user` down 10 levels of components).

### The Hook Pattern (React)
*   **Context**: Reusing stateful logic.
*   **Implementation**: `client/src/hooks/useIncidentsData.ts`.
*   **Mechanism**: Encapsulates `react-query` configuration, key generation, and data transformation into a single function. The component (`MapView`) doesn't know *how* data is fetched, only *that* it is fetched.

### The Web Worker Pattern (Concurrency)
*   **Context**: Heavy computation blocking the UI.
*   **Implementation**: `client/src/workers/incident-worker.ts`.
*   **Mechanism**: Uses the Actor Model (Message Passing). The Main Thread sends a message (`SET_DATA`), the Worker computes, and sends a message back (`CLUSTERS_CALCULATED`). This allows parallel execution in a single-threaded language (JS).

## 3. Code Style & Quality Assurance

### Strict Typing (TypeScript)
*   **Philosophy**: "If it's not typed, it doesn't exist."
*   **Evidence**:
    *   **DTOs**: `CreateIncidentRequest` defines exactly what the API accepts.
    *   **Domain Objects**: `IncidentDetail` defines exactly what the Service returns.
    *   **Generics**: `PaginatedResult<T>` ensures pagination logic is reusable for Incidents, Stations, etc.

### "Fail Fast" Validation
*   **Philosophy**: Catch errors as close to the source as possible.
*   **Evidence**: `incidentsService.ts` checks `if (!incidentNumber)` immediately. It doesn't wait for the DB to throw a "Not Null Constraint" error. This provides better error messages to the user ("Incident Number is required" vs "Internal Server Error").

### Clean Code Principles
*   **Single Responsibility Principle (SRP)**:
    *   `incidentsController`: HTTP only.
    *   `incidentsService`: Logic only.
    *   `incidentsRepository`: SQL only.
*   **DRY (Don't Repeat Yourself)**:
    *   Shared logic for "Pagination Meta" calculation is extracted to `buildPaginationMeta`.
    *   Shared UI components (`Button`, `Card`) are in `client/src/components/ui`.

### Linting & Formatting
*   **Tooling**: `eslint` + `prettier`.
*   **Configuration**: The project uses the new `eslint.config.mjs` (Flat Config), showing adherence to modern standards.
*   **Impact**: Ensures consistent indentation, no unused variables, and safe hook dependencies, reducing "Bike-shedding" in code reviews.
