# client/src/components/dashboard/DashboardKPICard.tsx

## Reference

Original File: [client/src/components/dashboard/DashboardKPICard.tsx](client/src/components/dashboard/DashboardKPICard.tsx)

## Summary

Reusable KPI display widget.

## Pseudocode

MÓDULO components/dashboard/DashboardKPICard

IMPORTAR: UI Card, Skeleton, Intl Formatters

COMPONENTE DashboardKPICard(props):

- PROPS: kpiQuery, title, description, comparisonLabel.

- LOGICA:
  - Determinar dirección tendencia (up/down/flat).
  - Formatear delta y porcentajes.
  - Elegir color (variant) según dirección y contexto (subir incidentes es malo -> destructive).

- RENDER:
  - Loading: Skeletons.
  - Error: Alert.
  - Data:
    - Título.
    - Gran número (Current Count).
    - Badge con flecha y % cambio.
    - Comparación texto (vs previous period).
    - Footer "Last updated".
