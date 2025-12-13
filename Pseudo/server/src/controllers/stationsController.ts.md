# server/src/controllers/stationsController.ts

## Reference

Original File: [server/src/controllers/stationsController.ts](server/src/controllers/stationsController.ts)

## Summary

Endpoints for retrieving station data and coverage.

## Pseudocode

MÓDULO stationsController

IMPORTAR: stationRepository

MÉTODO AUXILIAR parseBoolean(val): - Normaliza string/boolean array a boolean.

MÉTODO listStations(req, res): 1. Parsear filtro isActive si existe. 2. Llamar stationRepository.listStations({ isActive }). 3. Retornar JSON { data: stations }.
