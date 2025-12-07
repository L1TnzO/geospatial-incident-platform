# Infrastructure and Deployment

## Environment Configuration

*   **Docker:** The project uses `docker-compose.yml` to define the entire stack.
    *   **Services:**
        *   `db`: `postgis/postgis:15-3.4` (PostgreSQL with geospatial extensions).
        *   `backend`: `node:20-alpine` (Custom build context `server/`).
        *   `frontend`: `node:20-alpine` (Custom build context `client/`).
        *   `pgadmin`: `dpage/pgadmin4:latest` (Database management UI).
*   **Environment Variables:**
    *   Managed via `.env` files. The project relies on `.env.example` templates in `infra/docker/` (e.g., `.env.backend.example`, `.env.postgis.example`).
*   **CI/CD:** `GitHub Actions` is present (implied by `.github` folder in file list and badge in README).

## Inferred Deployment Instructions (Spin up from scratch)

To deploy this project on a fresh server (e.g., an Ubuntu VM):

1.  **Prerequisites:**
    *   Install **Docker** and **Docker Compose**.
    *   Install **Git**.

2.  **Clone Repository:**
    ```bash
    git clone https://github.com/OWNER/REPOSITORY.git
    cd geospatial-incident-platform
    ```

3.  **Environment Setup:**
    *   The project requires several `.env` files.
    *   Copy the example templates:
        ```bash
        cp infra/docker/.env.backend.example infra/docker/.env.backend
        cp infra/docker/.env.frontend.example infra/docker/.env.frontend
        cp infra/docker/.env.postgis.example infra/docker/.env.postgis
        cp infra/docker/.env.pgadmin.example infra/docker/.env.pgadmin
        ```
    *   *Critical:* Edit these files to set secure passwords and keys for production.

4.  **Launch via Make (or Docker Compose):**
    *   The project includes a `Makefile` for convenience.
    *   Run: `make compose-up`
    *   *Alternative:* `docker compose up -d --build`

5.  **Database Initialization:**
    *   The `backend` service is configured to run migrations automatically on startup?
    *   *Verification:* Looking at `server/package.json`, there are scripts like `migrate:latest`. The `docker-compose` command for backend is `npm install && npm run dev`. In a production dockerfile (not fully visible but inferred), the entrypoint would likely run `npm run migrate:latest` before starting the server.
    *   *Manual Fallback:* `docker compose exec backend npm run migrate:latest` followed by `npm run db:seed`.

6.  **Access:**
    *   Frontend: `http://<server-ip>:3000`
    *   Backend API: `http://<server-ip>:4000`
    *   PostAdmin: `http://<server-ip>:5050`
