# client/src/components/analytics/TacticalOverview.tsx

## Reference

Original File: [client/src/components/analytics/TacticalOverview.tsx](client/src/components/analytics/TacticalOverview.tsx)

## Summary

Tactical overview component.

## Pseudocode

MÓDULO components/analytics/TacticalOverview

IMPORTAR: Recharts, UI Cards.

COMPONENTE TacticalOverview(props):

- PROPS: incidents[].

- CÁLCULOS:
  - Last 24h count.
  - Avg Response Time local.
  - Incidents by Type, TimeSlot, Severity.
  - Daily Trend (últimos 7 días).
  - Lista Recent Incidents.

- RENDER:
  - 3 KPI Cards (Last 24h, Avg Response, Total).
  - Fila Gráficos 1: By Type (Bar), Daily Trend (Line).
  - Fila Gráficos 2: Severity (Pie), Time Slot (Bar).
  - Lista scrollable de incidentes recientes.
