# FireSight UI

This package hosts the modernized FireSight frontend. The visual layer remains identical to the current mock build while reinstating the production infrastructure from the legacy React app (routing, shared state, API utilities, and quality tooling).

## Getting Started

```bash
npm install
npm run dev
```

The dev server runs on <http://localhost:5173>. Demo credentials are `admin/admin` (admin) and `viewer/viewer`.

## Project Structure

- `src/providers/` – shared providers including `auth-provider` and `query-client-provider`.
- `src/store/` – Zustand stores for map view state, map preferences, incident filters, and incident detail cache (persists to localStorage with the legacy keys `gip::incidentTableFilters::v1` and `gip::incidentDetailCache::v1`).
- `src/lib/http.ts` – fetch wrapper with base URL normalization, auth header hooks, timeout + cancellation handling, and error normalization.
- `src/services/` – API client surface areas and React Query keys for downstream features.
- `src/setupTests.ts`, `vitest.config.ts`, `playwright.config.ts` – automated testing configuration.

## Tooling & Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite in dev mode. |
| `npm run build` | Build the production bundle. |
| `npm run lint` | Run ESLint across the codebase. |
| `npm run format` | Apply Prettier formatting. |
| `npm run test` | Execute unit/integration tests with Vitest. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run test:integration` | Single-run integration suite scaffold. |
| `npm run test:e2e` | Playwright end-to-end tests (requires server running). |
| `npm run test:e2e:headed` | Playwright in headed mode. |

Husky + lint-staged enforce linting and formatting on staged files.

## Environment

Environment variables are read via Vite: set `VITE_API_BASE_URL` for the backend origin and `VITE_API_TIMEOUT_MS` to override the default 15s client timeout.

## Next Steps

- Wire the React Query hooks and stores into the feature pages (Tasks 7.3–7.6).
- Port legacy tests into Vitest/Playwright suites to cover reinstated behaviors.
