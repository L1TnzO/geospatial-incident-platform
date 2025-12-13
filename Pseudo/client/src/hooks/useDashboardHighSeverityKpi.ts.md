# client/src/hooks/useDashboardHighSeverityKpi.ts

## Reference

Original File: [client/src/hooks/useDashboardHighSeverityKpi.ts](client/src/hooks/useDashboardHighSeverityKpi.ts)

## Summary

Wrapper sobre useDashboardLast24HoursKpi que pre-aplica filtros para calcular KPIs específicos de incidentes de alta severidad.

## Pseudocode

```typescript
/*
    Hook useDashboardHighSeverityKpi(filters, options)
    
    1. Crear highSeverityFilters modificando el parámetro de entrada:
       - severityCodes: ['HIGH', 'CRITICAL', 'SEVERE'].
    2. Llamar y retornar useDashboardLast24HoursKpi(highSeverityFilters, options).
*/
```
