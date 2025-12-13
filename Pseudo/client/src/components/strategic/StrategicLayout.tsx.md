# client/src/components/strategic/StrategicLayout.tsx

## Reference

Original File: [client/src/components/strategic/StrategicLayout.tsx](client/src/components/strategic/StrategicLayout.tsx)

## Summary

Layout for the strategic view.

## Pseudocode

MÓDULO components/strategic/StrategicLayout

IMPORTAR: Todos los subcomponentes Strategic, MapView, Hooks de datos y preferencias.

COMPONENTE StrategicLayout(props):

- HOOKS GENERALES: useDashboard (filtros), useMapPreferencesStore.
- HOOKS DATA: useStrategic... (Projections, Trends, Hotspots, PriorityZones, etc).
- WORKER: Instanciación de worker local para clustering en mapa.

- ESTADO: highlightedZone (para hacer zoom a una zona desde el panel de prioridades).

- HANDLERS:
  - handleViewOnMap: Setea highlightedZone, activa overlay priorityZones, hace scroll al mapa y setView. Automáticamente limpia highlight tras 8s.

- RENDER:
  - Header flotante (Sticky) con Select de Time Range.
  - Título Principal.
  - Grid Layout (3 columnas responsive):
    - ResponseTimeChart.
    - PriorityZonesPanel.
    - StrategicTimeOfDayChart.
    - ZoneFrequencyTable.
    - StationVolumeChart.
    - HighResponseTimeZones.
    - IncidentProjectionTable.
    - DistrictFrequentIncidentsTable.
  - MapView Container (si !hideMap):
    - Pasa overlays calculados (hotspots, priorityZones).
    - Pasa worker instance.
  - Botones de Control de Overlays (Toggle Incidents, Hotspots, Coverage, Priority).
