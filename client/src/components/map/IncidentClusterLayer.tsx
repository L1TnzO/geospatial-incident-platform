import { useEffect, useMemo, useRef, useState } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import Supercluster from 'supercluster';
import type { ClusterFeature, PointFeature } from 'supercluster';
import type { Feature as GeoJsonFeature, Point as GeoJsonPoint } from 'geojson';
import type { Incident } from '../../types';
import { resolveSeverityColor } from './utils';
import IncidentPopup from './popup/IncidentPopup';

interface IncidentClusterLayerProps {
  incidents: Incident[];
  onIncidentClick: (incident: Incident) => void;
}

type IncidentProperties = {
  type: 'incident';
  incident: Incident;
};

type ClusterProperties = {
  type: 'cluster';
};

type IncidentFeature = GeoJsonFeature<GeoJsonPoint, IncidentProperties>;

type ClusterEntry = ClusterFeature<ClusterProperties> | PointFeature<IncidentProperties>;

const createClusterIcon = (count: number) =>
  L.divIcon({
    html: `<span>${count.toLocaleString()}</span>`,
    className: 'map-cluster-icon',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });

const createIncidentIcon = (color: string) =>
  L.divIcon({
    html: `<span style="--marker-color: ${color}"></span>`,
    className: 'map-incident-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -24],
  });

const incidentToFeature = (incident: Incident): IncidentFeature | null => {
  const { lat, lng } = incident.location;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [lng, lat],
    },
    properties: {
      type: 'incident',
      incident,
    },
  };
};

const isClusterFeature = (feature: ClusterEntry): feature is ClusterFeature<ClusterProperties> =>
  'cluster' in feature.properties && feature.properties.cluster === true;

const IncidentClusterLayer = ({ incidents, onIncidentClick }: IncidentClusterLayerProps) => {
  const map = useMap();
  const [currentBounds, setCurrentBounds] = useState<[number, number, number, number] | null>(null);
  const [currentZoom, setCurrentZoom] = useState(() => Math.round(map.getZoom()));
  const clusterIconCache = useRef(new Map<number, L.DivIcon>());
  const incidentIconCache = useRef(new Map<string, L.DivIcon>());
  const featuresRef = useRef<Map<string, IncidentFeature>>(new Map());
  const clusterIndexRef = useRef<Supercluster<IncidentProperties, ClusterProperties> | null>(null);

  const getClusterIcon = (count: number) => {
    if (!clusterIconCache.current.has(count)) {
      clusterIconCache.current.set(count, createClusterIcon(count));
    }
    return clusterIconCache.current.get(count)!;
  };

  const getIncidentIcon = (incident: Incident) => {
    const color = resolveSeverityColor(incident);
    const key = `${incident.severity}:${color}`;
    if (!incidentIconCache.current.has(key)) {
      incidentIconCache.current.set(key, createIncidentIcon(color));
    }
    return incidentIconCache.current.get(key)!;
  };

  const clusterIndex = useMemo(() => {
    const previousFeatures = featuresRef.current;
    const nextFeatures = new Map<string, IncidentFeature>();
    let mutated = false;

    for (const incident of incidents) {
      const prevFeature = previousFeatures.get(incident.id);
      const hasValidLocation =
        typeof incident.location?.lat === 'number' && typeof incident.location?.lng === 'number';

      if (!hasValidLocation) {
        if (prevFeature) {
          mutated = true;
        }
        continue;
      }

      if (prevFeature) {
        const prevIncident = prevFeature.properties.incident;
        const sameCoords =
          prevIncident.location.lat === incident.location.lat &&
          prevIncident.location.lng === incident.location.lng;

        if (sameCoords) {
          if (prevIncident !== incident) {
            prevFeature.properties.incident = incident;
          }
          nextFeatures.set(incident.id, prevFeature);
          continue;
        }
      }

      const feature = incidentToFeature(incident);
      if (!feature) {
        if (prevFeature) {
          mutated = true;
        }
        continue;
      }

      nextFeatures.set(incident.id, feature);
      if (!prevFeature) {
        mutated = true;
      } else {
        const prevIncident = prevFeature.properties.incident;
        if (
          prevIncident.location.lat !== incident.location.lat ||
          prevIncident.location.lng !== incident.location.lng
        ) {
          mutated = true;
        }
      }
    }

    if (previousFeatures.size !== nextFeatures.size) {
      mutated = true;
    }

    featuresRef.current = nextFeatures;

    if (!mutated && clusterIndexRef.current) {
      return clusterIndexRef.current;
    }

    const index = new Supercluster<IncidentProperties, ClusterProperties>({
      radius: 60,
      maxZoom: 18,
    });
    index.load(Array.from(nextFeatures.values()));
    clusterIndexRef.current = index;
    return index;
  }, [incidents]);

  const clusters = useMemo(() => {
    if (!currentBounds) {
      return [] as ClusterEntry[];
    }

    // Add padding to bounds to render points outside the viewport
    // This prevents points from "popping" in/out during drag operations
    const [west, south, east, north] = currentBounds;
    const latSpan = Math.abs(north - south);
    const lngSpan = Math.abs(east - west);
    const paddingFactor = 1.5; // Increased to 150% padding to prevent pop-in on mobile drag

    const paddedBounds: [number, number, number, number] = [
      west - lngSpan * paddingFactor,
      south - latSpan * paddingFactor,
      east + lngSpan * paddingFactor,
      north + latSpan * paddingFactor,
    ];

    return clusterIndex.getClusters(paddedBounds, currentZoom);
  }, [clusterIndex, currentBounds, currentZoom]);

  // Sync map state to local state for clustering
  useEffect(() => {
    const syncState = () => {
      const bounds = map.getBounds();
      setCurrentBounds([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]);
      setCurrentZoom(Math.round(map.getZoom()));
    };

    syncState();

    map.on('moveend', syncState);
    map.on('zoomend', syncState);

    return () => {
      map.off('moveend', syncState);
      map.off('zoomend', syncState);
    };
  }, [map]);

  // Debug logging
  useEffect(() => {
    const logDebugInfo = () => {
      const bounds = map.getBounds();
      const west = bounds.getWest();
      const south = bounds.getSouth();
      const east = bounds.getEast();
      const north = bounds.getNorth();

      const visibleIncidents = incidents.filter((incident) => {
        const { lat, lng } = incident.location;
        return lat >= south && lat <= north && lng >= west && lng <= east;
      });

      const debugData = {
        timestamp: new Date().toISOString(),
        viewport: {
          north,
          south,
          east,
          west,
          zoom: map.getZoom(),
        },
        stats: {
          totalIncidents: incidents.length,
          visibleInViewport: visibleIncidents.length,
          renderedClusters: clusters.length,
        },
        visibleIncidentIds: visibleIncidents.map((i) => i.id),
      };

      console.log('[MapDebug]', JSON.stringify(debugData, null, 2));

      // Expose to window for "file" download simulation if needed
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (!window.debugLogs) window.debugLogs = [];
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.debugLogs.push(debugData);
    };

    map.on('moveend', logDebugInfo);

    return () => {
      map.off('moveend', logDebugInfo);
    };
  }, [map, incidents, clusters]);

  return clusters.map((feature) => {
    const [lng, lat] = feature.geometry.coordinates as [number, number];

    if (isClusterFeature(feature)) {
      const clusterId = feature.properties.cluster_id;
      const count = feature.properties.point_count;

      return (
        <Marker
          key={`cluster-${clusterId}`}
          position={{ lat, lng }}
          icon={getClusterIcon(count)}
          eventHandlers={{
            click: () => {
              const expansionZoom = Math.min(
                clusterIndex.getClusterExpansionZoom(clusterId),
                map.getMaxZoom(),
              );
              map.setView({ lat, lng }, expansionZoom, { animate: true });
            },
          }}
        />
      );
    }

    const incident = feature.properties.incident;
    const icon = getIncidentIcon(incident);

    return (
      <Marker
        key={incident.id}
        position={{ lat, lng }}
        icon={icon}
        eventHandlers={{
          click: () => {
            // Just center the map on the incident, popup will open automatically
            map.setView({ lat, lng }, map.getZoom(), { animate: true });
          },
          keydown: (event) => {
            if (
              event.originalEvent instanceof KeyboardEvent &&
              event.originalEvent.key === 'Enter'
            ) {
              const marker = event.target as L.Marker;
              marker.openPopup();
            }
          },
        }}
      >
        <Popup className="incident-popup__container">
          <IncidentPopup incident={incident} onViewDetails={onIncidentClick} />
        </Popup>
      </Marker>
    );
  });
};

export default IncidentClusterLayer;
