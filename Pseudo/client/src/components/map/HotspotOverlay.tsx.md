# client/src/components/map/HotspotOverlay.tsx

## Reference

Original File: [client/src/components/map/HotspotOverlay.tsx](client/src/components/map/HotspotOverlay.tsx)

## Summary

Heatmap or grid overlay for incident density.

## Pseudocode

MÓDULO components/map/HotspotOverlay

IMPORTAR: React-Leaflet (GeoJSON, LayerGroup).

COMPONENTE HotspotOverlay(props):

- PROPS: cells[], isVisible, intensityExponent.

- TRANSFORMACIÓN:
  - useMemo data: Convertir cells -> FeatureCollection GeoJSON.

- STYLE FUNCTION (feature):
  - Calcula scaledIntensity (pow(intensity, exponent)).
  - Color hue: 60 (yellow) -> 0 (red) según intensity.
  - Opacity varìa con priorityZonesVisible.

- ON EACH FEATURE:
  - bindTooltip con stats (Count, Most Frequent Type, Intensity %).

- RENDER:
  - LayerGroup.
  - GeoJSON component (data, style, onEachFeature).
