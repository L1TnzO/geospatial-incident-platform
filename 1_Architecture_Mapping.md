# Architecture Mapping and File Structure

## Commented Directory Tree

```
/
├── client/                     # Frontend Application (React + Vite)
│   ├── src/
│   │   ├── components/         # Reusable UI components (e.g., IncidentDetailModal, MapView)
│   │   ├── hooks/              # Custom React hooks (e.g., useAuth, useIncidentsData)
│   │   ├── pages/              # Route-level components (e.g., DashboardPage, StrategicPage)
│   │   ├── services/           # API clients and data fetching logic (e.g., api-client.ts)
│   │   ├── store/              # Global state management using Zustand (e.g., incident-detail-store.ts)
│   │   ├── utils/              # Helper functions (e.g., formatters, validators)
│   │   ├── App.tsx             # Main application component and routing configuration
│   │   └── main.tsx            # Application entry point mounting the React root
├── server/                     # Backend Application (Node.js + Express)
│   ├── db/                     # Database handling
│   │   ├── migrations/         # Knex migration files defining DB schema
│   │   └── repositories/       # Data Access Object (DAO) layer interacting with the DB
│   ├── src/
│   │   ├── config/             # Configuration files (env variables, pagination settings)
│   │   ├── controllers/        # Request handlers (Input validation -> Call Service -> Send Response)
│   │   ├── middleware/         # Express middleware (Error handling, Auth, Logging)
│   │   ├── routes/             # API route definitions
│   │   ├── services/           # Business logic layer (Core application rules)
│   │   ├── app.ts              # Express application setup
│   │   └── index.ts            # Server entry point (starts HTTP server)
├── infra/                      # Infrastructure and Deployment configuration
│   └── docker/                 # Docker environment variable templates
├── docker-compose.yml          # Container orchestration for local development
└── README.md                   # Project documentation
```

## Layer Identification

The application follows a **Monorepo** structure separating Frontend and Backend, with the Backend following a **Layered Architecture** (Controller-Service-Repository).

*   **Frontend**: `client/`
    *   **Presentation Layer**: `components/`, `pages/`
    *   **State Management**: `store/` (Zustand)
    *   **Data Access**: `services/` (Axios/Fetch wrappers)
*   **Backend**: `server/`
    *   **Interface Layer (Controllers)**: `server/src/controllers/` (Handles HTTP requests)
    *   **Business Logic Layer (Services)**: `server/src/services/` (Contains core business rules)
    *   **Data Access Layer (Repositories)**: `server/db/repositories/` (Direct database interactions using Knex)
    *   **Database**: PostgreSQL with PostGIS extension (defined in `docker-compose.yml` and managed via `server/db/migrations/`).
*   **External Services**: None explicitly visible in the core logic scan (no Stripe, Twilio, etc.), but `leaflet` is used on the frontend for map rendering (OpenStreetMap).

## Entry Points

*   **Frontend**: `client/src/main.tsx`
    *   This file bootstraps the React application, renders the `App` component into the DOM, and imports global styles.
*   **Backend**: `server/src/index.ts`
    *   This file imports the configured Express app from `app.ts`, starts the HTTP server, and listens on the configured port.
