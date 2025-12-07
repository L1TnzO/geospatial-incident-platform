# Testing Analysis

## 1. Test Inventory & Strategy

The project employs a **Testing Pyramid** strategy, though heavily weighted towards the top (Integration/E2E) and bottom (Unit) with less focus on the middle (Component tests).

### Backend Unit Tests (`server/tests/unit/`)
*   **Tool**: Jest.
*   **Philosophy**: "Test the Business Logic in Isolation".
*   **Mechanism**:
    *   **Mocking**: The Database (Repository layer) is mocked using `jest.fn()`.
    *   **Why?**: This allows testing edge cases (e.g., "What if the DB throws a unique constraint error?") without actually needing a running Postgres instance. It makes tests fast (milliseconds).
*   **Key File**: `incidentsService.test.ts`.
    *   **Coverage**:
        *   **Validation**: Ensures `createIncident` throws 400 for bad dates.
        *   **Flow**: Verifies that `clearCaches()` is called after a successful create.
        *   **Mapping**: Checks that DB rows are correctly transformed into Domain Objects.

### Backend Integration Tests (`server/tests/db/`)
*   **Tool**: Jest (with a real DB connection).
*   **Philosophy**: "Test that the SQL actually works".
*   **Mechanism**:
    *   **Environment**: Runs against a dedicated test database (implied by `NODE_ENV=test`).
    *   **Lifecycle**: Likely involves `migrate:latest` before tests and transactions that roll back after each test (standard pattern for Knex tests).
*   **Importance**: Unit tests can't catch SQL syntax errors or PostGIS function misuse (`ST_Withn` vs `ST_Within`). Integration tests catch these.

### Frontend End-to-End (E2E) Tests (`client/tests/e2e/`)
*   **Tool**: Playwright.
*   **Philosophy**: "Test as the User".
*   **Mechanism**:
    *   Spins up a headless Chromium browser.
    *   Navigates to `http://localhost:3000`.
    *   Interacts with the DOM (Clicks buttons, types in inputs).
*   **Scenarios (Inferred)**:
    *   **Auth**: User can log in.
    *   **Critical Path**: User can create an incident and see it appear on the list.
    *   **Map Interaction**: User can click a pin and see the popup.
*   **Value**: This is the only layer that tests the *integration* of Backend + Frontend + Database.

## 2. Qualitative Coverage Analysis

### What is well tested?
1.  **Service Logic**: The complex validation rules in `IncidentsService` are well-covered by unit tests.
2.  **Input Sanitization**: Tests exist for boundary conditions (e.g., coordinates out of range).
3.  **Data Integrity**: Database constraints act as a "Runtime Test" for data correctness.

### What is missing / Gaps?
1.  **Frontend Unit Tests**: While `vitest` is configured, there is a lack of deep component testing (e.g., `MapView.test.tsx` mocking Leaflet). The project relies heavily on E2E for UI verification.
2.  **Visual Regression**: No usage of Percy or similar tools to detect CSS regressions (e.g., a button disappearing).
3.  **Load Testing**: No k6/JMeter scripts found. We don't know if the `StrategicService` crashes under 100 concurrent users.

## 3. Deep Dive: `incidentsService.test.ts`

**Code Snippet Analysis:**

```typescript
describe('createIncident', () => {
  it('maps lookup errors to bad request responses', async () => {
    const { service, repository } = createService();
    // 1. Setup: Mock the repository to simulate a specific failure mode
    repository.createIncident.mockRejectedValue(
      new IncidentLookupError('Incident type', 'UNKNOWN')
    );

    // 2. Action: Call the service
    await expect(service.createIncident(buildRequest()))
      // 3. Assertion: Verify the Service translates the error correctly
      .rejects.toMatchObject({
        status: 400, // HTTP 400 Bad Request
      });
  });
});
```

**Why is this test critical?**
*   **Abstraction Leaks**: It ensures that *implementation details* (the specific DB error) do not leak to the *API consumer*. The client should see "400 Bad Request", not "500 Internal Server Error: IncidentLookupError".
*   **Robustness**: It proves the system handles "Data Rot" (referencing a Type that was deleted) gracefully.

## 4. Recommendations for Improvement

1.  **Add Snapshot Testing**: For `StrategicService` outputs. The JSON responses are complex (nested arrays). Snapshot tests would catch accidental changes to the payload structure.
2.  **Mock Service Worker (MSW)**: For Frontend Tests. Currently, E2E tests likely hit a real backend. Using MSW in `vitest` would allow testing the Frontend handles 500 errors or Network Timeouts gracefully without killing the real server.
3.  **Mutation Testing**: Use Stryker to verify if the tests *actually* fail when logic is broken. (e.g., change `casualtyCount > 0` to `casualtyCount >= 0` and see if a test complains).
