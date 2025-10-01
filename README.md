# Geospatial Incident Platform

[![CI](https://github.com/OWNER/REPOSITORY/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPOSITORY/actions/workflows/ci.yml)

The Geospatial Incident Platform is a monorepo that unifies backend services, frontend applications, documentation, and infrastructure automation for tracking and responding to geospatial incidents.

## Repository Structure

| Path       | Description                                                                           |
| ---------- | ------------------------------------------------------------------------------------- |
| `server/`  | Node.js/TypeScript backend services, shared APIs, and supporting tests/configuration. |
| `client/`  | React-based frontend applications, shared UI libraries, and test suites.              |
| `docs/`    | Architecture, API, and operational documentation references.                          |
| `infra/`   | Infrastructure-as-code definitions, deployment tooling, and container orchestrations. |
| `.vscode/` | Workspace settings aligned with TypeScript + Prettier conventions.                    |

## Getting Started

1. Install the recommended VS Code extensions for TypeScript and Prettier formatting.
2. Familiarize yourself with the directory-specific README files for contribution expectations.
3. Backend and frontend packages will be bootstrapped in subsequent tasks – follow the forthcoming setup guides under `docs/`.

## Local Development Stack

Docker Compose definitions live at the repository root and spin up PostGIS, backend, frontend, and pgAdmin containers for local parity. To try it out:

1. Copy `.env.example` to `.env` and adjust the environment file paths if you duplicate any of the templates in `infra/docker/`.
2. Copy each `infra/docker/.env.*.example` to a matching `.env.*` file and update secrets/tokens.
3. Run `make compose-up` (or `docker compose up --build`) to start the stack, then visit:
   - PostGIS: `localhost:5432`
   - Backend placeholder: `localhost:4000`
   - Frontend placeholder: `localhost:5173`
   - pgAdmin (optional profile): `localhost:5050`

Use `make compose-down` to stop and clean up when finished.

## Quality Automation

Install dependencies at the repository root to enable linting, formatting, and testing automation:

```
npm install
```

Pre-commit hooks are managed by Husky. After running `npm install`, Husky automatically installs the hooks; if you need to reinstall manually, run `npm run prepare`. The `pre-commit` hook formats staged files via `lint-staged`, then runs `npm run lint` and `npm run test` to guard against regressions before commits land.

See `docs/operations/ci.md` for CI pipeline details, troubleshooting tips, and guidance on replacing `OWNER/REPOSITORY` in the badge URL with your GitHub namespace.

## Upcoming Documentation

- [ ] Backend service bootstrap guide (`docs/operations/backend-setup.md`)
- [ ] Frontend workspace setup (`docs/operations/frontend-setup.md`)
- [ ] Infrastructure deployment runbooks (`docs/operations/`)

Stay tuned for deeper architecture decisions under `docs/architecture/` and API references within `docs/api/` as the platform evolves.
