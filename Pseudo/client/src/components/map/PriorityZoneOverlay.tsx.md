# client/src/components/map/PriorityZoneOverlay.tsx

## Reference

Original File: [client/src/components/map/PriorityZoneOverlay.tsx](client/src/components/map/PriorityZoneOverlay.tsx)

## Summary

Displays high-priority areas.

## Pseudocode

MÓDULO components/map/PriorityZoneOverlay

IMPORTAR: React-Leaflet, Leaflet L.

COMPONENTE PriorityZoneOverlay(props):

- PROPS: zones[], isVisible, highlightedZone.
- HOOK: useMap.

- EFECTO:
  - Filter top zones (score >= 0.6).
  - Itera zones:
    - Color según Score (Green < ... < Red).
    - Style overrides si isHighlighted (Thicker stroke, opacity 1, dashArray).
    - L.geoJSON polygon.
    - Bind Tooltip (permanent si highlighted).
  - Add to map.

- RENDER: null.
