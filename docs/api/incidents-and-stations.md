# Incidents & Stations API Reference

This guide describes the REST endpoints exposed by the Geospatial Incident Platform for retrieving incident summaries, detailed incident payloads, and station metadata. Use these contracts when integrating backend clients, frontend data hooks, or automated tests.

- Base URL: `/api`
- Authentication: _None_ (local development). Production deployments should place the API behind an auth gateway before exposing these endpoints externally.
- Media type: `application/json`

## `GET /api/incidents`

Returns a paginated collection of incident summaries suitable for list views and map markers. Results include lookup metadata and GeoJSON points for each incident location.

### Query Parameters

| Name            | Type                                             | Description                                                                                                           |
| --------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `page`          | integer ≥ 1 (default `1`)                        | Zero-offset pagination is not supported.                                                                              |
| `pageSize`      | integer between 1 and 100 (default `25`)         | Individual page responses are limited to 100 records; the overall window remains limited to 5 000 matching incidents. |
| `typeCodes`     | comma-separated string or repeated query value   | Filters by incident type codes (e.g., `typeCodes=FIRE_STRUCTURE,FIRE_WILDLAND`).                                      |
| `severityCodes` | comma-separated string or repeated query value   | Filters by severity codes.                                                                                            |
| `statusCodes`   | comma-separated string or repeated query value   | Filters by incident status codes.                                                                                     |
| `startDate`     | ISO-8601 timestamp                               | Returns incidents with `occurrence_at >= startDate`.                                                                  |
| `endDate`       | ISO-8601 timestamp                               | Returns incidents with `occurrence_at <= endDate`.                                                                    |
| `isActive`      | boolean (`true`/`false`, `1`/`0`)                | Filters by active status (defaults to both active/inactive).                                                          |
| `sortBy`        | `reportedAt`, `occurrenceAt`, `severityPriority` | Sort field applied after filtering; defaults to `reportedAt`.                                                         |
| `sortDirection` | `asc` or `desc`                                  | Sort direction for the chosen field (default `desc`).                                                                 |

Invalid parameter types trigger a `400 BAD_REQUEST` response with a descriptive message (see [Error Handling](#error-handling)). Requests exceeding the 5 000 record window also return `400 BAD_REQUEST`.

### Response

```json
{
  "data": [
    {
      "incidentNumber": "INC-20250709-025520",
      "title": "Structure fire – Midtown",
      "occurrenceAt": "2025-07-09T02:55:20.000Z",
      "reportedAt": "2025-07-09T02:56:33.000Z",
      "dispatchAt": "2025-07-09T02:58:00.000Z",
      "arrivalAt": "2025-07-09T03:04:42.000Z",
      "resolvedAt": null,
      "isActive": true,
      "casualtyCount": 0,
      "responderInjuries": 0,
      "estimatedDamageAmount": "750000.00",
      "location": {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [-73.9857, 40.7484]
        },
        "properties": {}
      },
      "locationGeohash": "dr5regw3",
      "type": {
        "code": "FIRE_STRUCTURE",
        "name": "Structure Fire"
      },
      "severity": {
        "code": "CRITICAL",
        "name": "Critical",
        "priority": 4,
        "colorHex": "#F57C00"
      },
      "status": {
        "code": "DISPATCHED",
        "name": "Dispatched",
        "isTerminal": false
      },
      "source": {
        "code": "911",
        "name": "Emergency Call"
      },
      "weather": null,
      "primaryStation": {
        "stationCode": "ST-014",
        "name": "Midtown Engine"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 4872,
    "totalPages": 195,
    "hasNext": true,
    "hasPrevious": false,
    "sortBy": "reportedAt",
    "sortDirection": "desc"
  }
}
```

- `pagination.total` represents the true total number of incidents that match the filters, but is clamped to 5 000 server-side to protect map rendering performance (RF07 cap).
- GeoJSON `Feature<Point>` objects follow RFC 7946. Consumers should read coordinates in `[longitude, latitude]` order.

### Typical Use Cases

- Map data fetch (frontend `useIncidents` hook) with `pageSize=5000` to retrieve as many incidents as the UI can safely render.
- Filtered list endpoints for dashboards (`typeCodes`, `severityCodes`, `isActive=false`, etc.). Combine with sorting metadata to drive table headers and column sort controls.

## `GET /api/incidents/{incidentNumber}`

Returns a detailed payload for a single incident, including units, assets, notes, metadata, and lookup references.

### Path Parameters

| Name             | Description                                               |
| ---------------- | --------------------------------------------------------- |
| `incidentNumber` | Unique incident identifier (e.g., `INC-20250709-025520`). |

### Response

```json
{
  "incidentNumber": "INC-20250709-025520",
  "title": "Structure fire – Midtown",
  "narrative": "Initial size-up confirmed heavy smoke; second alarm requested.",
  "occurrenceAt": "2025-07-09T02:55:20.000Z",
  "reportedAt": "2025-07-09T02:56:33.000Z",
  "dispatchAt": "2025-07-09T02:58:00.000Z",
  "arrivalAt": "2025-07-09T03:04:42.000Z",
  "resolvedAt": null,
  "isActive": true,
  "casualtyCount": 0,
  "responderInjuries": 0,
  "estimatedDamageAmount": "750000.00",
  "location": {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [-73.9857, 40.7484]
    },
    "properties": {}
  },
  "type": {
    "code": "FIRE_STRUCTURE",
    "name": "Structure Fire"
  },
  "severity": {
    "code": "CRITICAL",
    "name": "Critical",
    "priority": 4,
    "colorHex": "#F57C00"
  },
  "status": {
    "code": "ON_SCENE",
    "name": "On Scene",
    "isTerminal": false
  },
  "source": {
    "code": "911",
    "name": "Emergency Call"
  },
  "weather": null,
  "primaryStation": {
    "stationCode": "ST-014",
    "name": "Midtown Engine"
  },
  "metadata": {
    "buildingHeight": 32,
    "sprinklerStatus": "offline"
  },
  "units": [
    {
      "stationCode": "ST-014",
      "stationName": "Midtown Engine",
      "assignmentRole": "Primary",
      "dispatchedAt": "2025-07-09T02:58:00.000Z",
      "clearedAt": null
    }
  ],
  "assets": [
    {
      "assetIdentifier": "TRK-22",
      "assetType": "Ladder",
      "status": "Deployed",
      "notes": null
    }
  ],
  "notes": [
    {
      "author": "Unit 14",
      "note": "Residents evacuated on arrival.",
      "createdAt": "2025-07-09T03:01:15.000Z"
    }
  ]
}
```

### Error Codes

| Status            | Code          | Description                                    |
| ----------------- | ------------- | ---------------------------------------------- |
| `400 BAD_REQUEST` | `BAD_REQUEST` | Missing or malformed `incidentNumber`.         |
| `404 NOT_FOUND`   | `NOT_FOUND`   | No incident found for the supplied identifier. |

## `GET /api/stations`

Returns station metadata, including location and optional response zone geometry. This endpoint is used by the frontend station overlay and administration dashboards.

### Query Parameters

| Name       | Type                              | Description                                                  |
| ---------- | --------------------------------- | ------------------------------------------------------------ |
| `isActive` | boolean (`true`/`false`, `1`/`0`) | Filters stations by active status. Defaults to all stations. |

### Response

```json
{
  "data": [
    {
      "stationCode": "ST-014",
      "name": "Midtown Engine",
      "battalion": "City Battalion 3",
      "phone": "555-0101",
      "address": {
        "line1": "123 Main St",
        "line2": null,
        "city": "New York",
        "region": "NY",
        "postalCode": "10001"
      },
      "isActive": true,
      "commissionedOn": "1998-02-01",
      "decommissionedOn": null,
      "coverageRadiusMeters": 5000,
      "location": {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [-73.9902, 40.7505]
        },
        "properties": {}
      },
      "responseZone": {
        "zoneCode": "ZONE-3",
        "name": "Midtown Coverage",
        "boundary": {
          "type": "Feature",
          "geometry": {
            "type": "MultiPolygon",
            "coordinates": [
              [
                [
                  [-73.998, 40.745],
                  [-73.982, 40.745],
                  [-73.982, 40.756],
                  [-73.998, 40.756],
                  [-73.998, 40.745]
                ]
              ]
            ]
          },
          "properties": {}
        }
      }
    }
  ]
}
```

### Error Codes

| Status            | Code          | Description                                 |
| ----------------- | ------------- | ------------------------------------------- |
| `400 BAD_REQUEST` | `BAD_REQUEST` | Invalid `isActive` value (must be boolean). |

## Error Handling

All endpoints share a consistent error response shape emitted by the Express error handler:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Query parameter 'page' must be an integer.",
    "details": {
      "field": "page"
    }
  }
}
```

`code` values map to `BAD_REQUEST`, `NOT_FOUND`, or `INTERNAL_SERVER_ERROR`. The optional `details` payload surfaces extra context when provided by the service layer.

## Related Documentation

- [`docs/backend-data-access.md`](../backend-data-access.md) – Repository & service layer architecture powering these endpoints.
- [`docs/operations/testing.md`](../operations/testing.md) – Commands for running unit + integration suites that validate the endpoints.
- [`docs/data-model/README.md`](../data-model/README.md) – Schema definitions for incidents, stations, and lookup tables.
- [`docs/frontend/map.md`](../frontend/map.md) – How the frontend consumes these endpoints for the map experience.
