# client/src/components/MapView.tsx

## Reference

Original File: [client/src/components/MapView.tsx](client/src/components/MapView.tsx)

## Summary

Main Leaflet map controller.

## Pseudocode

MÓDULO components/MapView

IMPORTAR: react-leaflet (MapContainer, TileLayer), leaflet, stores, icons

CONSTANTES: TILE_LAYERS, SEVERITY_ORDER

COMPONENTES INTERNOS:

- SelectedIncidentPopup: Muestra popup si hay incidente seleccionado en store.
- MapAutoFocuser: Efecto para centrar mapa al seleccionar incidente.
- MapViewportTracker: Sincroniza estado del mapa con useMapStore (center, zoom, bounds).
- MapResizeHandler: Observer para redimensionar mapa.
- ControlPanel: Panel flotante con controles de zoom, capas (estaciones, infra), base layer.

COMPONENTE MapView(props):

- PROPS: incidents, stations, infrastructure, overlays, callbacks...

- ESTADO:
  - isMapReady: flag de inicialización.
  - ControlPanel expanded state (mobile/desktop).

- RENDER:
  - Contenedor relativo.
  - Card flotante con métricas de cobertura (incidents rendered vs total).
  - MapContainer (Leaflet):
    - Capas base (TileLayer).
    - Helpers (Tracker, Focuser, Resizer).
    - IncidentClusterLayer (clusters de marcadores).
    - StationLayer, InfraLayer (si visibles).
    - StrategicOverlays (Hotspots, Coverage, PriorityZones).
    - Popup incidente seleccionado.
    - Binder de referencia.
  - Overlays de carga/error/vacío.
  - Panel de Control (derecha superior):
    - Botones Zoom In/Out, Reset View.
    - Toggles para Estaciones e Infraestructura.
    - Selector de Mapa Base (Street, Topo, Satellite).
    - Toggle Leyenda.
