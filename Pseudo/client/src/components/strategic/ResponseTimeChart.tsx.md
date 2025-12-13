# client/src/components/strategic/ResponseTimeChart.tsx

## Reference

Original File: [client/src/components/strategic/ResponseTimeChart.tsx](client/src/components/strategic/ResponseTimeChart.tsx)

## Summary

Visualization of response times.

## Pseudocode

MÓDULO components/strategic/ResponseTimeChart

IMPORTAR: UI Card, SVG elements.

COMPONENTE ResponseTimeChart(props):

- PROPS: data (metrics), loading states.

- PRE-PROCESAMIENTO:
  - sortedGroups: Top 15 worst performers (highest avg seconds).
  - Escala dinamica X-Axis (minSeconds, maxSeconds).

- RENDER:
  - SVG Container.
  - Grid vertical lines.
  - Per Group Row:
    - Label (Station/Zone Name) truncate.
    - Bar Rect (Avg Time).
    - Whisker Line (P90 Time).
    - Connector Line (Avg -> P90).
    - Value text label.
  - Legend footer describing metrics (Avg, P90, Insufficient sample).
