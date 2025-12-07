# API Contract and Error Handling

## 1. RESTful Design Principles

The API follows a pragmatic **Resource-Oriented** design.

*   **Resources**:
    *   `/incidents` (Collection)
    *   `/incidents/:id` (Item)
    *   `/stations`
    *   `/infrastructure`
*   **Verbs**:
    *   `GET`: Read (List/Detail).
    *   `POST`: Create (`createIncident`).
    *   *(Inferred)* `PUT`/`PATCH`: Update.
    *   *(Inferred)* `DELETE`: Delete.
*   **Query Parameters**:
    *   Filtering: `?typeCodes=FIRE&isActive=true`
    *   Pagination: `?page=1&pageSize=25`
    *   Sorting: `?sortBy=reportedAt&sortDirection=desc`

## 2. Response Structure

*   **Success (List)**:
    ```json
    {
      "data": [ ... ],
      "pagination": {
        "page": 1,
        "pageSize": 25,
        "total": 120,
        "totalPages": 5,
        "hasNext": true
      }
    }
    ```
    *   **Analysis**: Wrapping the array in `data` allows adding metadata (pagination) without breaking clients. This is a best practice.

*   **Success (Item)**: Returns the object directly (or wrapped, depending on controller implementation).

## 3. Error Handling Standard

*   **Implementation**: `server/src/middleware/errorHandler.ts`
*   **Structure**:
    ```json
    {
      "error": {
        "code": "BAD_REQUEST",
        "message": "Field 'incidentNumber' is required.",
        "details": { ... }
      }
    }
    ```
*   **Codes (`HttpErrorCode`)**:
    *   `BAD_REQUEST` (400): Validation failure.
    *   `NOT_FOUND` (404): ID not found.
    *   `CONFLICT` (409): Duplicate Unique Key.
    *   `INTERNAL_SERVER_ERROR` (500): Unhandled exception.
*   **Benefit**: The frontend can switch on `error.code` (stable string) rather than parsing the English `message`.

## 4. Input/Output Contracts

*   **Date Formats**:
    *   Input: ISO-8601 Strings (`2023-01-01T12:00:00Z`).
    *   Output: ISO-8601 Strings.
    *   **Consistent**: No Unix timestamps or ambiguous formats.
*   **Geospatial**:
    *   Input: `location: { latitude: number, longitude: number }` (Simple for clients).
    *   Output: `location: GeoJSON Point` (Standard for map libraries).
    *   **Translation**: The Controller/Service layer handles the conversion from "Simple Lat/Lon" to "GeoJSON" / "PostGIS Geometry".

## 5. Recommendations

*   **OpenAPI/Swagger**: No `swagger.json` or `swagger-ui` was found.
    *   **Action**: Add `swagger-jsdoc` to auto-generate documentation. This is crucial for external teams integrating with the platform.
*   **Rate Limiting**: No `express-rate-limit` found.
    *   **Action**: Add rate limiting to prevent basic DoS attacks or accidental loops from the frontend.
