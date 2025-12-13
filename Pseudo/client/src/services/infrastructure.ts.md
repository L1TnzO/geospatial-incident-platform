# client/src/services/infrastructure.ts

## Reference

Original File: [client/src/services/infrastructure.ts](client/src/services/infrastructure.ts)

## Summary

Infrastructure API service.

## Pseudocode

MÓDULO services/infrastructure

IMPORTAR: apiClient

FUNCIÓN listInfrastructure(): - Retornar apiClient.infrastructure.list().

FUNCIÓN mapInfrastructureToUi(infra): - Extraer coordenadas [lng, lat] de geojson. - Si es inválido, retornar null. - Transformar a Objeto UI: { id, description, status, location: { lat, lng }, incidentNumber }.
