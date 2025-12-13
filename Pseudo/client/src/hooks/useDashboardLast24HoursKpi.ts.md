# client/src/hooks/useDashboardLast24HoursKpi.ts

## Reference

Original File: [client/src/hooks/useDashboardLast24HoursKpi.ts](client/src/hooks/useDashboardLast24HoursKpi.ts)

## Summary

Hook para obtener los KPIs principales del dashboard (últimas 24h vs periodo anterior).

## Pseudocode

```typescript
/*
    Hook useDashboardLast24HoursKpi(filters, options)
    
    1. Preparar parámetros de query.
    2. Ejecutar useQuery:
       - Key: queryKeys.dashboard.kpiLast24Hours.
       - Fn: fetchLast24HoursKpi.
    3. Retornar resultado + función refresh.
*/
```
