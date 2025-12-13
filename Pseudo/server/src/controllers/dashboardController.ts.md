# server/src/controllers/dashboardController.ts

## Reference

Original File: [server/src/controllers/dashboardController.ts](server/src/controllers/dashboardController.ts)

## Summary

Endpoints for dashboard KPIs, trends, and distribution data.

## Pseudocode

MÓDULO dashboardController

IMPORTAR: dashboardService

MÉTODO AUXILIAR parseRefreshFlag(val): - Retornar true si val es 'true', '1' o 'yes'.

MÉTODO getLast24HoursKpi(req, res): 1. Parsear flag 'refresh'. 2. Llamar dashboardService.getLast24HoursKpi(req.query, refresh). 3. Retornar JSON con resultado.

MÉTODO getIncidentsByType(req, res): - Similar a getLast24HoursKpi, invoca getIncidentsByType del servicio.

MÉTODO getDailyTrend(req, res): - Similar, invoca getDailyTrend.

MÉTODO getSeverityDistribution(req, res): - Similar, invoca getSeverityDistribution.

MÉTODO getRecentIncidents(req, res): 1. Parsear 'refresh'. 2. Parsear 'limit' (default 10, max 25). 3. Llamar dashboardService.getRecentIncidents(query, refresh, limit). 4. Retornar JSON.

MÉTODO exportIncidentsCsv(req, res, next):
TRATAR: 1. Llamar dashboardService.prepareIncidentsExport(req.query). 2. Configurar headers de respuesta: - Content-Type: text/csv - Content-Disposition: attachment (filename) - X-Export-Total: total records 3. Manejar error del stream (si ocurre a mitad de camino, destruir respuesta). 4. Pipear stream del servicio a res.
CAPTURAR (error): - Pasar a next(error).
