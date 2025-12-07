# Infrastructure and Deployment

## 1. Local Development Environment

The local stack is managed via `docker-compose.yml`, simulating a production-like environment on the developer's machine.

### Service Decomposition
1.  **`db` (PostGIS)**:
    *   **Image**: `postgis/postgis:15-3.4`.
    *   **Volumes**: `db_data` (Persistent storage) and `./data` (ReadOnly mount for bulk loading scripts).
    *   **Healthcheck**: `pg_isready`. This is critical. The backend depends on `service_healthy`, ensuring the API doesn't crash on startup because the DB isn't ready.
2.  **`backend` (Node API)**:
    *   **Image**: `node:20-alpine`.
    *   **Build**: Custom build from `./server`.
    *   **Dev Mode**: Mounts `./server` to `/workspace` and runs `npm run dev` (likely `ts-node-dev`). This enables **Hot Reloading** for backend code.
3.  **`frontend` (Vite Server)**:
    *   **Image**: `node:20-alpine`.
    *   **Networking**: Exposes port `3000`.
    *   **Dev Mode**: Mounts `./client` and runs `vite`.
4.  **`pgadmin`**:
    *   **Purpose**: Database administration.
    *   **Profile**: `dev-tools`. This means it doesn't run by default unless explicitly requested (`docker compose --profile dev-tools up`), saving resources.

### The `Makefile` Automation Layer
The `Makefile` abstracts the complexity of Docker CLI commands.

*   `make compose-up`: `docker compose up --build -d`.
*   `make db-reset`: A destructive action useful for iterative dev. It runs `migrate:rollback`, `migrate:latest`, and `db:seed`.
*   `make data-generate`:
    *   Spins up a **Python** container.
    *   Runs a script to generate thousands of mock incidents.
    *   **Benefit**: Allows developers to test performance ("What happens with 50k markers?") without manually clicking 50k times.

## 2. Deployment Strategy (Production)

### Containerization Strategy
The project is "Cloud Native" ready. Deployment involves building immutable artifacts (Docker Images) and shipping them to a registry (ECR/Docker Hub).

**Dockerfile Optimization (Inferred Recommendations)**:
1.  **Multi-Stage Build**:
    *   **Stage 1 (Builder)**: Install `devDependencies`, run `tsc` (TypeScript Compile), build frontend assets.
    *   **Stage 2 (Runner)**: Copy only `dist/` and `production dependencies`.
    *   **Benefit**: Reduces image size from ~1GB (node_modules is heavy) to ~100MB.
2.  **User Permissions**:
    *   Run as `USER node` instead of `root` for security.

### Orchestration Options

**Option A: Docker Swarm / Compose on VPS (Simple)**
*   **Good for**: Small deployments (single server).
*   **Mechanism**: `git pull` -> `docker compose up -d`.
*   **Pros**: Simple, matches dev env.
*   **Cons**: No auto-scaling, downtime during updates.

**Option B: Kubernetes (Scalable)**
*   **Manifests Needed**:
    *   `Deployment` (Backend): Replicas=3.
    *   `Service`: Internal Load Balancer.
    *   `Ingress`: Nginx Ingress Controller for SSL termination.
    *   `StatefulSet`: PostGIS (or use RDS).
*   **Pros**: Zero-downtime rolling updates, auto-scaling based on CPU/RAM.

## 3. Database Management

### Migrations
*   **Tool**: Knex Migrations.
*   **Lifecycle**: Migrations should run as an **Init Container** in Kubernetes or a pre-deploy step in CI/CD.
    *   **Why?**: If the app starts before the DB schema is updated, queries will fail.

### Backup & Disaster Recovery (DR)
*   **Strategy**: `pg_dump` runs nightly.
*   **Storage**: S3 Bucket (encrypted).
*   **RPO (Recovery Point Objective)**: 24 hours (with nightly backups). Can be improved to minutes with WAL archiving (Point-in-Time Recovery).

## 4. CI/CD Pipeline Suggestion (GitHub Actions)

**Trigger**: Push to `main`.

1.  **Test Stage**:
    *   Run `npm run lint`.
    *   Run `npm run test` (Unit).
2.  **Build Stage**:
    *   Build Docker Images (`backend:SHA`, `frontend:SHA`).
    *   Push to Registry.
3.  **Deploy Stage**:
    *   Update K8s manifest with new image tag.
    *   `kubectl apply -f k8s/`.

## 5. Security in Infrastructure

*   **Secrets Management**:
    *   **Dev**: `.env` files.
    *   **Prod**: AWS Secrets Manager or HashiCorp Vault. Never commit `.env` files (checked via `.gitignore`).
*   **Network Isolation**:
    *   The `db` container is on the `internal` network. It is **not** exposed to the host (unless `ports` is defined in compose). In Prod, the DB should be in a private subnet, accessible only by the Backend.
