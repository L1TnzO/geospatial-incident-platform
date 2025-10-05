# Dashboard Analytics API

The dashboard analytics API powers the `/dashboard` view and CSV export workflow. Each endpoint reuses the incident filtering vocabulary so front-end query builders and QA utilities can share logic with `/api/incidents`.

## Shared behaviour

- **Base path:** `/api/dashboard`
- **Authentication:** None in local development. Production deployments should front this API with the same auth gateway used by the incident endpoints.
- **Content type:** JSON (`application/json`) for aggregation endpoints; the export streams `text/csv; charset=utf-8`.
- **Caching:** Aggregations are cached in-memory for 60 s. Append `refresh=true` to bypass the cache (used by manual refresh controls and automated tests).
- **Error envelope:** `{ "error": { "code": string, "message": string, "details"?: unknown } }` with HTTP status codes `400`, `404`, or `500` depending on the source error.

### Common query parameters

Unless stated otherwise, every endpoint accepts the following optional parameters (single value or comma-separated lists are both supported):

| Parameter                  | Type          | Description                                                               |
| -------------------------- | ------------- | ------------------------------------------------------------------------- |
| `typeCodes`                | string/array  | Incident type codes.                                                      |
| `severityCodes`            | string/array  | Severity codes (e.g. `CRITICAL`, `LOW`).                                  |
| `statusCodes`              | string/array  | Status codes (e.g. `REPORTED`, `ON_SCENE`).                               |
| `startDate`                | ISO timestamp | Inclusive lower bound for `occurrenceAt` (UTC).                           |
| `endDate`                  | ISO timestamp | Inclusive upper bound for `occurrenceAt` (UTC).                           |
| `isActive`                 | boolean       | `true`/`false` or `1`/`0`.                                                |
| `incidentNumber`           | string        | Exact incident identifier (case-insensitive).                             |
| `sortBy` / `sortDirection` | string        | Optional sort hints reused by the export stream. Ignored by aggregations. |
| `refresh`                  | boolean       | When `true`, forces recomputation and skips the cache.                    |

Invalid filters produce `400 BAD_REQUEST` responses with descriptive messages.

## `GET /api/dashboard/kpi/last-24h`

Summarises incidents reported in the last 24 hours and compares the total to the previous 24-hour window. Filters scope both windows before counts are computed.

```json
{
  "window": { "start": "2025-10-04T12:00:00.000Z", "end": "2025-10-05T12:00:00.000Z" },
  "previousWindow": { "start": "2025-10-03T12:00:00.000Z", "end": "2025-10-04T12:00:00.000Z" },
  "currentCount": 42,
  "previousCount": 35,
  "delta": 7,
  "deltaPercentage": 20
}
```

- `deltaPercentage` is `null` when `previousCount` is zero.
- Use `refresh=true` to bypass the cached response after new incidents are created.

## `GET /api/dashboard/incidents/by-type`

Returns the last seven days of incident volume grouped by incident type. Percentages are rounded to two decimal places and sum to ~100 %.

```json
{
  "total": 42,
  "buckets": [
    {
      "type": { "code": "FIRE_STRUCTURE", "name": "Structure Fire" },
      "count": 25,
      "percentage": 59.52
    },
    { "type": { "code": "MEDICAL", "name": "Medical" }, "count": 17, "percentage": 40.48 }
  ]
}
```

An empty result returns `{ "total": 0, "buckets": [] }`.

## `GET /api/dashboard/incidents/severity-distribution`

Provides the current severity mix for matching incidents. The payload mirrors the severity metadata used by the UI (including `colorHex` and `priority`).

```json
{
  "total": 42,
  "buckets": [
    {
      "severity": { "code": "CRITICAL", "name": "Critical", "priority": 4, "colorHex": "#dc2626" },
      "count": 12,
      "percentage": 28.57
    }
  ]
}
```

## `GET /api/dashboard/incidents/daily-trend`

Delivers a 30-day timeline of incident counts plus a trend summary comparing the most recent seven-day slice with the previous week.

```json
{
  "points": [
    { "date": "2025-09-06", "count": 4 },
    { "date": "2025-09-07", "count": 6 }
    // 28 additional entries
  ],
  "trend": {
    "currentTotal": 35,
    "previousTotal": 28,
    "change": 7,
    "percentageChange": 25,
    "direction": "up"
  }
}
```

- `date` values are UTC `YYYY-MM-DD` strings.
- `direction` is one of `"up"`, `"down"`, or `"flat"`.

## `GET /api/dashboard/incidents/recent`

Returns the most recent incidents (default 10). Use `limit` to request up to 25 rows.

```json
[
  {
    "incidentNumber": "GIP-INC-001",
    "title": "Critical Medical Incident",
    "reportedAt": "2025-10-05T11:45:00.000Z",
    "occurrenceAt": "2025-10-05T11:30:00.000Z",
    "isActive": true,
    "severity": { "code": "CRITICAL", "name": "Critical", "colorHex": "#dc2626", "priority": 4 },
    "status": { "code": "ON_SCENE", "name": "On Scene", "isTerminal": false },
    "type": { "code": "MEDICAL", "name": "Medical" },
    "primaryStation": { "stationCode": "STN-01", "name": "Station 01" },
    "location": {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [-122.4, 37.78] },
      "properties": {}
    }
  }
]
```

- `limit` greater than 25 results in `400 BAD_REQUEST`.
- Include `refresh=true` to force refetching immediately after bulk imports.

## `GET /api/dashboard/export`

Streams a CSV of incidents that match the filters. The export honours sorting hints (`sortBy`, `sortDirection`) and includes metadata in the preamble.

- **Row limit:** `limit` is optional (default `5 000`, hard cap `5 000`). When the filtered result exceeds the effective limit the API responds with `400 BAD_REQUEST` and the message `Filtered export matches … exceeds the export limit …`.
- **Column selection:** `includeColumns` accepts comma-separated keys. Unknown columns yield `400 BAD_REQUEST` with a supported-column list. When omitted, the default column order (`incidentNumber`, `title`, `occurrenceAt`, `reportedAt`, `typeCode`, `typeName`, `severityCode`, `severityPriority`, `statusCode`, `isActive`, `latitude`, `longitude`, `primaryStationCode`, `primaryStationName`) is used.
- **Headers:**
  - `Content-Type: text/csv; charset=utf-8`
  - `Content-Disposition: attachment; filename="incidents-export-YYYYMMDD-HHmmss.csv"`
  - `X-Export-Total: <number>` (count of rows that will be streamed)
- **Metadata preamble:** Each export begins with comment lines documenting generation time, record count, filter summary, and column list. The CSV header row follows immediately.
- **Streaming behaviour:** Results stream as they are read from the database, allowing large exports without loading everything into memory. Throttling prevents runaway bursts on slower clients; expect small batches of rows to flush roughly every event loop tick.

Example (truncated):

```
# Generated At: 2025-10-05T09:30:00.000Z
# Record Count: 18
# Filters: severityCodes=CRITICAL|HIGH; isActive=true
# Columns: Incident Number,Title,Severity Code,Severity Priority
Incident Number,Title,Severity Code,Severity Priority
GIP-INC-0001,Critical Medical Incident,CRITICAL,4
```

### Error scenarios

| Status                      | Code                    | Description                                                                                            |
| --------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------ |
| `400 BAD_REQUEST`           | `BAD_REQUEST`           | Invalid filters (`limit`, `includeColumns`, malformed dates) or exports that exceed the 5 000-row cap. |
| `404 NOT_FOUND`             | `NOT_FOUND`             | Filters reference lookup codes that do not exist.                                                      |
| `500 INTERNAL_SERVER_ERROR` | `INTERNAL_SERVER_ERROR` | Unexpected stream or repository failure (rare; logged server-side).                                    |

## Related documentation

- [`docs/frontend/dashboard.md`](../frontend/dashboard.md) — UI walkthrough, data hooks, styling, and export UX.
- [`docs/frontend/map.md`](../frontend/map.md) — Map/overview experience whose filters stay in sync with dashboard exports.
- [`docs/operations/testing.md`](../operations/testing.md) — Commands and prerequisites for analytics integration tests and Playwright coverage.
