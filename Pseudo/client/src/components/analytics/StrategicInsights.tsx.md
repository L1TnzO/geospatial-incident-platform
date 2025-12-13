# client/src/components/analytics/StrategicInsights.tsx

## Reference

Original File: [client/src/components/analytics/StrategicInsights.tsx](client/src/components/analytics/StrategicInsights.tsx)

## Summary

Strategic insights dashboard component.

## Pseudocode

MÓDULO components/analytics/StrategicInsights

IMPORTAR: Recharts (Line, Bar), UI Components.

COMPONENTE StrategicInsights(props):

- PROPS: incidents[].
- ESTADO: selectedIncidentType.

- CÁLCULOS KPI:
  - Compliance Rate (< 5 min response).
  - Severity Change Rate (comparación vs 30 días previos).
  - Monthly Data (agrupación por mes para gráfico de líneas).
  - Quarterly Data (agrupación trimestral para barras).
  - Projection (estimación lineal simple para Q1 prox año).
  - Station Performance (Mock table).

- RENDER:
  - KPI Cards (Compliance %, Change Rate %).
  - Gráfico Annual Trend (LineChart) con filtro de tipo.
  - Gráficos Quarterly (Comparison & Projection).
  - Tabla de Desempeño por Estación.
