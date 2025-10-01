# Continuous Integration

The `CI` GitHub Actions workflow ensures every push and pull request targeting `main` passes core quality gates before landing.

## Workflow overview

- **Location:** `.github/workflows/ci.yml`
- **Triggers:** `push` and `pull_request` events against `main`
- **Runtime:** Ubuntu runner with Node.js 20
- **Steps:**
  - Check out the repository and configure Node.js with npm caching.
  - Restore cached `node_modules` directories to speed up dependency installs.
  - Run a single `npm install`, which cascades into `client/` and `server/` installs via the root `postinstall` script.
  - Execute `npm run lint` followed by `npm test`.
  - Validate the Docker Compose stack with `docker compose config`.
  - Upload collected `test-output.log` artifacts when any lint/test command fails.

## Status badge

Replace `OWNER/REPOSITORY` with your GitHub namespace to activate the README badge:

```
[![CI](https://github.com/OWNER/REPOSITORY/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPOSITORY/actions/workflows/ci.yml)
```

## Running checks locally

Install dependencies at the repository root and execute the same commands the workflow runs:

```
npm install
npm run lint
npm test
npm run format
```

To validate the Compose configuration locally:

```
docker compose config
```

## Troubleshooting

- **Dependency cache misses:** Ensure `package-lock.json`, `client/package-lock.json`, and `server/package-lock.json` are committed so the cache key remains stable.
- **Hook failures:** Husky hooks run locally during `git commit`. Use `HUSKY=0` to bypass only in emergency scenarios, then re-run the failing command to investigate.
- **Docker compose validation errors:** Run `docker compose config` locally to reproduce and inspect any template issues or missing environment files.
- **Test log artifact:** On CI failures, download the `test-output` artifact from the workflow summary for the captured Jest/Vitest logs.
