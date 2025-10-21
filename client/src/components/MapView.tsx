import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { type Map as LeafletMap } from 'leaflet';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  AlertTriangle,
  Flame,
  Globe,
  Info,
  Layers,
  Mountain,
  RefreshCw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Incident, FireStation } from '../types';
import { useMapPreferencesStore, type BaseLayer } from '../store/map-preferences-store';
import { useMapStore } from '../store/map-store';
import '@/lib/leaflet';
import { useShallow } from 'zustand/react/shallow';
import { computeIncidentBounds, resolveSeverityColor } from './map/utils';
import IncidentClusterLayer from './map/IncidentClusterLayer';
import StationLayer from './map/StationLayer';
import '../styles/map/map.css';

const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low'];

interface MapCounts {
  rendered: number;
  total: number;
  remainder: number;
}

interface MapViewProps {
  incidents: Incident[];
  fireStations: FireStation[];
  onIncidentClick: (incident: Incident) => void;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  onRetry: () => void;
  counts: MapCounts;
  stationsLoading: boolean;
  stationsError?: string;
}

const TILE_LAYERS: Record<
  BaseLayer,
  { label: string; url: string; attribution: string; maxZoom?: number }
> = {
  street: {
    label: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  topographic: {
    label: 'Topographic',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>',
    maxZoom: 17,
  },
  satellite: {
    label: 'Satellite',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, USDA FSA, USGS, AeroGRID, IGN, and the GIS User Community',
    maxZoom: 19,
  },
};

const BASE_LAYER_SEQUENCE: BaseLayer[] = ['street', 'topographic', 'satellite'];

const MapViewportController = () => {
  const center = useMapStore((state) => state.center);
  const zoom = useMapStore((state) => state.zoom);
  const map = useMap();

  useEffect(() => {
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const [targetLat, targetLng] = center;

    const latDelta = Math.abs(currentCenter.lat - targetLat);
    const lngDelta = Math.abs(currentCenter.lng - targetLng);
    const zoomChanged = currentZoom !== zoom;

    if (latDelta > 0.0001 || lngDelta > 0.0001 || zoomChanged) {
      map.setView({ lat: targetLat, lng: targetLng }, zoom, { animate: false });
    }
  }, [center, zoom, map]);

  return null;
};

const MapViewportTracker = () => {
  const setView = useMapStore((state) => state.setView);
  const map = useMap();

  const updateStoreFromMap = () => {
    const nextCenter = map.getCenter();
    const nextZoom = map.getZoom();
    const { center: currentCenter, zoom: currentZoom } = useMapStore.getState();

    if (
      Math.abs(currentCenter[0] - nextCenter.lat) < 0.0001 &&
      Math.abs(currentCenter[1] - nextCenter.lng) < 0.0001 &&
      currentZoom === nextZoom
    ) {
      return;
    }

    setView([nextCenter.lat, nextCenter.lng], nextZoom);
  };

  useMapEvents({
    moveend: updateStoreFromMap,
    zoomend: updateStoreFromMap,
  });

  return null;
};

const BaseLayerTile = ({ layer }: { layer: BaseLayer }) => {
  const config = TILE_LAYERS[layer];
  return (
    <TileLayer
      key={layer}
      url={config.url}
      attribution={config.attribution}
      maxZoom={config.maxZoom}
    />
  );
};

const MapInstanceBinder = ({
  mapRef,
  onReady,
}: {
  mapRef: MutableRefObject<LeafletMap | null>;
  onReady: () => void;
}) => {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
    onReady();
  }, [map, mapRef, onReady]);

  return null;
};

export function MapView({
  incidents,
  fireStations,
  onIncidentClick,
  isLoading,
  isError,
  error,
  onRetry,
  counts,
  stationsLoading,
  stationsError,
}: MapViewProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const center = useMapStore((state) => state.center);
  const zoom = useMapStore((state) => state.zoom);
  const resetView = useMapStore((state) => state.resetView);
  const { baseLayer, setBaseLayer, showLegend, toggleLegend, showStations, toggleStations } =
    useMapPreferencesStore(
      useShallow((state) => ({
        baseLayer: state.baseLayer,
        setBaseLayer: state.setBaseLayer,
        showLegend: state.showLegend,
        toggleLegend: state.toggleLegend,
        showStations: state.showStations,
        toggleStations: state.toggleStations,
      })),
    );

  const severityLegend = useMemo(() => {
    const entries = new Map<string, string>();
    incidents.forEach((incident) => {
      if (!entries.has(incident.severity)) {
        entries.set(incident.severity, resolveSeverityColor(incident));
      }
    });
    const orderedKeys = Array.from(entries.keys()).sort((a, b) => {
      const indexA = SEVERITY_ORDER.indexOf(a);
      const indexB = SEVERITY_ORDER.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    return orderedKeys.map((key) => [key, entries.get(key)!] as const);
  }, [incidents]);

  const showEmptyState = !isLoading && !isError && incidents.length === 0;
  const stationLegendLabel =
    fireStations.length > 0 ? 'Fire stations' : 'Fire stations (none loaded)';
  const incidentsBounds = useMemo(() => computeIncidentBounds(incidents), [incidents]);
  const [lastFitSignature, setLastFitSignature] = useState<string | null>(null);
  const incidentsBoundsSignature = useMemo(
    () => (incidentsBounds ? incidentsBounds.toBBoxString() : null),
    [incidentsBounds],
  );
  const [isMapReady, setIsMapReady] = useState(false);
  const handleMapReady = useCallback(() => setIsMapReady(true), []);

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const handleResetView = () => {
    resetView();
    const state = useMapStore.getState();
    const [lat, lng] = state.center;
    if (mapRef.current) {
      mapRef.current.setView({ lat, lng }, state.zoom, { animate: true });
    }
  };

  const baseLayerOptions = useMemo(
    () =>
      BASE_LAYER_SEQUENCE.map((layer) => ({
        id: layer,
        label: TILE_LAYERS[layer].label,
      })),
    [],
  );

  useEffect(() => {
    if (!isMapReady || !mapRef.current || !incidentsBounds) {
      return;
    }

    if (!incidentsBounds.isValid()) {
      return;
    }

    if (!incidentsBoundsSignature || incidentsBoundsSignature === lastFitSignature) {
      return;
    }

    const map = mapRef.current;
    map.fitBounds(incidentsBounds, { padding: [48, 48], maxZoom: 14 });
    setLastFitSignature(incidentsBoundsSignature);
  }, [incidentsBounds, incidentsBoundsSignature, isMapReady, lastFitSignature]);

  useEffect(() => {
    if (!incidentsBoundsSignature && lastFitSignature !== null) {
      setLastFitSignature(null);
    }
  }, [incidentsBoundsSignature, lastFitSignature]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <Card className="map-card shadow-md">
          <p className="font-medium">Incident coverage</p>
          <p>
            Showing {counts.rendered.toLocaleString()} of {counts.total.toLocaleString()} incidents.
          </p>
          {counts.remainder > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {counts.remainder.toLocaleString()} additional incidents are available. Refine filters
              to narrow the scope.
            </p>
          )}
        </Card>
        {stationsError && (
          <Card className="map-card map-card--error" role="alert">
            <div className="map-card__row">
              <AlertTriangle className="map-card__icon" />
              <span className="map-card__message">{stationsError}</span>
            </div>
          </Card>
        )}
      </div>

      <MapContainer
        center={{ lat: center[0], lng: center[1] }}
        zoom={zoom}
        minZoom={3}
        maxZoom={19}
        zoomControl={false}
        className="h-full w-full"
      >
        <BaseLayerTile layer={baseLayer} />
        <MapViewportController />
        <MapViewportTracker />
        <IncidentClusterLayer incidents={incidents} onIncidentClick={onIncidentClick} />
        <StationLayer stations={fireStations} isVisible={showStations} />
        <MapInstanceBinder mapRef={mapRef} onReady={handleMapReady} />
      </MapContainer>

      {(isLoading || isError || showEmptyState) && (
        <div className="map-overlay" role="status" aria-live="polite">
          <Card className="map-overlay__card" aria-busy={isLoading}>
            {isLoading && (
              <div className="map-overlay__state">
                <RefreshCw className="map-overlay__icon animate-spin" />
                <div>
                  <p className="map-overlay__title">Loading incidents…</p>
                  <p className="map-overlay__subtitle">
                    Fetching the latest activity from the service.
                  </p>
                </div>
              </div>
            )}
            {isError && !isLoading && (
              <div className="map-overlay__state">
                <AlertTriangle className="map-overlay__icon map-overlay__icon--error" />
                <div className="map-overlay__body">
                  <p className="map-overlay__title">Unable to load incidents</p>
                  <p className="map-overlay__subtitle">
                    {error ??
                      'Check your connection and try again. If the issue persists, contact the duty officer.'}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={onRetry}
                  className="map-overlay__action"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4" /> Retry
                </Button>
              </div>
            )}
            {showEmptyState && !isLoading && !isError && (
              <div className="map-overlay__state">
                <Info className="map-overlay__icon" />
                <div>
                  <p className="map-overlay__title">No incidents available</p>
                  <p className="map-overlay__subtitle">
                    Adjust filters or check back soon for new activity.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 map-controls">
        <Card className="map-control map-control--wide">
          <p className="map-control__label">Base layer</p>
          <div className="map-control__options">
            {baseLayerOptions.map((option) => {
              const isActive = baseLayer === option.id;
              return (
                <Button
                  key={option.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setBaseLayer(option.id)}
                  className="map-control__button"
                  aria-pressed={isActive}
                  aria-label={`Switch to ${option.label} base layer`}
                >
                  {option.id === 'street' && <Layers className="h-4 w-4" aria-hidden="true" />}
                  {option.id === 'topographic' && (
                    <Mountain className="h-4 w-4" aria-hidden="true" />
                  )}
                  {option.id === 'satellite' && <Globe className="h-4 w-4" aria-hidden="true" />}
                  <span>{option.label}</span>
                </Button>
              );
            })}
          </div>
        </Card>

        <Card className="map-control">
          <div className="map-control__stack">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="map-control__icon-button"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="map-control__icon-button"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetView}
              className="map-control__icon-button"
              aria-label="Reset map view"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        <Card className="map-control">
          <Button
            variant={showStations ? 'secondary' : 'ghost'}
            size="sm"
            onClick={toggleStations}
            className="map-control__button"
            aria-pressed={showStations}
            aria-label="Toggle fire stations overlay"
          >
            <Flame className="h-4 w-4" />
            <span>{showStations ? 'Stations on' : 'Stations off'}</span>
          </Button>
          {stationsLoading && <p className="map-control__helper">Loading stations…</p>}
        </Card>

        <Card className="map-control">
          <Button
            variant={showLegend ? 'secondary' : 'ghost'}
            size="sm"
            onClick={toggleLegend}
            className="map-control__button"
            aria-pressed={showLegend}
            aria-label="Toggle legend"
          >
            <Info className="h-4 w-4" />
            <span>Legend</span>
          </Button>
        </Card>

        {showLegend && (
          <Card className="map-legend">
            <h4 className="map-legend__title">Legend</h4>
            <div className="map-legend__items">
              {severityLegend.map(([label, color]) => (
                <div key={label} className="map-legend__item">
                  <span className="map-legend__swatch" style={{ backgroundColor: color }} />
                  <span>{label}</span>
                </div>
              ))}
              {severityLegend.length === 0 && <p className="map-legend__empty">No incidents.</p>}
              <div className="map-legend__item">
                <span
                  className="map-legend__swatch map-legend__swatch--station"
                  aria-hidden="true"
                />
                <span>{stationLegendLabel}</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
