# server/src/db/types.ts

## Reference

Original File: server/src/db/types.ts

## Summary

TypeScript type definitions for the database and domain models.

## Pseudocode

MÓDULO db/types

EXPORTAR TIPOS E INTERFACES (Modelos de Dominio):

- GeoJsonPoint, GeoJsonPolygon: Wrappers de GeoJSON Feature.

- IncidentListItem: Resumen de incidente para listados.
- IncidentDetail: Extiende ListItem con arrays (unidades, assets, notas).
- StationSummary: Datos de estación y zona de respuesta.

- PaginationMeta: Metadatos de paginación (page, total, hasNext, etc).
- IncidentMetadata: Valores de referencia (tipos, severidades) y rangos.

(Solo definiciones de tipos, sin lógica de ejecución)
