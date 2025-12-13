# client/src/components/map/CoverageOverlay.tsx

## Reference

Original File: [client/src/components/map/CoverageOverlay.tsx](client/src/components/map/CoverageOverlay.tsx)

## Summary

Visualizes coverage gaps.

## Pseudocode

MÓDULO components/map/CoverageOverlay

IMPORTAR: React-Leaflet, Leaflet L.

COMPONENTE CoverageOverlay(props):

- PROPS: features[], isVisible, enabledStations, priorityZonesVisible.
- HOOK: useMap.

- EFECTO (Render Layer):
  - Si !isVisible o no features -> return.
  - Crea layerGroup.
  - Itera features:
    - Si station not enabled -> skip.
    - Determina color Y estado según incidentCount (Green < 20 < Amber < 50 < Red).
    - Crea L.geoJSON polygon.
    - setStyle (fillOpacity, color, dashArray si Inactive).
    - bindTooltip (HTML con Station info + Status).
    - addTo(layerGroup).
  - addTo(map).
  - Cleanup: removeLayer.

- RENDER: null (todo es efecto lateral Leaflet).
