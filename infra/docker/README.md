# Docker Tooling

Container definitions, compose files, and image build artifacts for local development and testing environments belong here.

Environment templates for the development stack live in this directory:

- `.env.backend.example`
- `.env.frontend.example`
- `.env.postgis.example`
- `.env.pgadmin.example`

Copy these to matching `.env.*` files and update secrets before running `docker compose up` from the repository root. Each service mounts the project source directories so local code changes instantly reflect in the running containers.

> **Tip:** Override the exposed PostGIS port by exporting `POSTGIS_HOST_PORT` (defaults to `5432`). Example: `POSTGIS_HOST_PORT=5555 docker compose up db` to avoid conflicts with an existing local Postgres instance.
