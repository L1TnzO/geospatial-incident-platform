import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { CoverageBufferFeature } from '../../types/api/strategic';

interface CoverageOverlayProps {
  features: CoverageBufferFeature[];
  isVisible: boolean;
  enabledStations?: Set<string>;
  priorityZonesVisible?: boolean;
}

export function CoverageOverlay({
  features,
  isVisible,
  enabledStations,
  priorityZonesVisible = false,
}: CoverageOverlayProps) {
  const map = useMap();

  useEffect(() => {
    if (!isVisible || features.length === 0) {
      return;
    }

    const layerGroup = L.layerGroup();

    features.forEach((feature) => {
      const stationCode = feature.properties.stationCode;

      // Only render if station is enabled (or if no filter is set)
      if (enabledStations && !enabledStations.has(stationCode)) {
        return;
      }

      // Determine coverage status color
      const incidentCount = feature.properties.incidentCount;
      const isActive = feature.properties.isActive;

      let color: string;
      let status: string;

      if (!isActive) {
        color = '#6b7280'; // gray
        status = 'Inactive';
      } else if (incidentCount > 50) {
        color = '#dc2626'; // red - high demand
        status = 'High demand';
      } else if (incidentCount > 20) {
        color = '#f59e0b'; // amber - moderate
        status = 'Moderate';
      } else {
        color = '#10b981'; // green - adequate
        status = 'Adequate';
      }

      if (feature.geometry?.coordinates) {
        const polygon = L.geoJSON(
          {
            type: 'Feature',
            geometry: feature.geometry as GeoJSON.Polygon,
            properties: {},
          } as GeoJSON.Feature<GeoJSON.Polygon>,
          {
            style: {
              color: color,
              fillColor: color,
              fillOpacity: priorityZonesVisible ? 0.03 : 0.15,
              weight: priorityZonesVisible ? 0.5 : 2,
              opacity: priorityZonesVisible ? 0.15 : 0.6,
              dashArray: isActive ? undefined : '5, 5',
            },
          },
        );

        polygon.bindTooltip(
          `<div>
            <strong>${feature.properties.stationName}</strong><br/>
            Code: ${feature.properties.stationCode}<br/>
            Status: ${status}<br/>
            Coverage radius: ${(feature.properties.radiusMeters / 1000).toFixed(1)} km<br/>
            Incidents: ${incidentCount}<br/>
            ${!isActive ? '<em>Station inactive</em>' : ''}
          </div>`,
          {
            sticky: true,
            className: 'coverage-tooltip',
          },
        );

        polygon.addTo(layerGroup);
      }
    });

    layerGroup.addTo(map);

    return () => {
      map.removeLayer(layerGroup);
    };
  }, [map, features, isVisible, enabledStations, priorityZonesVisible]);

  return null;
}
