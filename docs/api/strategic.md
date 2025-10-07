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

## `GET /api/strategic/coverage-buffers`

Returns GeoJSON coverage polygons buffered around station locations using each station’s configured radius (meters) or an optional override.

### Query parameters

- `radiusMeters` _(optional, min `100`, max `50 000`)_ — Apply a uniform buffer radius to every station.
- `stationIsActive` _(optional boolean)_ — Limit results to active/inactive stations.
- `refresh` _(optional boolean)_ — Bypass the five-minute cache and recompute results.
- Shared incident filters (optional). When provided, only stations with matching incidents are returned.

### Response shape

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [-122.41, 37.77],
            [-122.39, 37.77],
            [-122.39, 37.79],
            [-122.41, 37.79],
            [-122.41, 37.77]
          ]
        ]
      },
      "properties": {
        "stationCode": "STN-001",
        "stationName": "Station 1",
        "isActive": true,
        "radiusMeters": 7500,
        "incidentCount": 48,
        "centroid": {
          "latitude": 37.78,
          "longitude": -122.4
        }
      }
    }
  ],
  "metadata": {
    "generatedAt": "2025-01-15T10:00:00.000Z",
    "stationCount": 6,
    "filtersSummary": "typeCodes=FIRE_STRUCTURE|MEDICAL; isActive=true",
    "radiusOverrideMeters": null,
    "defaultRadiusMeters": 5000
  }
}
```

### Notes

- Station coverage buffers default to the `coverage_radius_meters` column; when that value is missing or zero the service falls back to `5 000` meters.
- Passing `radiusMeters` applies a uniform buffer and is useful for scenario planning or quick comparisons.
- When incident filters are supplied, only stations with at least one matching incident are included; the `incidentCount` property reflects the filtered incident tally.
- Cached responses expire after five minutes. Use `refresh=true` to force a rebuild for dashboards offering manual refresh controls.

## `GET /api/strategic/response-metrics`

Summarises turnout/response times grouped either by primary station or by the hotspot grid used in the strategic heatmap. Returns per-group averages, medians, 90th-percentiles, and normalized rankings to support percentile visualisations.

### Query parameters

- `groupBy` _(optional, default `station`, values `station` or `grid`)_ — Selects the aggregation dimension.
- `resolution` _(grid only, optional, default `4`, allowed `1–8`)_ — Same semantics as hotspot resolution; controls grid cell size.
- Shared incident filters (optional).

### Response shape

```json
{
  "metadata": {
    "groupBy": "station",
    "sampleThreshold": 3,
    "totalGroups": 12,
    "minAverageSeconds": 240,
    "maxAverageSeconds": 520,
    "generatedAt": "2025-10-06T15:12:33.512Z"
  },
  "groups": [
    {
      "groupType": "station",
      "station": { "code": "STATION_101", "name": "Station 101" },
      "sampleSize": 18,
      "averageSeconds": 260,
      "medianSeconds": 250,
      "p90Seconds": 420,
      "normalizedAverage": 1,
      "percentileRank": 1,
      "insufficientSample": false
    }
  ]
}
```

Grid responses mirror the hotspot payload (`cell.cellId`, GeoJSON, centroid) while still returning the same metric fields and normalized rankings per cell.

### Notes

- Groups with fewer than three samples are flagged with `insufficientSample: true` so UIs can downplay low-confidence metrics.
- Normalized averages and percentile ranks are pre-rounded to four decimal places to keep payloads compact.
- Cached for five minutes per unique filter/groupBy/resolution tuple.

## `GET /api/strategic/priority-scores`

Calculates severity-weighted activity scores for stations or grid cells. Scores are normalized to a 0–1 range and optional time decay can reduce influence from older incidents.

### Query parameters

- `groupBy` _(optional, default `station`, values `station` or `grid`)_ — Aggregation dimension.
- `resolution` _(grid only, optional, default `4`, allowed `1–8`)_ — Grid cell sizing, identical to hotspot usage.
- `decayHalfLifeDays` _(optional)_ — Positive number. Applies an exponential half-life to incident contributions using `CURRENT_TIMESTAMP` as the reference.
- Shared incident filters (optional).

### Response shape

```json
{
  "metadata": {
    "groupBy": "station",
    "totalGroups": 12,
    "minRawScore": 6,
    "maxRawScore": 84,
    "decayHalfLifeDays": 45,
    "generatedAt": "2025-10-06T15:16:41.929Z"
  },
  "groups": [
    {
      "groupType": "station",
      "station": { "code": "STATION_101", "name": "Station 101" },
      "totalIncidents": 22,
      "rawScore": 84,
      "normalizedScore": 1,
      "percentileRank": 1,
      "weightSum": 19.5,
      "averageSeverity": 4.2
    }
  ]
}
```

Grid responses provide the same cell metadata as `response-metrics`/`hotspots`.

### Notes

- Raw scores combine severity priority with the optional decay factor; a weight sum of zero results in a normalized score of `0`.
- Invalid `groupBy`, `resolution`, or non-positive `decayHalfLifeDays` values return `400 BAD_REQUEST`.
- Cached for five minutes per filter/groupBy/resolution/decay combination.

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
