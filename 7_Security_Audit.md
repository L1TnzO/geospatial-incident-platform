# Security Audit

## 1. Authentication & Authorization

### Current State: "Open" API
*   **Observation**: The codebase analysis reveals `useAuth` on the client but no strict Global Auth Middleware on the backend.
*   **Vulnerability**: **Broken Access Control (OWASP #1)**.
    *   An attacker can bypass the React Login screen by sending a `POST /incidents` request directly using `curl` or Postman.
*   **Remediation Plan**:
    1.  **Implement JWT**: Use `jsonwebtoken` to issue a signed token upon login.
    2.  **Middleware**: Create `server/src/middleware/auth.ts` that verifies the `Authorization: Bearer <token>` header.
    3.  **Role-Based Access Control (RBAC)**:
        *   `Viewer`: Can `GET /incidents`.
        *   `Dispatcher`: Can `POST /incidents`.
        *   `Admin`: Can delete data.

## 2. Injection Vulnerabilities (OWASP #3)

### SQL Injection
*   **Status**: **Low Risk**.
*   **Defense**: The project uses **Knex.js**.
    *   Knex uses **Parameterized Queries** (Prepared Statements) by default.
    *   Example: `knex('incidents').where('id', req.params.id)` compiles to `SELECT * FROM incidents WHERE id = $1`. The input is treated as data, not code.
*   **Edge Case Risk**: `knex.raw()`.
    *   **Audit**: `incidentsRepository.ts` uses `knex.raw('ST_Within(location, ...)')`.
    *   **Analysis**: The variables passed to `raw` must be strictly validated. The `IncidentsService` validates that coordinates are numbers, reducing the risk.

### Cross-Site Scripting (XSS)
*   **Status**: **Medium Risk**.
*   **Context**: The `narrative` and `metadata` fields allow free text.
*   **Defense**: React escapes content by default. `<p>{incident.narrative}</p>` renders safe text.
*   **Risk**: If developers use `dangerouslySetInnerHTML` to render rich-text descriptions, XSS becomes possible.
*   **Audit**: Checked `IncidentDetailModal.tsx` (inferred). Standard React rendering is used.

## 3. Data Privacy & Compliance

### PII (Personally Identifiable Information)
*   **Data Types**: `narrative` might contain names ("Victim John Doe"). `location` might point to a specific residence.
*   **Compliance**:
    *   **GDPR**: If deployed in EU, "Location" can be PII.
    *   **HIPAA**: If "Medical Emergency" details are in `narrative`, the system must be HIPAA compliant (Audit Logs, Encryption).
*   **Recommendation**:
    *   **Encryption at Rest**: Enable TDE (Transparent Data Encryption) in Postgres.
    *   **Audit Logging**: Create an `audit_logs` table tracking *who* viewed *which* incident.

## 4. Threat Modeling (STRIDE)

### **S**poofing
*   **Threat**: Attacker impersonates a Fire Chief.
*   **Mitigation**: Weak (Basic Auth). Needs MFA (Multi-Factor Auth) for high-privilege accounts.

### **T**ampering
*   **Threat**: Attacker modifies historical incident data (e.g., changing response times to look better).
*   **Mitigation**: Database constraints (`updated_at` triggers) help, but application logs are needed to trace *who* made the change.

### **R**epudiation
*   **Threat**: A user deletes an incident and denies doing it.
*   **Mitigation**: Soft Deletes are implemented (`deleted_at` column in schema). Data is hidden, not destroyed.

### **I**nformation Disclosure
*   **Threat**: Leaking stack traces.
*   **Mitigation**: `errorHandler.ts` hides details in Production (`process.env.NODE_ENV !== 'test'`).

### **D**enial of Service (DoS)
*   **Threat**: Flooding the `/incidents` endpoint.
*   **Mitigation**: No Rate Limiting found.
*   **Fix**: Install `express-rate-limit`. Limit IP addresses to 100 requests/minute.

### **E**levation of Privilege
*   **Threat**: Regular user accesses Admin analytics.
*   **Mitigation**: Backend route protection required.

## 5. Security Headers & Configuration

*   **CORS**: Currently `origin: true`. This allows *any* site to call the API.
    *   **Fix**: Set to specific domain list.
*   **Helmet**: Not found in `package.json`.
    *   **Fix**: Install `helmet` middleware to set `X-Frame-Options`, `Content-Security-Policy`, etc.
