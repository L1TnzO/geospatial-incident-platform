# API Documentation

## Overview
This document outlines the backend API endpoints for the Tactical (Dashboard) and Strategic views, including their time range flexibility.

## Tactical View (Dashboard)

### `GET /api/dashboard/kpi/last-24h`
- **Description**: Returns key performance indicators for the last 24 hours compared to the previous 24 hours.
- **Flexibility**: **Fixed (24 Hours)**.
- **Notes**: The service layer hardcodes the time window to the last 24 hours relative to the request time. `startDate` and `endDate` filters are ignored for the time window calculation but may still filter the underlying data by `occurrence_at`.

### `GET /api/dashboard/incidents/by-type`
- **Description**: Returns incident counts grouped by type.
- **Flexibility**: **Fixed (7 Days)**.
- **Notes**: The service layer hardcodes the time window to the last 7 days.

### `GET /api/dashboard/incidents/daily-trend`
- **Description**: Returns daily incident counts for the last 30 days.
- **Flexibility**: **Fixed (30 Days)**.
- **Notes**: The service layer hardcodes the time window to the last 30 days.

### `GET /api/dashboard/incidents/severity-distribution`
- **Description**: Returns incident counts grouped by severity.
- **Flexibility**: **Flexible**.
- **Notes**: Respects `startDate` and `endDate` query parameters. If not provided, it returns the distribution for all time (or subject to default filters).

### `GET /api/dashboard/incidents/recent`
- **Description**: Returns a list of recent incidents.
- **Flexibility**: **Flexible**.
- **Notes**: Respects `startDate` and `endDate` query parameters.

## Strategic View

### `GET /api/strategic/trends/monthly`
- **Description**: Returns monthly incident trends.
- **Parameters**:
    - `months` (optional, default: 12): Number of months to return.
    - `startDate`, `endDate`: Optional overrides for specific ranges.
- **Flexibility**: **Flexible**.

### `GET /api/strategic/trends/quarters`
- **Description**: Returns quarterly incident trends.
- **Parameters**:
    - `quarters` (optional, default: 8): Number of quarters to return.
    - `startDate`, `endDate`: Optional overrides.
- **Flexibility**: **Flexible**.

### `GET /api/strategic/trends/types`
- **Description**: Returns incident type trends over time.
- **Parameters**:
    - `months` (optional, default: 12).
    - `startDate`, `endDate`.
- **Flexibility**: **Flexible**.

### `GET /api/strategic/hotspots`
- **Description**: Returns geospatial hotspot data.
- **Parameters**:
    - `resolution` (1-8): Grid resolution.
    - `startDate`, `endDate`.
- **Flexibility**: **Flexible**.

### `GET /api/strategic/coverage-buffers`
- **Description**: Returns station coverage analysis.
- **Parameters**:
    - `radiusMeters`: Override default coverage radius.
    - `startDate`, `endDate`.
- **Flexibility**: **Flexible**.

### `GET /api/strategic/response-metrics`
- **Description**: Returns response time metrics.
- **Parameters**:
    - `groupBy`: 'station' or 'grid'.
    - `startDate`, `endDate`.
- **Flexibility**: **Flexible**.

### `GET /api/strategic/priority-scores`
- **Description**: Returns calculated priority scores for regions/stations.
- **Parameters**:
    - `groupBy`: 'station' or 'grid'.
    - `startDate`, `endDate`.
- **Flexibility**: **Flexible**.
