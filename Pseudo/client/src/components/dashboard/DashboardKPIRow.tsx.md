# client/src/components/dashboard/DashboardKPIRow.tsx

## Reference

Original File: [client/src/components/dashboard/DashboardKPIRow.tsx](client/src/components/dashboard/DashboardKPIRow.tsx)

## Summary

Layout component for a row of KPI cards.

## Pseudocode

MÓDULO components/dashboard/DashboardKPIRow

IMPORTAR: DashboardKPICard

COMPONENTE DashboardKPIRow(props):

- PROPS: Queries para KPIs (General y HighSeverity).

- RENDER:
  - Header Texto.
  - Grid con 2 instancias de DashboardKPICard (Incidents Totales, High Severity).
