# Infrastructure

Automation scripts, IaC blueprints, and platform provisioning assets. Use the subdirectories to organize container tooling, Terraform modules, and future deployment orchestration.

## Docker Compose Stack

The local development stack lives at the repository root in `docker-compose.yml` and bootstraps:

- `db` – PostGIS 15 instance with persistent storage mounted to the `db_data` volume
- `backend` – Node.js/TypeScript API container mounting the `server/` workspace
- `frontend` – React/Vite development container mounting the `client/` workspace
- `pgadmin` – Optional management UI (behind the `dev-tools` profile)

### Environment Configuration

1. Copy the provided examples under `infra/docker/` and customize secrets as needed:
	- `.env.postgis.example` → `.env.postgis`
	- `.env.backend.example` → `.env.backend`
	- `.env.frontend.example` → `.env.frontend`
	- `.env.pgadmin.example` → `.env.pgadmin` (optional)
2. Create a root `.env` (based on `.env.example`) to point Compose at your customized files, e.g.:

	```env
	BACKEND_ENV_FILE=infra/docker/.env.backend
	FRONTEND_ENV_FILE=infra/docker/.env.frontend
	POSTGIS_ENV_FILE=infra/docker/.env.postgis
	PGADMIN_ENV_FILE=infra/docker/.env.pgadmin
	```

Without overrides, Compose falls back to the `*.example` files so containers stay up even before service code exists.

### Helper Commands

The root `Makefile` offers shortcuts for common workflows:

- `make compose-up` – Build and start the stack in the background
- `make compose-down` – Tear down and remove the named volumes
- `make compose-logs` – Tail combined service logs
- `make db-shell` – Open a psql shell inside the PostGIS container
- `make db-seed` – Run the backend seeding script via the backend container (script expected in future tasks)

### Smoke Testing

After configuring environment files, validate the stack:

```bash
make compose-config
make compose-up
make logs-tail
make compose-down
```

Record any unusual behavior or improvements in upcoming infrastructure docs under `docs/operations/`.
