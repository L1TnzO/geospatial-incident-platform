# API Contract and Error Handling

## 1. RESTful Maturity Model

The API generally follows **Level 2** of the Richardson Maturity Model.

*   **Level 0 (The Swamp of POX)**: Not used. We have distinct URLs.
*   **Level 1 (Resources)**: Yes. `/incidents`, `/stations`.
*   **Level 2 (HTTP Verbs)**: Yes. `GET`, `POST`.
*   **Level 3 (HATEOAS)**: No. The API does not return links (`_links: { next: "..." }`). The client must know the URLs.

## 2. API Design Principles

### Naming Conventions
*   **Plural Nouns**: `/incidents` (not `/incident`).
*   **Kebab-case URLs**: `/api/incident-types` (Standard).
*   **CamelCase JSON**: `{ "incidentNumber": "..." }` (Matches JavaScript conventions).

### Query Parameters (Filtering)
*   **Design**: `GET /incidents?typeCodes=FIRE,HAZMAT`.
*   **Benefit**: Comma-separated values allow multiple selections without complex syntax (like `typeCodes[]=FIRE&typeCodes[]=HAZMAT`).

### Pagination
*   **Strategy**: Offset-based (`page`, `pageSize`).
*   **Pros**: Simple to implement.
*   **Cons**: Performance degrades at high offsets (`OFFSET 100000`).
*   **Alternative**: Cursor-based (`after_id=...`). Better for infinite scroll, but harder for "Jump to Page 10".

## 3. Error Handling Strategy

### The Standard Error Envelope
The backend returns a consistent JSON structure for all errors.

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Start Date cannot be after End Date.",
    "details": {
      "field": "startDate",
      "value": "2025-01-01"
    }
  }
}
```

### HTTP Status Code Catalog

*   **200 OK**: Success (Synchronous).
*   **201 Created**: Resource created (`POST`).
*   **400 Bad Request**: Validation failure. (Client error).
*   **401 Unauthorized**: Missing Token.
*   **403 Forbidden**: Token valid, but permission denied.
*   **404 Not Found**: ID doesn't exist.
*   **409 Conflict**: Unique constraint violation (e.g., Duplicate Incident Number).
*   **429 Too Many Requests**: Rate limit exceeded (Future implementation).
*   **500 Internal Server Error**: Bug in code / DB down.

## 4. Input Validation (The Contract)

*   **Type Safety**: The API expects strict types. Sending `"casualtyCount": "five"` (string) will fail.
*   **Sanitization**: The Service layer trims strings.
*   **Defaults**: `isActive` defaults to `true`. This simplifies the client logic (don't need to send it explicitly).

## 5. Idempotency

*   **Safe Methods**: `GET` is safe (read-only).
*   **Idempotent Methods**: `PUT` (Replace) and `DELETE` should be idempotent.
    *   **Current State**: `createIncident` (POST) is *not* idempotent. Sending it twice creates two incidents (or a 409 error).
    *   **Recommendation**: Allow the client to send a `X-Idempotency-Key` header. The server caches the result of the first request and returns it for subsequent retries (useful for flaky mobile networks).
