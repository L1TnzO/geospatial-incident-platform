# Security Audit

## 1. Authentication & Authorization

*   **Current State (Inferred)**:
    *   **Frontend**: `useAuth` hook (`client/src/hooks/useAuth.ts`) and `AuthProvider` (`client/src/providers/auth-provider.tsx`) manage user state.
    *   **Backend**: No explicit "Auth Middleware" was found in the global middleware stack in `app.ts` (only `errorHandler` and `notFoundHandler`).
    *   **Login Flow**: `App.tsx` shows a `LoginScreen` if not logged in.
    *   **Risk**: If the backend API routes (`/api/incidents`) are not protected by a JWT/Session middleware, **anyone can curl the API** to create/delete incidents, even if the Frontend hides the buttons.
    *   **Recommendation**:
        *   Implement `passport` or a custom JWT middleware in `server/src/middleware/auth.ts`.
        *   Apply `app.use('/api', authMiddleware)` in `app.ts`.

## 2. Input Validation (Sanitization)

*   **Status**: **Strong**.
*   **Evidence**: `IncidentService` (`server/src/services/incidentsService.ts`) manually validates every field.
    *   `requireString`, `parseDateField`, `parseNonNegativeInteger`.
    *   **SQL Injection**: `Knex` uses parameterized queries by default (`?` bindings), making SQL injection extremely difficult via standard inputs.
    *   **XSS**: React automatically escapes content in JSX. `IncidentService` sanitizes strings.
*   **Risk**: `metadata` field is `JSONB`. If the frontend renders this raw HTML without sanitization, it could be an XSS vector (Stored XSS).
    *   **Mitigation**: Ensure frontend uses `JSON.stringify` or safe renderers for metadata.

## 3. Data Protection

*   **Transport**:
    *   Development: HTTP (localhost).
    *   Production: `knexfile.js` supports `ssl: { rejectUnauthorized: false }` for connecting to managed Postgres (like RDS).
    *   **Recommendation**: Ensure Nginx/Traefik is placed in front of Docker containers to terminate SSL (HTTPS) for the browser-to-server connection.
*   **At Rest**:
    *   Postgres storage is mounted via Docker volumes. In a cloud environment, this volume should be encrypted (e.g., EBS Encryption).

## 4. Operational Security

*   **Error Leaking**:
    *   `errorHandler.ts` checks `process.env.NODE_ENV !== 'test'`.
    *   **Good Practice**: It returns a standardized `{ error: { code, message } }` object.
    *   **Risk**: It does `console.error(err)` for 500 errors. If logs are public or accessible to attackers, stack traces might leak info.
    *   **Mitigation**: Ensure logs are shipped to a secure place (Datadog/ELK) and not exposed.

## 5. CORS (Cross-Origin Resource Sharing)

*   **Status**: **Permissive**.
*   **Evidence**: `server/src/app.ts`:
    ```typescript
    app.use(cors({ origin: true, credentials: true }));
    ```
*   **Risk**: `origin: true` reflects the request origin. This allows *any* website to make XHR requests to the API if the user is authenticated (CSRF risk if cookie-based, less so if header-based).
*   **Recommendation**: Set `origin` to the specific frontend domain (e.g., `process.env.FRONTEND_URL`) in production.
