# Tech Stack and Dependency Analysis

## Critical Dependencies List

### Backend (Node.js)
1.  **express**: The web server framework used to handle HTTP requests, routing, and middleware. It is the backbone of the backend application.
2.  **knex**: A SQL query builder used for interacting with the PostgreSQL database. It handles migrations, seeding, and building complex queries without writing raw SQL for every operation.
3.  **pg**: The PostgreSQL client for Node.js. It is the underlying driver that `knex` uses to connect to the database.
4.  **postgis** (Extension): While not a Node package, this is a critical dependency in the database layer (via `docker-compose.yml` and migrations), enabling geospatial queries (e.g., "find incidents within 5km").
5.  **jest**: The testing framework used for unit and integration testing of the backend services.

### Frontend (React)
1.  **react / react-dom**: The library for building the user interface. It uses a component-based architecture.
2.  **vite**: The build tool and development server. It provides fast hot module replacement (HMR) and optimized builds.
3.  **zustand**: A small, fast, and scalable bearbones state-management solution. It is used for managing global client state (e.g., filters, map preferences, selected incident).
4.  **@tanstack/react-query**: Handles data fetching, caching, synchronizing and updating server state in the React application. It replaces the need for complex useEffects for data loading.
5.  **leaflet / react-leaflet**: The library used for rendering interactive maps. It is critical for the geospatial aspect of the platform.
6.  **playwright**: Used for End-to-End (E2E) testing to verify the application flows from a user perspective.

## Inferred Justification

*   **Why Express?** Standard, mature choice for Node.js REST APIs. The team likely needs a robust routing system and middleware ecosystem (e.g., for `cors`, error handling).
*   **Why Knex + PostgreSQL + PostGIS?** The project is heavily "Geospatial" (Incidents, Stations, Zones). PostGIS is the industry standard for open-source geospatial data. `knex` provides a structured way to manage schema changes (migrations) and build queries programmatically, which is safer and cleaner than raw SQL strings.
*   **Why Zustand?** Complex global state is found in `store/incident-filters-store.ts` and `store/incident-detail-store.ts`. Zustand is often chosen over Redux for being less boilerplate-heavy while still providing a flux-like state model.
*   **Why React Query?** The application relies heavily on server data (incidents lists, stats). React Query handles the caching, refetching, and loading states automatically, simplifying the `services/` layer significantly.
*   **Why Leaflet?** It is a lightweight, open-source mapping library that integrates well with React (via `react-leaflet`) and handles standard tile layers (like OSM) efficiently without the cost of Google Maps.
