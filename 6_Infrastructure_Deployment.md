# Infrastructure and Deployment

## Environment Configuration

*   **Docker Compose**: The source of truth (`docker-compose.yml`).
    *   **Orchestration**: Defines the relationship between `backend` (depends_on `db`), `frontend`, and `db`.
    *   **Networking**: Uses an internal bridge network `internal`.
    *   **Persistence**: Volumes `db_data` ensure data survives container restarts.

*   **Makefile**: The Operations Manual.
    *   **Automation**: Encapsulates complex Docker commands into simple verbs.
    *   **Key Commands**:
        *   `make compose-up`: Spawns the stack.
        *   `make db-reset`: Nukes and rebuilds the DB (Migrate Down -> Up -> Seed). Critical for dev iteration.
        *   `make data-generate`: Uses a Python script (`tools/data_generator`) to populate the DB with realistic dummy data. This is huge for testing performance ("What happens with 10k incidents?").
        *   `make frontend-fix-vps`: A "hotfix" script to patch the frontend config with the server's public IP, useful for quick demos.

## Deployment Strategy (Inferred)

1.  **Containerization**: The app is fully containerized (`node:20-alpine`). Deployment is likely "Ship the Container".
2.  **Environment Variables**:
    *   **Production**: Secrets (DB passwords) are injected via `.env` files (referenced in `docker-compose.yml`).
    *   **Configuration**: `VITE_API_BASE_URL` allows the frontend build to point to different backends (staging vs prod).
3.  **Data Lifecycle**:
    *   **Migrations**: Run on startup (via `npm run migrate:up`).
    *   **Seeding**: Manual or initial run (`npm run db:seed`).

## Deployment Instructions (Detailed)

1.  **Provision Server**: Ubuntu 22.04 LTS (2 CPU, 4GB RAM minimum for PostGIS).
2.  **Install Engine**: `apt install docker.io docker-compose-v2 make`.
3.  **Clone Source**: `git clone ...`.
4.  **Configure Secrets**:
    *   `cp infra/docker/.env.backend.example infra/docker/.env.backend`
    *   `vim infra/docker/.env.backend` -> Set `POSTGRES_PASSWORD`.
5.  **Build & Launch**:
    *   `make compose-up`
    *   *Wait for build to complete (approx 5 mins).*
6.  **Initialize Data**:
    *   `make db-init` (Runs migrations).
    *   *(Optional)* `make db-load-data` (Loads bulk geospatial data).
7.  **Verify**:
    *   `make db-api-check` (Curls the health endpoint).
    *   Visit `http://<IP>:3000`.
