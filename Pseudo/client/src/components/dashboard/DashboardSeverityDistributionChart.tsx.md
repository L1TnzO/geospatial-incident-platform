# client/src/components/dashboard/DashboardSeverityDistributionChart.tsx

## Reference

Original File: [client/src/components/dashboard/DashboardSeverityDistributionChart.tsx](client/src/components/dashboard/DashboardSeverityDistributionChart.tsx)

## Summary

Bar/Pie chart for severity breakdown.

## Pseudocode

MÓDULO components/dashboard/DashboardSeverityDistributionChart

IMPORTAR: Recharts (PieChart), UI Card

COMPONENTE DashboardSeverityDistributionChart(props):

- PROPS: distributionQuery, timeRangeLabel.

- TRANSFORMACIÓN:
  - Map buckets -> chartData (name, value, color from backend).

- RENDER:
  - Loading/Error states.
  - Empty state.
  - Card:
    - Title + Total Count subtitle.
    - Recharts PieChart (Donut style).
    - Tooltips y Legend.
