# client/src/types/api/incidents.ts

## Reference

Original File: [client/src/types/api/incidents.ts](client/src/types/api/incidents.ts)

## Summary

Interfaces detalladas para la gestión de incidentes, incluyendo listados paginados, detalles completos, creación y metadatos.

## Pseudocode

```typescript
/*
    Tipos Geoespaciales
    - GeoJsonPoint: Feature<Point> de GeoJSON.
*/

/*
    Tipos de Incidente
    - IncidentLookupValue: Código/Nombre genérico.
    - IncidentSeverity: Incluye color y prioridad.
    - IncidentListItem: Item para tablas (con tiempos, conteos).
    - IncidentMapListItem: Item ligero para pines de mapa.
    - IncidentDetail: Extiende ListItem con narrativa, metadatos y relaciones completas.
*/

/*
    Request Interfaces
    - IncidentCreateRequest: Payload para crear nuevo incidente.
*/

/*
    Response Interfaces
    - IncidentListResponse: Data paginada + Meta.
    - IncidentMapListResponse: Data paginada para mapa.
    - IncidentMetadata: Valores disponibles para filtros (tipos, severidades, rangos de fechas).
    - IncidentSyncStatus: Estado de sincronización.
*/
```
