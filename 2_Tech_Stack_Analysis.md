# Tech Stack and Dependency Analysis

## Critical Dependencies List

### Backend (Node.js)
1.  **express**: The web framework. Justification: "De facto" standard for Node.js, mature middleware ecosystem (Cors, BodyParser).
2.  **knex**: Query Builder. Justification:
    *   **Migrations**: Provides a robust CLI for schema versioning (essential for team environments).
    *   **Safety**: Prevents SQL Injection via parameter binding.
    *   **Abstraction**: Allows writing complex PostGIS queries (`ST_Intersects`, `ST_Buffer`) cleanly mixed with JS logic.
3.  **pg**: PostgreSQL driver. Justification: High-performance native driver required by Knex.
4.  **postgis (Database Extension)**: *The most critical technology.* Justification:
    *   Allows storing native `Geometry` types.
    *   Enables spatial indexing (GIST).
    *   Performs complex spatial math (Buffers, Intersections, Distance) inside the DB engine, which is orders of magnitude faster than doing it in Node.js.
5.  **jest / ts-jest**: Testing. Justification: Fast, supports TypeScript out of the box, great mocking capabilities (used heavily in `incidentsService.test.ts`).

### Frontend (React)
1.  **react / react-dom (v18)**: UI Library. Justification: Component-based model suits the complex Dashboard/Map UI.
2.  **vite**: Build Tool. Justification: Replaces Webpack. Extremely fast HMR (Hot Module Replacement) improves developer velocity.
3.  **zustand**: State Management. Justification:
    *   Used in `store/incident-filters-store.ts`.
    *   Much simpler boilerplate than Redux.
    *   Supports "Transient updates" (subscribing to state changes without re-rendering), which is useful for Map interactions.
4.  **@tanstack/react-query (v5)**: Data Fetching. Justification:
    *   **Caching**: Automatically caches API responses (e.g., `StrategicService` results).
    *   **Deduping**: Prevents multiple components from requesting the same data.
    *   **Loading/Error States**: Simplifies UI logic significantly.
5.  **leaflet / react-leaflet**: Maps. Justification:
    *   Lightweight alternative to Mapbox/Google Maps.
    *   Open Source (no API key billing risks for basic usage).
    *   Works well with standard GeoJSON data returned by the backend.
6.  **playwright**: E2E Testing. Justification: Reliable browser automation for testing the full "Create Incident -> View on Map" flow.
7.  **shadcn/ui (Radix UI + Tailwind)**: Component Library. Justification: Inferred from `components/ui` folder structure. Provides accessible, unstyled primitives (Radix) styled with utility classes (Tailwind), offering better control than Material UI.

## Inferred Justification & Insights

*   **TypeScript Everywhere**: Both client and server use TypeScript (`tsconfig.json`). This ensures Type Safety across the network boundary (Shared types are likely used or mirrored).
*   **Geospatial First**: The choice of `PostGIS` + `Leaflet` + `Knex` indicates the primary complexity is **Spatial**. The system is designed to handle "Where is the fire?" and "Which station is closest?" efficiently.
*   **Performance Optimization**:
    *   **React Query**: Caching expensive dashboard analytics calls (`StrategicService` logic).
    *   **Vite**: Fast local dev loop.
    *   **PostGIS Indexes**: Implicit usage for spatial queries.
