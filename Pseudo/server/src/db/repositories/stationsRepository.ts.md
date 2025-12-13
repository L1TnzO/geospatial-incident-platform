# server/src/db/repositories/stationsRepository.ts

## Reference

Original File: [server/src/db/repositories/stationsRepository.ts](server/src/db/repositories/stationsRepository.ts)

## Summary

Data access for fire stations and their response zones.

## Pseudocode

MÓDULO stationsRepository

CLASE StationRepository
MÉTODO listStations(filters): 1. Query base a 'stations'. 2. Join 'response_zones'. 3. Si filters.isActive está definido, filtrar por is_active. 4. Seleccionar datos + Geometrías (Ubicación y Zona Resumida). 5. Ejecutar query. 6. Mapear filas a StationSummary (incluyendo parseo de GeoJSON anidado). 7. Retornar lista.
