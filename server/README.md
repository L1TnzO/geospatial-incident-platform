# Backend Service

This package contains the Express + TypeScript backend for the Geospatial Incident Platform. It exposes a `/healthz` route for readiness checks and is scaffolded for containerized development via Docker Compose.

## Project Structure

- `src/` – TypeScript source code
  - `config/` – environment and configuration helpers
  - `routes/` – HTTP routing modules (`/healthz` already implemented)
  - `middleware/` – shared Express middleware placeholders
- `tests/` – Jest test suites (Supertest-powered integration tests)
- `config/` – environment examples (`.env.example`) and future configuration files

> **First time here?** Follow the root [`docs/setup.md`](../docs/setup.md) guide for repository-wide prerequisites before diving into the backend service specifics below.

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+ (ships with Node 20)

### Install Dependencies

```bash
npm install
```

### Environment Configuration

The service reads environment variables from:

1. `.env` or `.env.<NODE_ENV>` in this directory (create your own as needed)
2. `config/.env.local` or `config/.env.example`
3. Repository-level `infra/docker/.env.backend` (used by Compose)

At minimum, ensure `PORT` is defined (defaults to `4000` if omitted).

### Development Server

```bash
npm run dev
```

This starts `ts-node-dev` with hot reloading. Visit [http://localhost:4000/healthz](http://localhost:4000/healthz) to verify the JSON health payload.

### Linting & Formatting

```bash
npm run lint
```

ESLint (flat config) is pre-wired with TypeScript and Prettier compatibility.

### Testing

```bash
npm test
```

Jest with Supertest validates the `/healthz` route metadata.

### Build & Production Start

```bash
npm run build
npm start
```

The build step compiles TypeScript into `dist/`, and `npm start` runs the compiled server.

## Docker Compose Integration

From the repository root you can bring up the full stack (PostGIS + backend + optional frontend):

```bash
make compose-up
```

The Compose definition mounts this directory into the `backend` service container, installs dependencies automatically, and executes `npm run dev`. Update environment files under `infra/docker/` to customize container settings.

Need contribution standards or CI expectations? See [`docs/contributing.md`](../docs/contributing.md).
