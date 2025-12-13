# client/src/components/map/StationLayer.tsx

## Reference

Original File: [client/src/components/map/StationLayer.tsx](client/src/components/map/StationLayer.tsx)

## Summary

Renders stations and their coverage radius/zones.

## Pseudocode

MÓDULO components/map/StationLayer

IMPORTAR: React-Leaflet, Leaflet L.

COMPONENTE StationLayer(props):

- PROPS: stations[], isVisible.
- ESTADO: zoom.

- LOGIC:
  - getZoomBasedSize (Invisible < 9).
  - Icon: 🚒 emoji in DivIcon.

- RENDER:
  - LayerGroup.
  - Markers at station locations.
  - Popup with basic station info.
