# Testing Analysis

## Test Inventory

*   **Backend Unit Tests**:
    *   **Tool**: Jest
    *   **Location**: `server/tests/unit/`
    *   **Focus**: Service Layer logic.
    *   **Mocking**: Extensive usage of `jest.fn()` to mock the Repository layer. This isolates the Service logic (validation, caching, mapping) from the Database.
    *   **Example**: `incidentsService.test.ts` verifies that `createIncident` throws a 400 Error if coordinates are out of bounds, *without* touching the DB.

*   **Backend Integration Tests**:
    *   **Tool**: Jest (Run via `npm run test:db`)
    *   **Location**: `server/tests/db/`
    *   **Focus**: End-to-end flow from Service -> Repository -> Database.
    *   **Environment**: Likely spins up a test Postgres container or uses a separate DB schema (`NODE_ENV=test`).
    *   **Coverage**: Verifies that SQL queries actually work (e.g., PostGIS functions `ST_Within`).

*   **Frontend End-to-End (E2E) Tests**:
    *   **Tool**: Playwright
    *   **Location**: `client/tests/e2e/` (Note: `auth.setup.ts` was looked for but not found, standard Playwright structure is usually `tests/` or `e2e/`).
    *   **Focus**: User flows.
    *   **Scenario**: Likely includes "User logs in", "User views map", "User creates incident".
    *   **Importance**: Critical for a UI-heavy map application where unit tests can't capture "Does the map render?" issues.

## Qualitative Coverage

*   **What is tested?**
    *   **Business Rules**: High coverage (Service tests).
    *   **Edge Cases**: High coverage (Input validation tests).
    *   **Database Integration**: Moderate/High (Repository methods are implicitly tested via integration suites).
*   **What is missing?**
    *   **Visual Regression**: No evidence of Percy/Storybook visual tests.
    *   **Frontend Unit**: `vitest` is present, but checking `client/src/components` didn't reveal extensive `.test.tsx` files alongside components (common practice), suggesting reliance on E2E or generic tests.

## Test Example Analysis: `incidentsService.test.ts`

**Scenario**: `createIncident` validation.

```typescript
it('validates location coordinates', async () => {
  const { service } = createService();

  // Action: Call with invalid latitude (200)
  await expect(
    service.createIncident(buildRequest({ location: { latitude: 200, longitude: 0 } }))
  ).rejects.toThrow(HttpError);
});
```

**Why this is valuable:**
1.  **Speed**: Runs in milliseconds (no DB).
2.  **Safety**: Ensures the API protects the DB from garbage data.
3.  **Documentation**: clearly documents that Latitude must be within valid range (-90 to 90).
