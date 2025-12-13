# client/src/types/api/dashboard.ts

## Reference

Original File: [client/src/types/api/dashboard.ts](client/src/types/api/dashboard.ts)

## Summary

Interfaces de solicitud y respuesta para los endpoints del Dashboard Operativo.

## Pseudocode

```typescript
/*
    Request Interfaces
    - DashboardFilterParams: Filtros base (fechas, tipos, severidad, estado, isActive, compare).
    - DashboardRecentIncidentsParams: Extiende filtros + límite.
    - DashboardExportParams: Extiende filtros + opciones de ordenamiento y columnas.
*/

/*
    Response Interfaces
    - Last24HoursKpiResponse: KPIs de últimas 24h comparado con ventana anterior (delta, porcentaje).
    - TypeDistributionResponse: Desglose porcentual por tipo de incidente.
    - SeverityDistributionResponse: Desglose porcentual por severidad.
    - DailyTrendResponse: Puntos de tendencia diaria y resumen de cambios.
    - RecentIncidentsResponse: Lista de incidentes recientes simplificados.
    - DashboardExportResult: Resultado de exportación (URL blob).
*/
```
