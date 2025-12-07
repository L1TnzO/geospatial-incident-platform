# Tech Stack and Dependency Analysis

## 1. Backend (Node.js/Express)

### Core Framework: Express.js (v5.x)
*   **Why used?**: Express is the industry standard for Node.js APIs. Version 5 is used here (beta/release candidate), indicating a forward-looking choice to leverage improved Promise handling in middleware (async/await support without wrapper functions).
*   **Role**: Handles routing (`/api/incidents`), middleware integration (`cors`, `express.json`), and the request-response lifecycle.
*   **Alternatives rejected**: NestJS (too opinionated/heavy for this scope), Fastify (Express ecosystem is larger).

### Data Access: Knex.js (v3.x)
*   **Why used?**: Knex provides a sweet spot between a raw SQL driver (`pg`) and a heavy ORM (`TypeORM` / `Prisma`).
    *   **Migrations**: Crucial for a team environment. The `migrations/` folder tracks schema changes over time.
    *   **Query Building**: Allows dynamic query construction (e.g., "Add WHERE clause only if filter is present") which is messy with raw SQL.
    *   **PostGIS Support**: Knex allows inserting raw SQL snippets (`knex.raw('ST_Within(...)')`), which is essential for geospatial queries that ORMs often struggle with.
*   **Role**: Database abstraction, migration runner, and seed runner.

### Database Driver: pg (node-postgres)
*   **Why used?**: The native PostgreSQL driver. It is the fastest and most stable driver for Node.js.
*   **Role**: Low-level TCP connection to the Postgres container. Used internally by Knex.

### Testing: Jest & ts-jest
*   **Why used?**: Jest is an all-in-one test runner (Runner + Assertion Lib + Mocking Lib). `ts-jest` allows running TypeScript tests without a separate build step.
*   **Specifics**:
    *   **Mocking**: Used extensively in `server/tests/unit` to mock the Repository layer when testing Services.
    *   **Environment**: The `test:db` script sets `NODE_ENV=test`, likely triggering a separate DB config to avoid wiping development data.

## 2. Frontend (React/Vite)

### Build Tool: Vite (v6.x)
*   **Why used?**: Webpack is slow. Vite uses native ES Modules in the browser during dev, providing instant startup (500ms vs 10s) and HMR (Hot Module Replacement).
*   **Role**: Bundling, dev server, and proxying API requests (`vite.config.ts`).

### UI Framework: React (v18.x)
*   **Why used?**: The declarative model is perfect for complex UIs like Dashboards where state (filters, selection) changes frequently.
*   **Concurrency**: React 18 features (automatic batching) help performance when many state updates happen simultaneously (e.g., WebSocket updates).

### State Management: Zustand
*   **Why used?**:
    *   **Simplicity**: Redux requires Actions, Reducers, Selectors, and Context providers. Zustand requires one hook `useStore`.
    *   **Transient Updates**: Zustand allows subscribing to state changes *outside* of the React render cycle. This is critical for the Map, where we might want to fly to a coordinate without re-rendering the entire App tree.
*   **Role**: Manages `incident-filters-store.ts` (Global search params) and `incident-detail-store.ts` (UI state).

### Data Fetching: @tanstack/react-query (v5)
*   **The "Secret Weapon"**: This library replaces hundreds of lines of `useEffect` and `useState` boilerplate.
*   **Key Features Used**:
    *   **Caching**: `staleTime` is set (e.g., 5 mins), meaning if the user navigates away and back, data loads instantly from RAM.
    *   **Deduplication**: If 3 components ask for "User Profile", only 1 network request is made.
    *   **Background Refetch**: Keeps the dashboard live without manual refreshes.

### Geospatial Visualization: Leaflet & React-Leaflet
*   **Why used?**:
    *   **Lightweight**: Much smaller bundle size than Mapbox GL JS or Google Maps SDK.
    *   **Cost**: Free (Open Source).
    *   **Compatibility**: Works perfectly with standard GeoJSON, which PostGIS outputs natively.
*   **Role**: Renders the tile layers (OSM) and markers. `IncidentClusterLayer.tsx` bridges React state to Leaflet's imperative API.

### Web Workers (Native)
*   **File**: `client/src/workers/incident-worker.ts`
*   **Role**: Off-main-thread processing.
*   **Why?**: Clustering 50,000 points takes ~200ms. If done on the main thread, the UI freezes for 200ms (jank). In a Worker, the UI remains responsive (60fps) while the math happens in parallel.

## 3. Database (PostgreSQL + PostGIS)

### PostgreSQL (v15)
*   **Role**: Primary persistent store. ACID compliant (essential for "Emergency" data where data loss is unacceptable).

### PostGIS Extension
*   **The differentiator**: This isn't just a database; it's a GIS engine.
*   **Key capabilities used**:
    *   `GEOMETRY` types: Storing points/polygons efficiently (binary format, not text).
    *   `GIST` Indexes: R-Tree indexing allows finding "Points in this Rectangle" in logarithmic time O(log n).
    *   `ST_ClusterDBSCAN` (Potential): Can perform density-based clustering on the DB side for analytics.

## 4. Quality & Tooling

### ESLint & Prettier
*   **Config**: `eslint.config.mjs` (Flat Config format - the modern standard).
*   **Role**: Enforces code style and catches bugs (e.g., "Unused variable", "Missing dependency in useEffect").
*   **Husky**: Pre-commit hooks ensure bad code cannot be committed.

### Playwright
*   **Role**: End-to-End testing. It spins up a real headless browser (Chromium), logs in, clicks the map, and verifies the sidebar opens. This catches integration bugs that Unit Tests miss.
