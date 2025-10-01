# Setup Guide

Kickstart your local Geospatial Incident Platform environment with the steps below. This guide covers system prerequisites, repository bootstrapping, and the quickest path to running the stack locally.

## Prerequisites

| Requirement         | Version / Notes                  | Why it matters                                    |
| ------------------- | -------------------------------- | ------------------------------------------------- |
| Git                 | Latest stable                    | Repository cloning and source control             |
| Node.js             | 20.x LTS (npm 10+ ships with it) | Required for root, backend, and frontend packages |
| Docker Engine       | 24+ with Compose plugin          | Runs the full stack via `docker compose`          |
| Make (GNU make)     | 4.x+                             | Convenience wrapper for Compose commands          |
| Optional: nvm / fnm | Supports Node version switching  | Keeps Node aligned with the project version       |

> **Windows users:** Install via WSL2 + Ubuntu (or a similar distro) to access GNU make and Docker. Ensure Docker Desktop exposes the Linux backend to WSL.

## Repository Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/<your-org>/geospatial-incident-platform.git
   cd geospatial-incident-platform
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
   The root `postinstall` step automatically installs dependencies within `client/` and `server/`.
3. **Create environment files**
   - Copy `.env.example` to `.env` at the repository root.
   - Duplicate each template in `infra/docker/` (e.g., `.env.backend.example`) to a matching `.env.*` file and customize secrets.
   - For package-level `.env` files (such as `server/.env.example` or `client/.env`), copy to `.env` if you override defaults locally.
4. **Verify tooling**
   ```bash
   node --version  # Expect v20.x
   npm --version   # Expect v10.x
   docker compose version
   ```

## Quickstart Commands

| Goal                         | Command                                           |
| ---------------------------- | ------------------------------------------------- |
| Format & lint everything     | `npm run format` (check) / `npm run format:write` |
| Run repository-wide lint     | `npm run lint`                                    |
| Execute all tests            | `npm test`                                        |
| Start full stack with Docker | `make compose-up`                                 |
| View Compose logs            | `make compose-logs`                               |
| Stop and clean up containers | `make compose-down`                               |

## Docker Workflow

The root `docker-compose.yml` encapsulates PostGIS, backend, frontend, and pgAdmin services. The `Makefile` wraps common Compose actions, so `make compose-up` is the fastest path to a running stack. If you prefer vanilla Compose commands:

```bash
docker compose up --build
```

All services mount the local checked-out code. Rebuild containers or re-run `make compose-up` after changing dependencies. Remember to keep `.env` files in sync with the templates under `infra/docker/`.

## Local Development

- **Backend:** See `server/README.md` for package scripts (`npm run dev`, `npm run lint`, `npm test`) and environment expectations.
- **Frontend:** See `client/README.md` for Vite commands (`npm run dev`, `npm run build`, `npm run lint`, `npm test`).
- **Automation:** Husky installs pre-commit hooks on `npm install`. If hooks seem missing, re-run `npm run prepare`.

## Next Steps

- Review [`docs/contributing.md`](./contributing.md) for branching, review, and commit standards.
- Dive into operations runbooks under [`docs/operations/`](./operations/README.md) for CI and deployment details.
- Explore architecture and API references within [`docs/architecture/`](./architecture/) and [`docs/api/`](./api/).
