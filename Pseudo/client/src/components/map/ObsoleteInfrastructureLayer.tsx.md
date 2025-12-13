# client/src/components/map/ObsoleteInfrastructureLayer.tsx

## Reference

Original File: [client/src/components/map/ObsoleteInfrastructureLayer.tsx](client/src/components/map/ObsoleteInfrastructureLayer.tsx)

## Summary

Markers for old infrastructure.

## Pseudocode

MÓDULO components/map/ObsoleteInfrastructureLayer

IMPORTAR: React-Leaflet, Leaflet L.

COMPONENTE ObsoleteInfrastructureLayer(props):

- PROPS: infrastructure[], isVisible.
- ESTADO: zoom actual.

- HELPER getZoomBasedSize(zoom):
  - Invisible < 10.
  - Linear scaling 10-15.

- RENDER:
  - Si size == 0 -> null.
  - LayerGroup.
  - Map infrastructure items:
    - Marker (Icono Building 🏛️ + Fire 🔥 si Burned).
    - Popup con metadata (Code, Desc, Status).
