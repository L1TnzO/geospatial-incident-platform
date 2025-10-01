# Geospatial Incident Platform Frontend

Vite + React + TypeScript client that powers the Geospatial Incident Platform UI. The initial scaffold includes routing, global state via Zustand, Leaflet map integration, and a testing setup with Vitest and React Testing Library.

> **New contributor?** Review the repository-wide [`docs/setup.md`](../docs/setup.md) first, then return here for frontend-specific workflows.

## Prerequisites

- Node.js 20+
- npm (ships with Node.js)

## Install dependencies

```bash
npm install
```

## Available scripts

```bash
npm run dev        # Start Vite dev server on http://localhost:5173
npm run build      # Type-check and create production build
npm run preview    # Preview the production build locally
npm run lint       # Run ESLint checks
npm test           # Execute Vitest test suite once
npm run test:watch # Run Vitest in watch mode
```

## Frontend features

- React Router with a shell layout (`src/layouts/AppLayout.tsx`) and dashboard route
- Zustand store (`src/store/useMapStore.ts`) for map view state
- Leaflet map placeholder component (`src/components/MapView.tsx`) configured with OpenStreetMap tiles and icon assets
- Responsive layout styling via global CSS (no utility framework for now)
- Vitest + React Testing Library smoke test (`src/App.test.tsx`)

## Docker Compose integration

The root `docker-compose.yml` defines a `frontend` service that mounts this directory and exposes port `5173`. After installing dependencies locally, running `docker compose up frontend` will start the Vite dev server inside the container using the same scripts described above.

Environment variables can be configured through the shared `.env.example` (copied to `.env`) and `.env.frontend.example` files at the repository root. Vite automatically loads `.env.local`/`.env` prefixed with `VITE_`.

See [`docs/contributing.md`](../docs/contributing.md) for commit conventions, linting expectations, and CI requirements before opening a pull request.

## Map placeholder roadmap

The current map renders a centered OpenStreetMap view focused on New York City. Future work will include:

- Connecting to the backend health/data endpoints
- Rendering incident markers with dynamic layers
- Adding filter controls and legend components

Refer to `src/components/MapView.tsx` and `src/store/useMapStore.ts` for the starting point of these enhancements.
