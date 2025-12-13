# server/src/routes/strategic.ts

## Reference

Original File: server/src/routes/strategic.ts

## Summary

Strategic analysis routes definition.

## Pseudocode

MÓDULO routes/strategic

ROUTER Express

DEFINICIÓN DE RUTAS:

- GET /trends/monthly -> strategicController.getMonthlyTrend
- GET /trends/daily -> strategicController.getDailyTrend
- GET /trends/time-of-day -> strategicController.getTimeOfDayDistribution
- GET /trends/quarters -> strategicController.getQuarterlyTrends
- GET /trends/types -> strategicController.getTypeTimeline
- GET /coverage-buffers -> strategicController.getCoverageBuffers
- GET /response-metrics -> strategicController.getResponseMetrics
- GET /priority-scores -> strategicController.getPriorityScores
- GET /hotspots -> strategicController.getHotspots
- GET /zones/frequency -> strategicController.getZoneFrequency
- GET /stations/volume -> strategicController.getStationIncidentCounts
- GET /projections -> strategicController.getIncidentProjection
- GET /district-frequent-incidents -> strategicController.getDistrictFrequentIncidentTypes

EXPORTAR router
