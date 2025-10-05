# Dashboard Analytics API

The dashboard analytics API surfaces aggregation-ready data for the tactical operations dashboard. All endpoints honour the same filter schema available on `/api/incidents`, allowing the front-end to reuse query builders across list and analytics views.

## Shared behaviour

- **Base path:** `/api/dashboard`
- **Filters:** Every endpoint supports the following optional query parameters, matching `/api/incidents`:
  - `typeCodes`, `severityCodes`, `statusCodes` — comma-separated codes or repeated parameters
  - `startDate`, `endDate` — ISO-8601 strings filtering by incident occurrence date
  - `isActive` — `true`/`false`
  - `incidentNumber` — exact incident number match (forces pagination defaults when present)
- **Cache control:** Pass `refresh=true` to bypass the in-memory cache and force recomputation. Cached results expire automatically after 60 seconds.
- **Response format:** JSON. Errors follow the standard `{ error: { code, message } }` envelope.

## `GET /api/dashboard/kpi/last-24h`

Returns the incident count for the last 24 hours and the delta versus the preceding 24-hour window.

```json
{
  "window": { "start": "2025-09-30T12:00:00.000Z", "end": "2025-10-01T12:00:00.000Z" },
  "previousWindow": { "start": "2025-09-29T12:00:00.000Z", "end": "2025-09-30T12:00:00.000Z" },
  "currentCount": 42,
  "previousCount": 35,
  "delta": 7,
  "deltaPercentage": 20
}
```

## `GET /api/dashboard/incidents/by-type`

Aggregates incidents from the last seven days by type.

```json
{
  "total": 42,
  "buckets": [
    { "type": { "code": "FIRE_STRUCTURE", "name": "Structure" }, "count": 25, "percentage": 59.52 },
    { "type": { "code": "MEDICAL" }, "count": 17, "percentage": 40.48 }
  ]
}
```

## `GET /api/dashboard/incidents/daily-trend`

Produces a 30-day timeline with trend metadata comparing the latest 7-day slice against the prior week.

```json
{
  "points": [
    { "date": "2025-09-02T00:00:00.000Z", "count": 4 },
    { "date": "2025-09-03T00:00:00.000Z", "count": 6 }
    // ...28 additional entries
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

## `GET /api/dashboard/incidents/severity-distribution`

Returns the current distribution of incidents by severity, including percentage shares.

```json
{
  "total": 42,
  "buckets": [
    { "severity": { "code": "CRITICAL", "priority": 4 }, "count": 12, "percentage": 28.57 }
  ]
}
```

## `GET /api/dashboard/incidents/recent`

Lists the latest incidents (default 10, configurable via `limit` up to 25) with key fields for the dashboard widgets.

```json
[
  {
    "incidentNumber": "GIP-INC-001",
    "title": "Critical Medical Incident",
    "reportedAt": "2025-10-01T11:45:00.000Z",
    "occurrenceAt": "2025-10-01T11:30:00.000Z",
    "isActive": true,
    "severity": { "code": "CRITICAL", "name": "Critical" },
    "status": { "code": "ON_SCENE", "name": "On Scene" },
    "type": { "code": "MEDICAL", "name": "Medical" },
    "primaryStation": { "stationCode": "STN-01", "name": "Station 01" },
    "location": {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [-122.4, 37.78] }
    }
  }
]
```

## `GET /api/dashboard/export`

Streams a CSV export of incidents that match the supplied filters. The endpoint shares the query parameters from `/api/incidents` plus:

- `limit` — optional maximum row count (default and hard cap: 5,000). When the filtered result exceeds the limit, the request is rejected with `400` rather than truncating silently.
- `includeColumns` — optional comma-separated list of column keys (case-insensitive). Supported keys include `incidentNumber`, `title`, `occurrenceAt`, `reportedAt`, `typeCode`, `typeName`, `severityCode`, `severityPriority`, `statusCode`, `isActive`, `latitude`, `longitude`, `primaryStationCode`, `primaryStationName`, `sourceCode`, `weatherCode`, and more. Omitted or unknown keys result in `400` responses.

Responses include metadata comment lines followed by the CSV header and data rows:

```
# Generated At: 2025-10-05T09:30:00.000Z
# Record Count: 18
# Filters: severityCodes=CRITICAL; isActive=true
# Columns: Incident Number,Title,Severity Code,Severity Priority
Incident Number,Title,Severity Code,Severity Priority
GIP-INC-0001,Critical Medical Incident,CRITICAL,4
```

`Content-Disposition` is set to `attachment` with a timestamped filename (e.g. `incidents-export-20251005-093000.csv`) so browsers immediately download the file.
