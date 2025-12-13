# server/src/controllers/incidentsController.ts

## Reference

Original File: [server/src/controllers/incidentsController.ts](server/src/controllers/incidentsController.ts)

## Summary

Endpoints for incident management (list, create, details, map data, sync/delta).

## Pseudocode

MÓDULO incidentsController

IMPORTAR: incidentService

MÉTODO listIncidents(req, res): 1. Iniciar cronómetro (performance.now). 2. Construir opciones con incidentService.buildListOptions(req.query). 3. Llamar incidentService.listIncidents(options). 4. Retornar JSON. 5. Loguear tiempo de ejecución.

MÉTODO listMapIncidents(req, res): - Similar a listIncidents pero usa listMapIncidents. - Optimizado para GeoJSON ligero.

MÉTODO getIncidentDetail(req, res): 1. Obtener incidentNumber de req.params. 2. Llamar incidentService.getIncidentDetail. 3. Retornar JSON.

MÉTODO getIncidentMetadata(req, res): 1. Parsear flag 'refresh'. 2. Llamar incidentService.getIncidentMetadata. 3. Retornar JSON.

MÉTODO searchIncidentByNumber(req, res): 1. Llamar incidentService.searchIncidentByNumber(query.incidentNumber). 2. Retornar JSON.

MÉTODO createIncident(req, res): 1. Obtener payload de req.body. 2. Llamar incidentService.createIncident(payload). 3. Establecer status 201 (Created). 4. Establecer header Location (/api/incidents/:id). 5. Retornar JSON (detalle creado).

MÉTODO getSyncStatus(req, res): 1. Llamar incidentService.getSyncStatus(). 2. Retornar JSON.

MÉTODO getDelta(req, res): 1. Obtener parámetro 'since'. 2. Si falta, retornar 400 Bad Request. 3. Llamar incidentService.getDelta(since). 4. Retornar JSON.
