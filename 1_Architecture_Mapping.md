# Architecture Mapping and File Structure

## Commented Directory Tree

```
/
├── client/                     # Frontend Application (React + Vite + TypeScript)
│   ├── src/
│   │   ├── components/         # Reusable UI components (Modular architecture)
│   │   │   ├── ui/             # ShadcnUI generic components (Button, Input, etc.)
│   │   │   └── ...             # Feature-specific components (IncidentDetailModal, MapView)
│   │   ├── hooks/              # Custom React hooks (Encapsulates logic)
│   │   │   ├── useAuth.ts      # Auth state abstraction
│   │   │   ├── useIncidentsData.ts # React Query wrappers for Incident data
│   │   │   └── ...
│   │   ├── pages/              # Route-level components (Page Controller)
│   │   ├── services/           # API layer (Separated from Components)
│   │   │   ├── api-client.ts   # Axios/Fetch instance & type-safe request methods
│   │   │   └── strategic-service.ts # Complex analytics data fetching
│   │   ├── store/              # Global state management (Zustand)
│   │   │   ├── incident-filters-store.ts # Global search/filter state
│   │   │   └── incident-detail-store.ts  # Modal/Selection state
│   │   ├── utils/              # Pure functions (Formatters, Validators)
│   │   ├── App.tsx             # Main Router & Provider Composition
│   │   └── main.tsx            # Entry Point (DOM Rendering)
│   ├── tests/                  # Frontend Testing
│   │   └── e2e/                # Playwright End-to-End tests
├── server/                     # Backend Application (Node.js + Express + TypeScript)
│   ├── db/                     # Database Layer
│   │   ├── migrations/         # Knex Schema Definitions (Version Control for DB)
│   │   ├── repositories/       # Data Access Objects (SQL Abstraction Layer)
│   │   └── seeds/              # Initial Data Population
│   ├── src/
│   │   ├── config/             # Environment & App Configuration
│   │   │   ├── env.ts          # Type-safe Env Var parsing
│   │   │   └── pagination.ts   # Shared constants
│   │   ├── controllers/        # HTTP Interface Layer (Req/Res handling)
│   │   ├── middleware/         # Cross-Cutting Concerns (Auth, Error Handling)
│   │   │   ├── errorHandler.ts # Centralized Error Response logic
│   │   │   └── ...
│   │   ├── routes/             # API Endpoint Definitions
│   │   ├── services/           # Business Logic Layer (The "Core")
│   │   │   ├── incidentsService.ts # Incident lifecycle management
│   │   │   ├── strategicService.ts # Complex Analytical Calculations
│   │   │   └── ...
│   │   ├── app.ts              # Express App Configuration (Middleware wiring)
│   │   └── index.ts            # Server Entry Point (Port listening)
│   └── tests/                  # Backend Testing (Jest)
│       ├── unit/               # Service isolation tests
│       └── db/                 # Integration tests with real DB
├── infra/                      # Infrastructure as Code
│   └── docker/                 # Environment Templates (.env.example)
├── tools/                      # Dev Tools
│   └── data_generator/         # Python script for generating bulk mock data
├── docker-compose.yml          # Container Orchestration (Local Dev)
├── Makefile                    # Task Automation (Shortcuts for complex commands)
└── README.md                   # Project Documentation
```

## Layer Identification

The application implements a strict **N-Tier Layered Architecture** within a **Monorepo**.

*   **Frontend (Presentation Layer)**: `client/`
    *   **View**: `pages/` and `components/` handle rendering.
    *   **ViewModel/State**: `store/` (Zustand) and `hooks/` bridge the UI and Logic.
    *   **Data Source**: `services/` abstracts the HTTP communication.
*   **Backend (Application Layers)**: `server/`
    *   **Controller Layer**: `controllers/` - Accepts HTTP requests, validates inputs, calls Services.
    *   **Service Layer**: `services/` - Contains the "Domain Logic". It is framework-agnostic (doesn't know about Express/HTTP). It handles complex rules (e.g., `StrategicAnalyticsService` calculation logic).
    *   **Data Access Layer (Repository)**: `repositories/` - Isolates SQL logic. Uses `knex` to talk to Postgres.
*   **Data Layer**:
    *   **PostgreSQL**: Relational storage.
    *   **PostGIS**: Spatial engine (Geometry types, Spatial Indexes).
    *   **Schema Management**: `knex migrate` ensures schema versioning.

## Entry Points

*   **Frontend**: `client/src/main.tsx`
    *   Mounts the React tree into `#root`.
    *   Initializes Global Styles (`index.css`).
*   **Backend**: `server/src/index.ts`
    *   Loads Environment Variables (`config/env`).
    *   Imports the Express App from `app.ts`.
    *   Starts the `http.Server`.
