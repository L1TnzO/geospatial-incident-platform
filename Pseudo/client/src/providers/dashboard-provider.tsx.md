# client/src/providers/dashboard-provider.tsx

## Reference

Original File: [client/src/providers/dashboard-provider.tsx](client/src/providers/dashboard-provider.tsx)

## Summary

Proveedor de contexto para el Dashboard. Centraliza la lógica de filtros temporales (Time Range), comparaciones anuales (YoY) y estado de actividad, calculando rangos de fechas y persistiendo preferencias.

## Pseudocode

```typescript
/*
    Componente DashboardProvider
    
    Estados (con inicialización desde localStorage):
    - timeRange: '24h', '7d', etc.
    - isYoY: Booleano para comparación anual.
    - isActive: Booleano para filtrar solo activos vs históricos.
    - customDateRange: Objeto {start, end} para rango personalizado.

    Efectos de Persistencia:
    - Guardar en localStorage cambios en timeRange, isYoY, isActive.

    Lógica Derivada (useMemo - Date Range):
    1. Si timeRange es 'custom', usar customDateRange.
    2. Si no, calcular start y end relativo a 'ahora' (redondeado a 5 min para caché):
       - 24h: Ahora - 24 horas.
       - 7d, 30d: Restar días.
       - 3m: Restar 3 meses.
       - 1y: Restar 1 año.
    
    Lógica Derivada (Labels):
    - Generar etiquetas legibles para la UI según el rango seleccionado (e.g., "Last 24 Hours", "vs previous year").

    Lógica Derivada (Filters):
    - Construir objeto DashboardFilterParams combinando fechas calculadas, isActive y modo de comparación.
    
    Render:
    - Proveer DashboardContext con estados, setters y valores derivados.
*/
```
