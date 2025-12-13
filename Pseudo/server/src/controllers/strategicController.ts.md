# server/src/controllers/strategicController.ts

## Reference

Original File: [server/src/controllers/strategicController.ts](server/src/controllers/strategicController.ts)

## Summary

Endpoints for advanced strategic analysis (projections, hotspots, performance zones).

## Pseudocode

MÓDULO strategicController

IMPORTAR: strategicService

/_ PATRÓN COMÚN PARA TODOS LOS MÉTODOS _/
WRAPPERS ASYNC (req, res, next):
TRATAR: 1. Llamar método correspondiente de strategicService pasando req.query castado. 2. Retornar JSON (200 OK).
CAPTURAR (error): 3. Pasar error a next(error) para middleware de manejo de errores.

Listado de Endpoints Mapeados:

- getMonthlyTrend -> strategicService.getMonthlyTrend
- getDailyTrend -> strategicService.getDailyTrend
- getTimeOfDayDistribution -> strategicService.getTimeOfDayDistribution
- getQuarterlyTrends -> strategicService.getQuarterlyTrends
- getTypeTimeline -> strategicService.getTypeTimeline
- getCoverageBuffers -> strategicService.getCoverageBuffers
- getResponseMetrics -> strategicService.getResponseMetrics
- getPriorityScores -> strategicService.getPriorityScores
- getHotspots -> strategicService.getHotspots
- getZoneFrequency -> strategicService.getZoneFrequency
- getStationIncidentCounts -> strategicService.getStationIncidentCounts
- getIncidentProjection -> strategicService.getIncidentProjection
- getDistrictFrequentIncidentTypes -> strategicService.getDistrictFrequentIncidentTypes
