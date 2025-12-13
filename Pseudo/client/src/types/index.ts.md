# client/src/types/index.ts

## Reference

Original File: [client/src/types/index.ts](client/src/types/index.ts)

## Summary

Definiciones de tipos principales para las entidades de dominio centrales de la aplicación, como Incidentes, Estaciones y Usuarios.

## Pseudocode

```typescript
/*
    Interface Incident
    Representación completa de un incidente.
    - Propiedades clave: id, type, severity, location (lat, lng, address), status, units, assets, notes.
*/

/*
    Interface LiteIncident
    Versión ligera de Incident optimizada para listados y mapas (sin arrays anidados pesados).
    - Excluye: narrative, metadata, units, assets, notes, history.
*/

/*
    Interface FireStation
    Representación básica de una estación de bomberos.
*/

/*
    Interface ObsoleteInfrastructure
    Representación de infraestructura obsoleta reportada.
*/

/*
    Interface User
    Usuario del sistema con rol ('admin' | 'viewer').
*/

/*
    Interfaces Auxiliares
    - IncidentUnitSummary: Resumen de unidad asignada.
    - IncidentAssetSummary: Resumen de activo asignado.
    - IncidentNoteSummary: Nota asociada a incidente.
*/
```
