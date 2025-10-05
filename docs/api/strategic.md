# Strategic Analytics API

Endpoints under `/api/strategic` provide longer-range aggregations that power Phase 6 dashboards. All endpoints accept the same filter parameters as `/api/incidents` (`typeCodes`, `severityCodes`, `statusCodes`, `startDate`, `endDate`, `isActive`, `incidentNumber`) and respond with `400` when ranges or window arguments are invalid. Results are cached in-memory for five minutes.

## `GET /api/strategic/trends/monthly`

Returns month-over-month incident counts with year-over-year context.

### Query parameters

- `months` _(optional, default `12`, min `3`, max `36`)_ — Number of months to include.
- Shared incident filters (optional).

### Response shape

```json
{
  "range": {
    "start": "2024-02-01T00:00:00.000Z",
    "end": "2025-01-31T23:59:59.999Z",
    "months": 12
  },
  "series": [
    {
      "month": "2025-01",
      "label": "Jan 2025",
      "start": "2025-01-01T00:00:00.000Z",
      "end": "2025-01-31T23:59:59.999Z",
      "count": 42,
      "previousMonthCount": 35,
      "monthOverMonthDelta": 7,
      "monthOverMonthPercentage": 20,
      "previousYearCount": 30,
      "yearOverYearDelta": 12,
      "yearOverYearPercentage": 40
    }
  ],
  "totals": {
    "currentPeriodTotal": 420,
    "previousPeriodTotal": 360,
    "periodDelta": 60,
    "periodPercentage": 16.67
  }
}
```

## `GET /api/strategic/trends/quarters`

Produces quarter-over-quarter comparisons plus year-over-year anchors.

### Query parameters

- `quarters` _(optional, default `8`, min `2`, max `12`)_ — Number of quarters to include.
- Shared incident filters (optional).

### Response shape

```json
{
  "range": {
    "start": "2023-04-01T00:00:00.000Z",
    "end": "2025-03-31T23:59:59.999Z",
    "quarters": 8
  },
  "series": [
    {
      "year": 2025,
      "quarter": 1,
      "label": "Q1 2025",
      "start": "2025-01-01T00:00:00.000Z",
      "end": "2025-03-31T23:59:59.999Z",
      "count": 128,
      "previousQuarterCount": 118,
      "quarterOverQuarterDelta": 10,
      "quarterOverQuarterPercentage": 8.47,
      "previousYearCount": 97,
      "yearOverYearDelta": 31,
      "yearOverYearPercentage": 31.96
    }
  ],
  "summary": {
    "current": { "year": 2025, "quarter": 1, "count": 128 },
    "previous": { "year": 2024, "quarter": 4, "count": 118 },
    "delta": 10,
    "percentage": 8.47,
    "yearOverYearReference": { "year": 2024, "quarter": 1, "count": 97 },
    "yearOverYearDelta": 31,
    "yearOverYearPercentage": 31.96
  }
}
```

## `GET /api/strategic/trends/types`

Returns per-month totals and incident timelines grouped by incident type.

### Query parameters

- `months` _(optional, default `12`, min `3`, max `24`)_ — Months to include.
- Shared incident filters (optional).

### Response shape

```json
{
  "range": { "start": "2024-02-01T00:00:00.000Z", "end": "2025-01-31T23:59:59.999Z", "months": 12 },
  "totalsByMonth": [
    {
      "month": "2025-01",
      "count": 42,
      "start": "2025-01-01T00:00:00.000Z",
      "end": "2025-01-31T23:59:59.999Z"
    }
  ],
  "types": [
    {
      "type": { "code": "FIRE_STRUCTURE", "name": "Structure Fire" },
      "total": 180,
      "points": [
        {
          "month": "2025-01",
          "count": 18,
          "start": "2025-01-01T00:00:00.000Z",
          "end": "2025-01-31T23:59:59.999Z"
        }
      ]
    }
  ]
}
```

### Example requests

```bash
# Last 24 months of filtered incident trends
curl "http://localhost:3000/api/strategic/trends/monthly?months=24&typeCodes=FIRE_STRUCTURE&severityCodes=CRITICAL"

# Quarter-over-quarter comparison for active incidents only
curl "http://localhost:3000/api/strategic/trends/quarters?isActive=true"

# Type timelines with severity filter
curl "http://localhost:3000/api/strategic/trends/types?months=18&severityCodes=CRITICAL,MODERATE"
```

### Notes

- When the requested window exceeds available historical data, missing months/quarters are returned with `count: 0` and deltas are computed only when baseline periods exist.
- Invalid or out-of-range `months`/`quarters` parameters respond with `400 BAD_REQUEST` and descriptive messages.
- Caching is in-memory but packaged so the service can be swapped to Redis or another store without changing controllers.

## `GET /api/strategic/hotspots`

Aggregates incidents into square grid cells (Web Mercator projection) for heatmap overlays. Each cell reports raw counts and an intensity value normalized to the highest-count cell in the result set.

### Query parameters

- `resolution` _(optional, default `4`, allowed `1–8`)_ — Controls cell size; higher resolution yields smaller cells. Resolution `4` is roughly a 500 m square in Web Mercator.
- Shared incident filters (optional) — `typeCodes`, `severityCodes`, `statusCodes`, `startDate`, `endDate`, `isActive`, `incidentNumber`.

### Response shape

```json
{
  "metadata": {
    "resolution": 4,
    "cellSizeMeters": 500,
    "cellAreaSquareMeters": 250000,
    "totalIncidents": 300,
    "maxIncidentCount": 12,
    "cellCount": 48,
    "generatedAt": "2025-10-05T19:48:13.214Z"
  },
  "cells": [
    {
      "cellId": "sq_-108528_408312_r4",
      "incidentCount": 12,
      "intensity": 1,
      "centroid": { "latitude": 37.772, "longitude": -122.425 },
      "geometry": {
        "type": "Feature",
        "properties": {},
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [-122.4273, 37.7707],
              [-122.4273, 37.7744],
              [-122.4227, 37.7744],
              [-122.4227, 37.7707],
              [-122.4273, 37.7707]
            ]
          ]
        }
      }
    }
  ]
}
```

### Example requests

```bash
# Default city-wide intensity grid
curl "http://localhost:3000/api/strategic/hotspots"

# Higher resolution overlay filtered to critical incidents in September
curl "http://localhost:3000/api/strategic/hotspots?resolution=6&severityCodes=CRITICAL&startDate=2025-09-01&endDate=2025-09-30"
```

### Notes

- Resolutions outside `1–8` respond with `400 BAD_REQUEST`.
- The service caches results per filter/resolution combo for five minutes (same policy as the trend endpoints).
- Cell geometries are generated via PostGIS Web Mercator tiling; no additional extensions are required beyond PostGIS.
