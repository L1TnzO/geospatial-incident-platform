MÓDULO components/LocationPickerMap

IMPORTAR: React-Leaflet, store incident-create-store.

COMPONENTE LocationPickerMap:

- SUBCOMPONENTE LocationMarker:
  - useMapEvents -> click handler -> setCoordinates store.
  - Renderiza Marker si coordinates existen.

- SUBCOMPONENTE MapResizeHandler:
  - ResizeObserver del container -> map.invalidateSize().

- RENDER:
  - MapContainer (Leaflet).
  - TileLayer.
  - LocationMarker.
  - MapResizeHandler.
