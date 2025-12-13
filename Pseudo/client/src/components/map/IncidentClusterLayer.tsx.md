# client/src/components/map/IncidentClusterLayer.tsx

## Reference

Original File: [client/src/components/map/IncidentClusterLayer.tsx](client/src/components/map/IncidentClusterLayer.tsx)

## Summary

Renders clustered incident markers.

## Pseudocode

MÓDULO components/map/IncidentClusterLayer

IMPORTAR: React-Leaflet (Marker, Popup), Worker Types.

COMPONENTE IncidentClusterLayer(props):

- PROPS: incidents, onIncidentClick, worker.
- HOOK: useMap, useState clusters.

- UTILS:
  - getClusterSize(count): Logarithmic scale (28px -> 65px).
  - createClusterIcon: L.divIcon con count.
  - createIncidentIcon: L.divIcon con severity color CSS var.

- EFECTO DE WORKER:
  - Escucha eventos 'moveend', 'zoomend' del mapa.
  - Envia mensaje 'GET_CLUSTERS' al worker con bbox y zoom.
  - Escucha mensaje 'CLUSTERS_CALCULATED' del worker -> setClusters.

- RENDER:
  - Itera clusters state:
    - Si es cluster -> Marker con ClusterIcon.
      - Click -> map.setView (zoom in).
    - Si es punto unico -> Marker con IncidentIcon.
      - Click -> zoom to point.
      - Popup -> IncidentPopup component.
