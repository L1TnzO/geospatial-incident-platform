# client/src/components/strategic/DistrictFrequentIncidentsTable.tsx

## Reference

Original File: [client/src/components/strategic/DistrictFrequentIncidentsTable.tsx](client/src/components/strategic/DistrictFrequentIncidentsTable.tsx)

## Summary

Table of high-frequency districts.

## Pseudocode

MÓDULO components/strategic/DistrictFrequentIncidentsTable

IMPORTAR: UI Table, Card, hooks/types

COMPONENTE DistrictFrequentIncidentsTable(props):

- PROPS: query.

- RENDER:
  - Loading: Table Rows skeleton.
  - Error: Alert + Retry.
  - Data: Table
    - Cols: District, Most Frequent Type, Count, Dominance %.
    - Rows: Map data.items.
