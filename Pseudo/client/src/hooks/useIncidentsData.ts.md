# client/src/hooks/useIncidentsData.ts

## Reference

Original File: [client/src/hooks/useIncidentsData.ts](client/src/hooks/useIncidentsData.ts)

## Summary

Hooks principales para la gestión de datos de incidentes.

1. `useIncidentsData`: Simplificado, para componentes que necesitan una lista filtrada (como el mapa).
2. `useIncidentsTableData`: Avanzado, para la tabla, incluyendo soporte de paginación y ordenamiento del lado del cliente.
   Ambos hooks se suscriben al repositorio local (`incidentRepository`) para mantener los datos sincronizados.

## Pseudocode

```typescript
/*
    Hook useIncidentsTableData(params)
    
    1. Reutilizar datos del repositorio (incidentRepository).
    2. Recargar datos al montar y sincronizar (sync) en segundo plano.
    3. Filtrado (useMemo): Aplicar filtros por fecha y estado activo.
    4. Ordenamiento (useMemo): Ordenar filteredData en cliente según params.sortBy y params.sortDirection.
    5. Paginación (useMemo): Cortar array segun page y pageSize.
    6. Suscripción: Suscribirse a cambios del repo para actualizar estado local.
    
    Retorno:
    - incidents: Array paginado.
    - pagination: Metadatos (total, pages, hasNext, etc.).
    - func refresh() para disparar sync manual.
*/

/*
    Hook useIncidentsData(params)
    
    1. Carga inicial desde repositorio.
    2. Filtrado básico (fechas/estado) derivado del repo.
    3. Suscripción a cambios del repositorio.
    
    Retorno:
    - incidents: Array filtrado completo (hasta renderLimit).
    - totalCount, renderedCount.
*/
```
