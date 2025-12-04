import { useEffect, useRef, useState } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { ClusterFeature, PointFeature } from 'supercluster';
import type { LiteIncident } from '../../types';
import { resolveSeverityColor } from './utils';
import IncidentPopup from './popup/IncidentPopup';
import { useIncidentsContext } from '../../providers/incidents-provider';
import type { ClusterEntry, WorkerResponse } from '../../workers/incident-worker';

interface IncidentClusterLayerProps {
  incidents: LiteIncident[];
  onIncidentClick: (incident: LiteIncident) => void;
}

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

const isClusterFeature = (feature: ClusterEntry): feature is ClusterFeature<any> =>
  'cluster' in feature.properties && feature.properties.cluster === true;

const IncidentClusterLayer = ({ incidents, onIncidentClick }: IncidentClusterLayerProps) => {
  const map = useMap();
  const { worker } = useIncidentsContext();
  const [clusters, setClusters] = useState<ClusterEntry[]>([]);

  const clusterIconCache = useRef(new Map<number, L.DivIcon>());
  const incidentIconCache = useRef(new Map<string, L.DivIcon>());

  const getClusterIcon = (count: number) => {
    if (!clusterIconCache.current.has(count)) {
      clusterIconCache.current.set(count, createClusterIcon(count));
    }
    return clusterIconCache.current.get(count)!;
  };

  const getIncidentIcon = (incident: LiteIncident) => {
    const color = resolveSeverityColor(incident);
    const key = `${incident.severity}:${color}`;
    if (!incidentIconCache.current.has(key)) {
      incidentIconCache.current.set(key, createIncidentIcon(color));
    }
    return incidentIconCache.current.get(key)!;
  };

  // Request clusters from worker when map moves or data changes
  useEffect(() => {
    if (!worker) return;

    const updateClusters = () => {
      const bounds = map.getBounds();
      const zoom = Math.round(map.getZoom());
      const bbox: [number, number, number, number] = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ];

      worker.postMessage({
        type: 'GET_CLUSTERS',
        payload: { bbox, zoom },
      });
    };

    const handleMessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.type === 'CLUSTERS_CALCULATED') {
        setClusters(event.data.payload.clusters);
      } else if (event.data.type === 'DATA_UPDATED' || event.data.type === 'FILTER_COMPLETE') {
        // Data changed, re-request clusters
        updateClusters();
      }
    };

    worker.addEventListener('message', handleMessage);

    // Initial request
    updateClusters();

    map.on('moveend', updateClusters);
    map.on('zoomend', updateClusters);

    return () => {
      worker.removeEventListener('message', handleMessage);
      map.off('moveend', updateClusters);
      map.off('zoomend', updateClusters);
    };
  }, [map, worker, incidents]); // Re-run when incidents change to ensure we get fresh clusters

  return clusters.map((feature) => {
    const [lng, lat] = feature.geometry.coordinates as [number, number];

    if (isClusterFeature(feature)) {
      const clusterFeature = feature as ClusterFeature<any>;
      const clusterId = clusterFeature.properties.cluster_id;
      const count = clusterFeature.properties.point_count;

      return (
        <Marker
          key={`cluster-${clusterId}`}
          position={{ lat, lng }}
          icon={getClusterIcon(count)}
          eventHandlers={{
            click: () => {
              // We can't query expansion zoom from worker easily without another roundtrip.
              // For now, just zoom in by 2 levels.
              // Ideally we'd ask the worker for expansion zoom, but that adds complexity.
              // Or we could just zoom to the cluster center.
              map.setView({ lat, lng }, map.getZoom() + 2, { animate: true });
            },
          }}
        />
      );
    }

    // It's a point feature
    const pointFeature = feature as PointFeature<any>;
    const incident = pointFeature.properties.incident;
    const icon = getIncidentIcon(incident);

    return (
      <Marker
        key={incident.id}
        position={{ lat, lng }}
        icon={icon}
        eventHandlers={{
          click: () => {
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
