# client/src/components/analytics/GeospatialAnalysis.tsx

## Reference

Original File: [client/src/components/analytics/GeospatialAnalysis.tsx](client/src/components/analytics/GeospatialAnalysis.tsx)

## Summary

Advanced map analysis with heatmaps, hotspots, and station coverage visualization.

## Pseudocode

MÓDULO components/analytics/GeospatialAnalysis

IMPORTAR: UI (Card, Switch, Select, Table), Hooks/Types, Lucide Icons

COMPONENTE GeospatialAnalysis(props):

- PROPS: incidents[], stations[].

- ESTADO:
  - Toggles: showHeatmap, showHotspots, showStationCoverage, showHighResponseZones.
  - Filtros: heatmapPeriod (7d/30d/90d/all).
  - Mapa: selectedZone, zoom, pan.

- CÁLCULOS:
  - filteredIncidents por fecha.
  - locationCounts -> hotspots (>=2 incidentes en mismo lat/lng).
  - zones (Hardcoded mock zones: Downtown, Midtown, Commercial) con métricas (count, highSeverity, avgResponse).
  - zonesWithPriority: Cálculo de índice de prioridad.
  - latLngToXY: Conversión simple para pintar en SVG relativo.

- RENDER:
  - Grid 2 columnas (Mapa SVG Principal | Panel Control Lat/Controls).
  - PANEL MAPA (SVG Interactivo):
    - Grid background patter.
    - Heatmap dots (círculos coloreados por severidad).
    - Hotspots (círculos grandes rojos).
    - Station Coverage (círculos púrpura grandes).
    - Zones coverage/highlight.
    - Iconos de Estaciones (Flame).
  - PANEL CONTROL:
    - Switches para capas.
    - Select de Periodo Heatmap.
    - Tablas resumen: Top Incident Zones, Priority Index List.
