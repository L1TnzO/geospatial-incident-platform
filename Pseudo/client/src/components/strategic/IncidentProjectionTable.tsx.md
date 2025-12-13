# client/src/components/strategic/IncidentProjectionTable.tsx

## Reference

Original File: [client/src/components/strategic/IncidentProjectionTable.tsx](client/src/components/strategic/IncidentProjectionTable.tsx)

## Summary

Future incident predictions.

## Pseudocode

MÓDULO components/strategic/IncidentProjectionTable

IMPORTAR: UI Table, Card, Icons.

COMPONENTE IncidentProjectionTable(props):

- PROPS: query.

- CÁLCULO:
  - Determine isPositiveTrend (slope > 0).

- RENDER:
  - Card Header:
    - Badge Trend Direction (Rising/Falling).
    - Badge Seasonality Adjusted (si aplica).
    - Description with regression formula info.
  - Table:
    - Rows: Time Horizon (e.g. Next Month, Q3), Projected Count.
