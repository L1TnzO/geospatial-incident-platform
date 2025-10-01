# Contributing Guide

This guide documents how to collaborate effectively on the Geospatial Incident Platform. Follow the workflow below to keep changes predictable, traceable, and CI-friendly.

## Branching Strategy

- The default branch is `master`. All feature work happens on short-lived topic branches.
- Use clear prefixes such as `feat/`, `fix/`, `chore/`, or `docs/` to describe the intent (e.g., `feat/map-filters`).
- Rebase or merge `master` frequently to minimize drift, and keep pull requests focused on a single concern.

## Commit Conventions

- Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification: `type(scope?): summary`.
- Common types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.
- Write descriptive bodies when explaining motivation, trade-offs, or breaking changes.
- Squash merge whenever possible so that `master` shows one clean commit per feature or fix.

## Coding Standards

- **Formatting:** Prettier governs formatting. Run `npm run format:write` before committing or rely on the pre-commit hook.
- **Linting:** `npm run lint` executes the root ESLint configuration across the monorepo. Use `npm run lint:client` or `npm run lint:server` for scoped checks.
- **Testing:** Execute `npm test` (aggregates backend + frontend suites) before opening a pull request. Use package-level scripts (`npm --prefix client run test`, `npm --prefix server run test`) for faster iteration.
- **Type Safety:** TypeScript errors fail CI; make sure `npm run build` succeeds if you introduce new build steps or compiler options.

## Pull Request Checklist

Before requesting review:

1. Ensure the branch merges cleanly with `master`.
2. Confirm `npm run lint`, `npm test`, and (if relevant) `npm run format` report success.
3. Update documentation and changelogs when behavior, APIs, or workflows change.
4. Add or update tests that cover new functionality or bug fixes.
5. Mention relevant issues and provide screenshots for UI-facing work.

## Continuous Integration Expectations

GitHub Actions runs the CI pipeline defined in `docs/operations/ci.md`. Pipelines verify linting, tests, and project builds. Failing checks block merges. Use CI logs to reproduce failures locally.

## Troubleshooting Pre-Commit Hooks

Husky + lint-staged execute on every commit:

- **Formatting failures:** Run `npm run format:write`, restage files, and recommit.
- **Lint failures:** Run `npm run lint` (or the targeted package script). Address warnings or errors, restage, and recommit.
- **Test failures:** Execute `npm test` (or package-specific scripts) to reproduce and fix issues locally.
- **Missing hooks:** Run `npm run prepare` to reinstall Husky if the `.husky/` directory is absent.

## Collaboration Tips

- Draft pull requests early for visibility and CI feedback.
- Keep communication in the PR thread; summarize complex discussions or decisions in follow-up commits.
- Use GitHub reviewers or CODEOWNERS (when configured) to route approvals to domain owners.

## Additional Resources

- Need setup steps? Read [`docs/setup.md`](./setup.md).
- Curious about operations? Check [`docs/operations/README.md`](./operations/README.md) and [`docs/operations/ci.md`](./operations/ci.md).
- For package-specific details, see [`client/README.md`](../client/README.md) and [`server/README.md`](../server/README.md).
