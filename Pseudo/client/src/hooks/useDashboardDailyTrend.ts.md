# client/src/hooks/useDashboardDailyTrend.ts

## Reference

Original File: [client/src/hooks/useDashboardDailyTrend.ts](client/src/hooks/useDashboardDailyTrend.ts)

## Summary

Hook para obtener los datos del gráfico de tendencia diaria del dashboard.

## Pseudocode

```typescript
/*
    Hook useDashboardDailyTrend(filters, options)
    
    1. Extraer refresh y parámetros de filtros.
    2. Ejecutar useQuery:
       - Key: queryKeys.dashboard.dailyTrend(params).
       - Fn: fetchDailyTrend (dashboard-service).
    3. Exponer función refresh(bypassCache) para forzar recarga.
    4. Retornar query result + refresh + lastUpdated.
*/
```
