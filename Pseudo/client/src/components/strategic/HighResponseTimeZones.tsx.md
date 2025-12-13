# client/src/components/strategic/HighResponseTimeZones.tsx

## Reference

Original File: [client/src/components/strategic/HighResponseTimeZones.tsx](client/src/components/strategic/HighResponseTimeZones.tsx)

## Summary

Analysis of slow response areas.

## Pseudocode

MÓDULO components/strategic/HighResponseTimeZones

IMPORTAR: UI Table, Card, Switch.

COMPONENTE HighResponseTimeZones(props):

- PROPS: query.
- ESTADO: useAllTime (toggle global vs period average).

- CÁLCULOS:
  - globalAverage: (allTimeAverageSeconds vs globalAverageSeconds).
  - highResponseZones: Filter groups where avgSeconds > globalAverage. Sort descendente.

- RENDER:
  - Card Header con Switch "Global Avg".
  - Table:
    - Rows: Zone Name, Avg Time (mm:ss), Diff (+mm:ss, %).
    - Highlight red for huge diffs.
