# client/src/layouts/DashboardLayout.tsx

## Reference

Original File: [client/src/layouts/DashboardLayout.tsx](client/src/layouts/DashboardLayout.tsx)

## Summary

Layout principal para el Dashboard. Gestiona el estado global del dashboard (filtros, rango de tiempo) a través de un DashboardProvider y organiza la visualización de KPIs, gráficos y listas de incidentes.

## Pseudocode

```typescript
/*
    Componente DashboardHeader
    Propósito: Renderizar los controles globales del dashboard (Checkbox YoY y Selector de Rango de Tiempo).
    
    Variables de Estado (desde useDashboard):
    - timeRange, setTimeRange: Rango de tiempo seleccionado.
    - isYoY, setIsYoY: Booleano para modo "Year over Year" (comparación anual).

    Render:
    1. Contenedor sticky en la parte superior.
    2. Checkbox "Compare to Last Year":
       - Vinculado a isYoY.
       - Al cambiar, llamar a setIsYoY.
    3. Select "Time Range":
       - Vinculado a timeRange.
       - Al cambiar, llamar a setTimeRange.
       - Opciones: 24h, 7d, 30d, 3m, 1y.
*/

/*
    Componente DashboardContent
    Propósito: Contenedor principal del contenido del dashboard. Consume contextos y carga datos.
    Props:
    - className: Estilos opcionales.

    Hooks y Datos:
    1. Obtener filtros y etiquetas desde useDashboard (filters, timeRangeLabel, etc.).
    2. Inicializar consultas (Queries) pasando los filtros actuales:
       - kpiQuery: Datos para KPIs principales (últimas 24h).
       - highSeverityKpiQuery: KPIs de alta severidad.
       - typeDistributionQuery: Prevalencia por tipo.
       - severityDistributionQuery: Distribución por severidad.
       - dailyTrendQuery: Tendencia diaria.
       - recentIncidentsQuery: Incidentes recientes (límite 20).

    Render:
    1. Contenedor principal con scroll.
    2. DashboardHeader: Controles superiores.
    3. Sección KPI:
       - Componente DashboardKPIRow con los datos de las queries.
    4. Sección Gráficos (Grid):
       - DashboardTypeDistributionChart (Tipos).
       - DashboardSeverityDistributionChart (Severidad).
    5. Sección Tendencia:
       - DashboardDailyTrendChart (Tendencia diaria).
    6. Sección Incidentes Recientes:
       - DashboardRecentIncidents (Tabla/Lista).
*/

/*
    Componente Default DashboardLayout
    Propósito: Punto de entrada del layout.
    
    Render:
    1. Envolver todo en DashboardProvider para proveer contexto.
    2. Renderizar DashboardContent.
*/
```
