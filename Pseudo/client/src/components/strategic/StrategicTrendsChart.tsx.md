# client/src/components/strategic/StrategicTrendsChart.tsx

## Reference

Original File: [client/src/components/strategic/StrategicTrendsChart.tsx](client/src/components/strategic/StrategicTrendsChart.tsx)

## Summary

Chart showing strategic trends over time.

## Pseudocode

MÓDULO components/strategic/StrategicTrendsChart

IMPORTAR: SVG Custom Chart logic, Date-fns.

COMPONENTE StrategicTrendsChart(props):

- PROPS: data, trendType (daily/monthly), previousPoints, onPeriodClick, onTypeChange.

- NORMALIZACIÓN:
  - useMemo normalizedData: Unifica estructura de Daily y Monthly responses a formato común { series: [{label, count, start...}], totals: {...} }.
  - Heurística isHourly para data diaria granular.

- PUNTOS GRAFICOS:
  - Calculate X/Y coords para main series.
  - Calculate X/Y coords para previousPoints (Ghost line alias).

- RENDER:
  - Header con Checkbox "Show Previous Period" y Select Incident Type.
  - Big Number Total + Badge Change %.
  - SVG Chart:
    - Ghost Line (Previous) dashed.
    - Main Line solid.
    - Interactive Circles (Click handler -> onPeriodClick).
    - X-Axis/Y-Axis labels custom drawn.
  - Legend footer.
