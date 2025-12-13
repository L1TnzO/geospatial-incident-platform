# client/src/components/dashboard/DashboardTypeDistributionChart.tsx

## Reference

Original File: [client/src/components/dashboard/DashboardTypeDistributionChart.tsx](client/src/components/dashboard/DashboardTypeDistributionChart.tsx)

## Summary

Chart for incident types.

## Pseudocode

MÓDULO components/dashboard/DashboardTypeDistributionChart

IMPORTAR: Recharts (BarChart vertical), UI Card

COMPONENTE DashboardTypeDistributionChart(props):

- PROPS: distributionQuery.

- TRANSFORMACIÓN:
  - Map buckets -> chartData (name, count, percentage).

- RENDER:
  - Loading/Error states.
  - Card:
    - Title.
    - Horizontal BarChart (Layout vertical).
    - Ejes ocultos o minimalistas.
    - Tooltip con conteo y porcentaje.
    - Fondo de barras.
