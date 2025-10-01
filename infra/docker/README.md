# Docker Tooling

Container definitions, compose files, and image build artifacts for local development and testing environments belong here.

Environment templates for the development stack live in this directory:

- `.env.backend.example`
- `.env.frontend.example`
- `.env.postgis.example`
- `.env.pgadmin.example`

Copy these to matching `.env.*` files and update secrets before running `docker compose up` from the repository root. Each service mounts the project source directories so local code changes instantly reflect in the running containers.
