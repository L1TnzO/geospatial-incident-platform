import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { PriorityScoreGroup } from '../../types/api/strategic';

interface PriorityZoneOverlayProps {
  zones: PriorityScoreGroup[];
  isVisible: boolean;
  highlightedZone?: PriorityScoreGroup | null;
}

export function PriorityZoneOverlay({
  zones,
  isVisible,
  highlightedZone,
}: PriorityZoneOverlayProps) {
  const map = useMap();

  useEffect(() => {
    if (!isVisible || zones.length === 0) {
      return;
    }

    const layerGroup = L.layerGroup();

    // Filter to only show high-priority zones (top 10% or score >= 0.6)
    const topZones = zones
      .filter((zone) => zone.normalizedScore >= 0.6)
      .sort((a, b) => b.normalizedScore - a.normalizedScore)
      .slice(0, 50); // Show max 50 priority zones

    topZones.forEach((zone) => {
      const isHighlighted = highlightedZone === zone;

      // Determine risk level and color
      let color: string;
      let riskLevel: string;

      if (zone.normalizedScore >= 0.8) {
        color = '#dc2626'; // red - critical
        riskLevel = 'Critical';
      } else if (zone.normalizedScore >= 0.6) {
        color = '#f59e0b'; // amber - high
        riskLevel = 'High';
      } else if (zone.normalizedScore >= 0.4) {
        color = '#eab308'; // yellow - medium
        riskLevel = 'Medium';
      } else {
        color = '#10b981'; // green - low
        riskLevel = 'Low';
      }

      // For station-based zones, create circle markers
      if (zone.groupType === 'station' && zone.station) {
        // We don't have coordinates for stations in this response
        // Skip rendering station-based priority zones on map for now
        return;
      }

      // For grid-based zones, render polygons
      if (zone.groupType === 'grid' && zone.cell?.geometry?.geometry?.coordinates) {
        const polygon = L.geoJSON(zone.cell.geometry, {
          style: {
            color: isHighlighted ? '#ffffff' : color,
            fillColor: color,
            fillOpacity: isHighlighted ? 0.7 : 0.4,
            weight: isHighlighted ? 4 : 3,
            opacity: isHighlighted ? 1 : 0.8,
            dashArray: isHighlighted ? '10, 5' : undefined,
          },
        });

        const label = zone.station?.name || `Grid ${zone.cell.cellId.slice(-8)}`;

        const tooltipContent = isHighlighted
          ? `<div style="font-size: 14px;">
              <strong style="font-size: 16px;">${label}</strong><br/>
              <strong>Risk Level: ${riskLevel}</strong><br/>
              Risk Score: ${(zone.normalizedScore * 100).toFixed(1)}<br/>
              Incidents: ${zone.totalIncidents}<br/>
              Avg Severity: ${zone.averageSeverity.toFixed(1)}
            </div>`
          : `<div>
              <strong>${label}</strong><br/>
              Risk Level: ${riskLevel}<br/>
              Risk Score: ${(zone.normalizedScore * 100).toFixed(1)}<br/>
              Incidents: ${zone.totalIncidents}<br/>
              Avg Severity: ${zone.averageSeverity.toFixed(1)}
            </div>`;

        polygon.bindTooltip(tooltipContent, {
          permanent: isHighlighted,
          sticky: !isHighlighted,
          className: isHighlighted
            ? 'priority-zone-tooltip priority-zone-tooltip--highlighted'
            : 'priority-zone-tooltip',
          direction: 'top',
        });

        if (isHighlighted) {
          polygon.openTooltip();
        }

        polygon.addTo(layerGroup);
      }
    });

    layerGroup.addTo(map);

    return () => {
      map.removeLayer(layerGroup);
    };
  }, [map, zones, isVisible, highlightedZone]);

  return null;
}
