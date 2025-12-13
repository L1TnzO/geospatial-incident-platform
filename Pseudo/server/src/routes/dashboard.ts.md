# server/src/routes/dashboard.ts

## Reference

Original File: server/src/routes/dashboard.ts

## Summary

Dashboard routes definition.

## Pseudocode

MÓDULO routes/dashboard

ROUTER Express

DEFINICIÓN DE RUTAS:

- GET /kpi/last-24h -> dashboardController.getLast24HoursKpi
- GET /incidents/by-type -> dashboardController.getIncidentsByType
- GET /incidents/daily-trend -> dashboardController.getDailyTrend
- GET /incidents/severity-distribution -> dashboardController.getSeverityDistribution
- GET /incidents/recent -> dashboardController.getRecentIncidents
- GET /export -> dashboardController.exportIncidentsCsv

EXPORTAR router
