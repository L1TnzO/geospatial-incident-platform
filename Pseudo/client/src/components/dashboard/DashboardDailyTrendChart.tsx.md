# client/src/components/dashboard/DashboardDailyTrendChart.tsx

## Reference

Original File: [client/src/components/dashboard/DashboardDailyTrendChart.tsx](client/src/components/dashboard/DashboardDailyTrendChart.tsx)

## Summary

Line chart for daily incident frequency.

## Pseudocode

MÓDULO components/dashboard/DashboardDailyTrendChart

IMPORTAR: UI Components, hooks (date-fns, provider)

COMPONENTE DashboardDailyTrendChart(props):

- PROPS: trendQuery, comparisonLabel, timeRange, isYoY.

- CALCULADOS:
  - isHourly: True si timeRange="24h" o diff entre puntos < 24h.
  - calculateWindows: Determina fechas start/end de periodo actual y previo.
  - points, trend: Datos extraídos de la query.
  - svgPoints: Mapeo de valores (fecha, conteo) a coordenadas X/Y para SVG.
- HANDLERS:
  - handlePointClick: Drill-down on click (si no es hourly).
  - handleRefresh.
- RENDER:
  - Estado Loading (Skeletons).
  - Estado Error (Alert + Retry).
  - Estado Empty.
  - Chart Card:
    - Titulo + Descripción (Total incidents).
    - Checkbox 'Compare' (si no es hourly).
    - SVG Chart Container:
      - Gradient Defs.
      - Area Path (relleno).
      - Previous Period Line (punteada, si activado).
      - Main Line.
      - Puntos interactivos (Circles).
    - Trend Summary Footer (Badge delta, porcentajes).
