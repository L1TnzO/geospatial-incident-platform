# client/src/components/strategic/ZoneFrequencyTable.tsx

## Reference

Original File: [client/src/components/strategic/ZoneFrequencyTable.tsx](client/src/components/strategic/ZoneFrequencyTable.tsx)

## Summary

Table showing incident frequency by zone.

## Pseudocode

MÓDULO components/strategic/ZoneFrequencyTable

IMPORTAR: UI Table.

COMPONENTE ZoneFrequencyTable(props):

- PROPS: query.

- RENDER:
  - Table simple.
  - Cols: Zone Name, Count, Percentage.
  - Rows from data.zones.
