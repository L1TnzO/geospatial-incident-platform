# client/src/components/strategic/StrategicTimeOfDayChart.tsx

## Reference

Original File: [client/src/components/strategic/StrategicTimeOfDayChart.tsx](client/src/components/strategic/StrategicTimeOfDayChart.tsx)

## Summary

Analysis of incidents by time of day.

## Pseudocode

MÓDULO components/strategic/StrategicTimeOfDayChart

IMPORTAR: Recharts (BarChart Vertical).

COMPONENTE StrategicTimeOfDayChart(props):

- PROPS: query.

- DATA:
  - Transformar data flat (morning, afternoon, night) a array [{name: 'Morning', count: ...}, ...].

- RENDER:
  - Vertical BarChart.
  - Categories: Morning (06-12), Afternoon (12-20), Night (20-06).
  - Tooltip simple.
