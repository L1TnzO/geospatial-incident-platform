# server/src/db/repositories/infrastructureRepository.ts

## Reference

Original File: [server/src/db/repositories/infrastructureRepository.ts](server/src/db/repositories/infrastructureRepository.ts)

## Summary

Data access for obsolete infrastructure items.

## Pseudocode

MÓDULO infrastructureRepository

CLASE InfrastructureRepository
MÉTODO listInfrastructure(): 1. Query a tabla 'obsolete_infrastructure'. 2. Join opcional con incidents (si aplica). 3. Seleccionar columnas + Geometría (ST_AsGeoJSON). 4. Ejecutar query. 5. Mapear resultados; parsear GeoJSON a objetos geométricos. 6. Retornar lista de ObsoleteInfrastructure.
