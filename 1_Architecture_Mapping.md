# Architecture Mapping and File Structure

## 1. Directory Tree Analysis

The repository is structured as a **Monorepo**, separating the system into two distinct deployable units (`client` and `server`) while sharing configuration and tooling at the root.

### Root Directory
*   `Makefile`: The central automation hub. Encapsulates complex Docker commands (`docker compose up`) and database operations (`db-reset`) into simple verbs. This acts as the "executable documentation" for the project's operational lifecycle.
*   `docker-compose.yml`: Defines the local development runtime. It orchestrates four services:
    *   `db`: PostgreSQL 15 with PostGIS extensions.
    *   `backend`: The Node.js API server.
    *   `frontend`: The React development server (Vite).
    *   `pgadmin`: A web-based GUI for database inspection.
*   `package.json`: The root dependency manifest. It manages workspace-wide scripts (e.g., `npm run test` which triggers tests in both sub-packages) and shared dev dependencies like `eslint` and `prettier`.
*   `.github/`: Contains CI/CD workflows (GitHub Actions) for automated testing and linting on pull requests.

### Client Directory (`client/`)
This folder contains the Single Page Application (SPA).
*   `src/`: The source code.
    *   `main.tsx`: The entry point. It boots React and mounts the application to the DOM.
    *   `App.tsx`: The root component. It handles Routing (`react-router-dom`), global Providers (Auth, React Query), and the main layout shell.
    *   `components/`: Reusable UI elements.
        *   `ui/`: A comprehensive library of "dumb" components (Button, Card, Dialog) implementing the **Shadcn UI** design system (Radix UI primitives + Tailwind CSS). This isolates design token implementation from business logic.
        *   `map/`: Specialized geospatial components. `IncidentClusterLayer.tsx` and `MapView.tsx` reside here, encapsulating the complexity of Leaflet integration.
    *   `pages/`: "Smart" components representing full views (`DashboardPage`, `StrategicPage`). These act as controllers, fetching data via hooks and passing it to presentation components.
    *   `services/`: The Data Access Layer. `api-client.ts` serves as a typed HTTP client (Singleton) ensuring all network requests follow a consistent pattern (headers, error handling).
    *   `store/`: Global State Management. Uses **Zustand**.
        *   `incident-filters-store.ts`: manages search criteria (dates, types), decoupling the Filter Panel from the Map View.
        *   `incident-detail-store.ts`: manages the "Selected Incident" state, coordinating the Popup and Sidebar details.
    *   `hooks/`: Custom React Hooks. `useIncidentsData.ts` is the most critical, wrapping `react-query` to handle data fetching, caching, and background synchronization.
    *   `workers/`: **Web Workers**. `incident-worker.ts` offloads heavy clustering calculations from the main thread, a key performance optimization.
*   `vite.config.ts`: Configuration for the Vite bundler. Sets up path aliases (`@/`) and proxy rules for redirecting API requests during development.

### Server Directory (`server/`)
This folder contains the RESTful API service.
*   `src/`: The source code.
    *   `index.ts`: The entry point. Initializes the HTTP server and starts listening on the configured port.
    *   `app.ts`: The Express Application Factory. Wires up global middleware (CORS, Body Parser, Error Handler) and mounts the routes.
    *   `controllers/`: The Interface Adapters. They receive `req/res`, parse inputs, call the Service Layer, and return HTTP responses.
        *   `incidentsController.ts`: Handles CRUD operations for incidents.
        *   `strategicController.ts`: Exposes read-only analytical endpoints.
    *   `services/`: The Application Business Logic.
        *   `incidentsService.ts`: Validates rules (e.g., "Dispatch time cannot be before Report time") and orchestrates transactional flows.
        *   `strategicService.ts`: Performs complex aggregations and statistical analysis.
    *   `db/`: Database logic.
        *   `repositories/`: The Data Access Layer. `incidentsRepository.ts` contains raw Knex/SQL queries, isolating the database schema from the rest of the application.
        *   `migrations/`: Schema version control. Defines the table structure (`incidents`, `stations`) and PostGIS extensions.
        *   `seeds/`: Initial data population scripts.

## 2. Layer Identification & Architecture Style

The system follows a **Layered Architecture** (N-Tier) tailored for a Node.js context.

1.  **Presentation Layer (Frontend)**:
    *   **Responsibility**: Rendering UI, capturing user input, managing session state.
    *   **Technologies**: React, Tailwind, Leaflet.
    *   **Communication**: Talk to the Backend via HTTP (REST).

2.  **Interface Layer (Backend Controllers)**:
    *   **Responsibility**: Decoupling the HTTP protocol from the domain logic. It handles status codes (200 vs 400), parsing JSON bodies, and formatting error messages.
    *   **Key Characteristic**: "Skinny Controllers". They contain almost no logic other than validation and delegation.

3.  **Service Layer (Backend Services)**:
    *   **Responsibility**: The "Brain" of the application. It enforces business rules (validations, state transitions).
    *   **Key Characteristic**: Framework-Agnostic. `IncidentService` throws generic Errors, not HTTP errors (mostly). It doesn't know about `req` or `res`.

4.  **Data Access Layer (Repositories)**:
    *   **Responsibility**: Translating Domain Objects into SQL queries.
    *   **Key Characteristic**: The only layer that knows about `knex` or the database schema.

5.  **Persistence Layer (Database)**:
    *   **Technologies**: PostgreSQL + PostGIS.
    *   **Responsibility**: Data storage, referential integrity (Foreign Keys), and high-performance spatial indexing.

## 3. Data Flow Diagram (Textual)

**Scenario: User filters for "Fire" incidents in "Downtown".**

1.  **User Action**: Clicks "Fire" filter button in the Frontend Sidebar.
2.  **State Update**: `incident-filters-store.ts` updates `typeCodes: ['FIRE']`.
3.  **Effect Trigger**: `useIncidentsData` hook detects state change.
4.  **Network Request**: `api-client` sends `GET /incidents?typeCodes=FIRE`.
5.  **Controller Entry**: `incidentsController.ts` receives request.
6.  **Service Call**: `incidentsService.listIncidents(options)` is called.
7.  **Repository Query**: `incidentsRepository.ts` constructs the SQL:
    ```sql
    SELECT * FROM incidents
    JOIN incident_types ON ...
    WHERE type_code = 'FIRE'
    ```
8.  **Database Execution**: Postgres uses `idx_incidents_type` index to find rows efficiently.
9.  **Return Path**: Rows -> Repository -> Service -> Controller (JSON Serialization) -> HTTP Response.
10. **Frontend Reception**: React Query caches the result.
11. **Worker Handoff**: The new data is sent to `incident-worker.ts`.
12. **Clustering**: The worker re-calculates clusters based on the new filtered set.
13. **Render**: The worker sends clusters back to `IncidentClusterLayer.tsx`, which renders Markers on the Map.

This architecture ensures separation of concerns: the Database handles the raw search, the Backend handles the API contract, and the Frontend handles the visualization logic (clustering) to keep the UI responsive.
