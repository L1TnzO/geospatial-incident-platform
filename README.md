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

## Quickstart

| Goal                     | Command             | Reference                                                               |
| ------------------------ | ------------------- | ----------------------------------------------------------------------- |
| Install all dependencies | `npm install`       | [Setup Guide](./docs/setup.md)                                          |
| Run repository-wide lint | `npm run lint`      | [Frontend docs](./client/README.md), [Backend docs](./server/README.md) |
| Execute all tests        | `npm test`          | [Contributing Guide](./docs/contributing.md)                            |
| Bring up Docker stack    | `make compose-up`   | [Setup Guide](./docs/setup.md)                                          |
| Tear down Docker stack   | `make compose-down` | [Setup Guide](./docs/setup.md)                                          |
| Understand data model    | —                   | [Data Model Guide](./docs/data-model/README.md)                         |

Need the full onboarding sequence, environment templates, or editor setup tips? Start with [`docs/setup.md`](./docs/setup.md) for a step-by-step walkthrough.

## Contributor Workflow

- Review the [Contributing Guide](./docs/contributing.md) for branching strategy, commit conventions, and CI expectations.
- Learn the schema and pipelines via the [Data Model Guide](./docs/data-model/README.md).
- Package-level details live in [`server/README.md`](./server/README.md) and [`client/README.md`](./client/README.md).
- Check `docs/operations/ci.md` for an overview of the CI pipeline and troubleshooting steps.

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

The root `npm install` step bootstraps dependencies for the backend and frontend workspaces. Husky + lint-staged wire pre-commit checks automatically; rerun `npm run prepare` if the hooks ever go missing. See [`docs/contributing.md`](./docs/contributing.md) for the full checklist before opening a pull request.

## Upcoming Documentation

- [ ] Backend service bootstrap guide (`docs/operations/backend-setup.md`)
- [ ] Frontend workspace setup (`docs/operations/frontend-setup.md`)
- [ ] Infrastructure deployment runbooks (`docs/operations/`)

Stay tuned for deeper architecture decisions under `docs/architecture/` and API references within `docs/api/` as the platform evolves.
