# client/src/hooks/useDashboardRecentIncidents.ts

## Reference

Original File: [client/src/hooks/useDashboardRecentIncidents.ts](client/src/hooks/useDashboardRecentIncidents.ts)

## Summary

Hook para obtener la lista de incidentes recientes para el dashboard.

## Pseudocode

```typescript
/*
    Hook useDashboardRecentIncidents(filters, options)
    
    1. Extraer límite (default 10) y filtros.
    2. Ejecutar useQuery:
       - Key: queryKeys.dashboard.recentIncidents.
       - Fn: fetchRecentIncidents.
    3. Retornar resultado + refresh.
*/
```
