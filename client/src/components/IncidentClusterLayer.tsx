import { useEffect, useMemo, useState } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import Supercluster from 'supercluster';
import type { ClusterFeature, PointFeature } from 'supercluster';
import type { Feature as GeoJsonFeature, Point as GeoJsonPoint } from 'geojson';
import type { IncidentListItem } from '@/types/incidents';
import { useIncidentDetailStore } from '@/store/useIncidentDetailStore';
import IncidentPopup from './IncidentPopup';

interface IncidentClusterLayerProps {
  incidents: IncidentListItem[];
}

type IncidentProperties = {
  type: 'incident';
  incident: IncidentListItem;
};

type ClusterProperties = {
  type: 'cluster';
};

type IncidentFeature = GeoJsonFeature<GeoJsonPoint, IncidentProperties>;

const createClusterIcon = (count: number) =>
  L.divIcon({
    html: `<span>${count.toLocaleString()}</span>`,
    className: 'map-cluster-icon',
    iconSize: [44, 44],
  });

const toFeature = (incident: IncidentListItem): IncidentFeature | null => {
  const coords = incident.location.geometry?.coordinates;
  if (!coords || coords.length < 2) {
    return null;
  }

  const [lng, lat] = coords;
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

const IncidentClusterLayer = ({ incidents }: IncidentClusterLayerProps) => {
  const map = useMap();
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
  const [zoom, setZoom] = useState(() => Math.round(map.getZoom()));
  const openIncident = useIncidentDetailStore((state) => state.openIncident);

  const points = useMemo(() => {
    return incidents
      .map(toFeature)
      .filter((feature): feature is IncidentFeature => feature !== null);
  }, [incidents]);

  const clusterIndex = useMemo(() => {
    const instance = new Supercluster<IncidentProperties, ClusterProperties>({
      radius: 60,
      maxZoom: 18,
    });

    instance.load(points);
    return instance;
  }, [points]);

  useEffect(() => {
    const updateBounds = () => {
      const b = map.getBounds();
      setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      setZoom(Math.round(map.getZoom()));
    };

    updateBounds();

    map.on('moveend', updateBounds);
    map.on('zoomend', updateBounds);

    return () => {
      map.off('moveend', updateBounds);
      map.off('zoomend', updateBounds);
    };
  }, [map]);

  const clusters = useMemo(() => {
    if (!bounds) {
      return [] as Array<ClusterFeature<ClusterProperties> | PointFeature<IncidentProperties>>;
    }

    return clusterIndex.getClusters(bounds, zoom);
  }, [clusterIndex, bounds, zoom]);

  const isClusterFeature = (
    feature: ClusterFeature<ClusterProperties> | PointFeature<IncidentProperties>
  ): feature is ClusterFeature<ClusterProperties> =>
    'cluster' in feature.properties && feature.properties.cluster === true;

  return clusters.map(
    (feature: ClusterFeature<ClusterProperties> | PointFeature<IncidentProperties>) => {
      const [lng, lat] = feature.geometry.coordinates as [number, number];

      if (isClusterFeature(feature)) {
        const clusterId = feature.properties.cluster_id;
        const count = feature.properties.point_count;

        return (
          <Marker
            key={`cluster-${clusterId}`}
            position={{ lat, lng }}
            icon={createClusterIcon(count)}
            eventHandlers={{
              click: () => {
                const expansionZoom = Math.min(
                  clusterIndex.getClusterExpansionZoom(clusterId),
                  map.getMaxZoom()
                );
                map.setView({ lat, lng }, expansionZoom, { animate: true });
              },
            }}
          />
        );
      }

      const incident = feature.properties.incident;

      return (
        <Marker key={incident.incidentNumber} position={{ lat, lng }}>
          <Popup>
            <IncidentPopup incident={incident} onViewDetails={openIncident} />
          </Popup>
        </Marker>
      );
    }
  );
};

export default IncidentClusterLayer;
