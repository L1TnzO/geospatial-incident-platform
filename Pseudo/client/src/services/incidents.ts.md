# client/src/services/incidents.ts

## Reference

Original File: [client/src/services/incidents.ts](client/src/services/incidents.ts)

## Summary

Incident API service.

## Pseudocode

MÓDULO services/incidents

IMPORTAR: apiClient, utils/incident-mapper

FUNCIÓN listIncidents(options): - Retornar apiClient.incidents.list(options).

FUNCIÓN getIncidentMetadata(): - Retornar apiClient.incidents.metadata().

RE-EXPORTAR: mapIncidentToUi, mapIncidentDetailToUi (desde mapper)
