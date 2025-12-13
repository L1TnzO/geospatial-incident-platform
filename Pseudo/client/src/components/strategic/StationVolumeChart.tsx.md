# client/src/components/strategic/StationVolumeChart.tsx

## Reference

Original File: [client/src/components/strategic/StationVolumeChart.tsx](client/src/components/strategic/StationVolumeChart.tsx)

## Summary

Chart showing incident volume per station.

## Pseudocode

MÓDULO components/strategic/StationVolumeChart

IMPORTAR: UI Card, SVG.

COMPONENTE StationVolumeChart(props):

- PROPS: data (station volume), loading states.

- PRE-PROCESAMIENTO:
  - sortedStations: Top 10 by count.
  - maxCount for scaling.

- RENDER:
  - SVG Container.
  - Grid vertical lines.
  - Per Station Row:
    - Label (Station Name).
    - Bar Rect (Count width).
    - Value text.
  - X-Axis Label "Incident Count".
