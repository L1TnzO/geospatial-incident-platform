# client/src/hooks/useIncidentDetail.ts

## Reference

Original File: [client/src/hooks/useIncidentDetail.ts](client/src/hooks/useIncidentDetail.ts)

## Summary

Hook para obtener los detalles completos de un incidente específico por ID. Integra caché de Zustand para carga instantánea si ya se visitó.

## Pseudocode

```typescript
/*
    Hook useIncidentDetail(incidentId)
    
    1. Intentar obtener datos preliminares del store (Zustand) para placeholderData.
    2. Ejecutar useQuery:
       - Key: queryKeys.incidents.detail(id).
       - Fn: Obtener detalle (apiClient), mapear a UI, y actualizar caché del store.
       - StaleTime: 1 min.
    
    3. Efecto secundario:
       - Sincronizar estado de carga/error global en el store (setPendingIncident, setError).
    
    4. Retornar objeto query.
*/
```
