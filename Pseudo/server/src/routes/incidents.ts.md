# server/src/routes/incidents.ts

## Reference

Original File: server/src/routes/incidents.ts

## Summary

Incident routes definition.

## Pseudocode

MÓDULO routes/incidents

ROUTER Express

DEFINICIÓN DE RUTAS:

- GET /meta -> incidentsController.getIncidentMetadata
- GET /sync-status -> incidentsController.getSyncStatus
- GET /delta -> incidentsController.getDelta
- GET /search -> incidentsController.searchIncidentByNumber
- POST / -> incidentsController.createIncident
- GET /map -> incidentsController.listMapIncidents
- GET / -> incidentsController.listIncidents
- GET /:incidentNumber -> incidentsController.getIncidentDetail

EXPORTAR router
