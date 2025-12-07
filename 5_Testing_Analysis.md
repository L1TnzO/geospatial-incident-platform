# Testing Analysis

## Test Inventory

*   **Backend:**
    *   **Framework:** `Jest` (inferred from `jest.config.js` and `*.test.ts` files).
    *   **Location:** `server/tests/`.
    *   **Types:**
        *   **Unit Tests:** `server/tests/unit/` (e.g., `incidentsService.test.ts`). These mock dependencies (Repository) and test logic in isolation.
        *   **Integration/DB Tests:** `server/tests/db/` (e.g., `health.test.ts`, `delta_sync.test.ts`). These likely run against a real database instance (implied by `test:db` script setting `NODE_ENV=test` and `knexfile.js` having a test config).
*   **Frontend:**
    *   **Framework:** `Vitest` (Unit/Integration) and `Playwright` (E2E).
    *   **Location:** `client/tests/`.
    *   **Types:**
        *   **E2E:** `client/tests/e2e/` (implied by folder existence). Tests user flows in a real browser.
        *   **Unit:** `vitest` config suggests component unit testing capability.

## Qualitative Coverage

*   **Backend Unit Tests:** The `incidentsService.test.ts` is very thorough. It tests:
    *   **Input Parsing:** Correctly parsing filters, validating dates, and checking geospatial bounds.
    *   **Logic:** Ensuring logical constraints (e.g., `page` limit, sorting validation).
    *   **Mocking:** It mocks the `IncidentRepository` to test the Service logic without needing a DB connection.
*   **Scenario Coverage:** It covers "Happy Paths" (valid creation, listing) and "Edge Cases" (invalid dates, unique violations, malformed bounding boxes).

## Test Example: `incidentsService.test.ts`

**Scenario:** Validating `createIncident` logic.

```typescript
it('maps lookup errors to bad request responses', async () => {
  const { service, repository } = createService();
  // Setup: Mock the repository to simulate a "Foreign Key Error" (e.g., Invalid Incident Type)
  repository.createIncident.mockRejectedValue(
    new IncidentLookupError('Incident type', 'UNKNOWN')
  );

  // Action: Call the service with a valid payload but one that triggers the mock error
  await expect(service.createIncident(buildRequest())).rejects.toMatchObject({
    status: 400, // Expectation: The service should catch the DB error and throw a 400 HTTP Error
  });
});
```

**Explanation:**
This test case validates the **Error Handling** and **Abstraction** of the service.
1.  **Context:** A user tries to create an incident with a "Type" that doesn't exist in the database (e.g., "ALIEN_ATTACK").
2.  **Mock:** The repository is programmed to throw an `IncidentLookupError`.
3.  **Verification:** The test ensures the Service catches this specific internal error and translates it into a user-friendly `HttpError` with status `400` (Bad Request), protecting the API client from raw server exceptions.
