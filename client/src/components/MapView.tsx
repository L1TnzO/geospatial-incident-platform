import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import {
  type Map as LeafletMap,
  type LeafletEvent,
  type LeafletMouseEvent,
  type LatLngBounds,
} from 'leaflet';
import { Button } from './ui/button';
import { useIncidentCreateStore } from '../store/incident-create-store';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import {
  AlertTriangle,
  Flame,
  Globe,
  Info,
  Layers,
  Mountain,
  Plus,
  RefreshCw,
  Menu,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Incident, FireStation } from '../types';
import { useMapPreferencesStore, type BaseLayer } from '../store/map-preferences-store';
import { useMapStore, type MapBounds } from '../store/map-store';
import '@/lib/leaflet';
import { useShallow } from 'zustand/react/shallow';
import { computeIncidentBounds, resolveSeverityColor } from './map/utils';
import IncidentClusterLayer from './map/IncidentClusterLayer';
import StationLayer from './map/StationLayer';
import { HotspotOverlay } from './map/HotspotOverlay';
import { CoverageOverlay } from './map/CoverageOverlay';
import { PriorityZoneOverlay } from './map/PriorityZoneOverlay';
import type {
  HotspotCell,
  CoverageBufferFeature,
  PriorityScoreGroup,
} from '../types/api/strategic';
import { useMediaQuery } from '../hooks/use-media-query';
import '../styles/map/map.css';

const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low'];

interface MapCounts {
  rendered: number;
  total: number;
  remainder: number;
  limit: number;
}

interface MapViewProps {
  incidents: Incident[];
  fireStations: FireStation[];
  onIncidentClick: (incident: Incident) => void;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error?: string;
  onRetry: () => void;
  counts: MapCounts;
  stationsLoading: boolean;
  stationsError?: string;
  strategicOverlays?: {
    hotspots: HotspotCell[];
    coverage: CoverageBufferFeature[];
    priorityZones: PriorityScoreGroup[];
    highlightedZone?: PriorityScoreGroup | null;
  };
  useStrategicPreferences?: boolean;
}

const roundCoordinate = (value: number): number => Math.round(value * 1_000_000) / 1_000_000;

const toMapBounds = (bounds: LatLngBounds): MapBounds => ({
  north: roundCoordinate(bounds.getNorth()),
  south: roundCoordinate(bounds.getSouth()),
  east: roundCoordinate(bounds.getEast()),
  west: roundCoordinate(bounds.getWest()),
});

const boundsAreEqual = (a: MapBounds | null, b: MapBounds | null): boolean => {
  if (!a || !b) {
    return a === b;
  }
  return (
    Math.abs(a.north - b.north) < 0.00001 &&
    Math.abs(a.south - b.south) < 0.00001 &&
    Math.abs(a.east - b.east) < 0.00001 &&
    Math.abs(a.west - b.west) < 0.00001
  );
};

const isUserGestureEvent = (event: LeafletEvent): boolean =>
  Boolean((event as LeafletEvent & { originalEvent?: unknown }).originalEvent);

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
  const map = useMap();
  const { setView, setBounds, markUserAdjusted } = useMapStore(
    useShallow((state) => ({
      setView: state.setView,
      setBounds: state.setBounds,
      markUserAdjusted: state.markUserAdjusted,
    })),
  );

  const updateStoreFromMap = useCallback(() => {
    const nextCenter = map.getCenter();
    const nextZoom = map.getZoom();
    const nextBounds = toMapBounds(map.getBounds());
    const { center: currentCenter, zoom: currentZoom, bounds: currentBounds } =
      useMapStore.getState();

    if (
      Math.abs(currentCenter[0] - nextCenter.lat) > 0.0001 ||
      Math.abs(currentCenter[1] - nextCenter.lng) > 0.0001 ||
      currentZoom !== nextZoom
    ) {
      setView([nextCenter.lat, nextCenter.lng], nextZoom);
    }

    if (!boundsAreEqual(currentBounds, nextBounds)) {
      setBounds(nextBounds);
    }
  }, [map, setBounds, setView]);

  useEffect(() => {
    updateStoreFromMap();
  }, [updateStoreFromMap]);

  useMapEvents({
    movestart: (event: LeafletEvent) => {
      if (isUserGestureEvent(event)) {
        markUserAdjusted();
      }
    },
    zoomstart: (event: LeafletEvent) => {
      if (isUserGestureEvent(event)) {
        markUserAdjusted();
      }
    },
    mousedown: () => {
      markUserAdjusted();
    },
    touchstart: () => {
      markUserAdjusted();
    },
    wheel: () => {
      markUserAdjusted();
    },
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
  isFetching,
  isError,
  error,
  onRetry,
  counts,
  stationsLoading,
  stationsError,
  strategicOverlays,
  useStrategicPreferences = false,
}: MapViewProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const center = useMapStore((state) => state.center);
  const zoom = useMapStore((state) => state.zoom);
  const resetView = useMapStore((state) => state.resetView);
  const hasUserAdjusted = useMapStore((state) => state.hasUserAdjusted);
  const {
    baseLayer,
    setBaseLayer,
    showLegend,
    toggleLegend,
    showStations,
    toggleStations,
    showIncidents,
    showHotspots,
    showCoverage,
    showPriorityZones,
  } = useMapPreferencesStore(
    useShallow((state) => ({
      baseLayer: state.baseLayer,
      setBaseLayer: state.setBaseLayer,
      showLegend: useStrategicPreferences ? state.showLegendStrategic : state.showLegend,
      toggleLegend: useStrategicPreferences ? state.toggleLegendStrategic : state.toggleLegend,
      showStations: useStrategicPreferences ? state.showStationsStrategic : state.showStations,
      toggleStations: useStrategicPreferences
        ? state.toggleStationsStrategic
        : state.toggleStations,
      showIncidents: useStrategicPreferences ? state.showIncidentsStrategic : state.showIncidents,
      showHotspots: useStrategicPreferences ? state.showHotspotsStrategic : state.showHotspots,
      showCoverage: useStrategicPreferences ? state.showCoverageStrategic : state.showCoverage,
      showPriorityZones: useStrategicPreferences
        ? state.showPriorityZonesStrategic
        : state.showPriorityZones,
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
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  // Incident creation mode: if user is selecting a location, clicking the map will set draft coordinates
  const cancelLocationSelection = useIncidentCreateStore((state) => state.cancelLocationSelection);
  const completeLocationSelection = useIncidentCreateStore(
    (state) => state.completeLocationSelection,
  );
  const isSelectingLocation = useIncidentCreateStore((state) => state.isSelectingLocation);

  const targetCompletionPercent = useMemo(() => {
    if (counts.limit <= 0) {
      return 0;
    }
    const ratio = counts.rendered / counts.limit;
    if (!Number.isFinite(ratio)) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(ratio * 100)));
  }, [counts.limit, counts.rendered]);

  const Picker = () => {
    useMapEvents({
      click: (ev: LeafletMouseEvent) => {
        if (!isSelectingLocation) return;
        const { lat, lng } = ev.latlng;
        completeLocationSelection({ lat, lng });
        // stop selection mode
        cancelLocationSelection();
      },
    });
    return null;
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
    if (!isMapReady || !mapRef.current || !incidentsBounds || hasUserAdjusted) {
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
  }, [
    hasUserAdjusted,
    incidentsBounds,
    incidentsBoundsSignature,
    isMapReady,
    lastFitSignature,
  ]);

  // Render the picker when selecting a location (mounted directly inside MapContainer)

  useEffect(() => {
    if (!incidentsBoundsSignature && lastFitSignature !== null) {
      setLastFitSignature(null);
    }
  }, [incidentsBoundsSignature, lastFitSignature]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <Card className="map-card shadow-md hidden md:block">
          <p className="font-medium">Incident coverage</p>
          <p>
            Showing {counts.rendered.toLocaleString()} of {counts.total.toLocaleString()} incidents.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Current render limit: {counts.limit.toLocaleString()} incidents. Adjust “Records to display” in the filters to load more at once.
          </p>
          {isFetching && !isLoading && counts.rendered < counts.limit && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
              Updating incidents for the current map view…
            </p>
          )}
          {counts.remainder > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {counts.remainder.toLocaleString()} additional incidents match the current filters.
              Increase the render limit or refine filters to explore them.
            </p>
          )}
          {counts.limit > 0 && (
            <div className="mt-2 space-y-1">
              <Progress value={targetCompletionPercent} aria-label="Incident load progress" />
              <p className="text-[11px] text-muted-foreground">
                {targetCompletionPercent}% of target incidents loaded
              </p>
            </div>
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
        {showIncidents && (
          <IncidentClusterLayer incidents={incidents} onIncidentClick={onIncidentClick} />
        )}
        <StationLayer stations={fireStations} isVisible={showStations} />

        {/* Strategic overlays */}
        {strategicOverlays && (
          <>
            <HotspotOverlay
              cells={strategicOverlays.hotspots}
              isVisible={showHotspots}
              intensityExponent={1}
              priorityZonesVisible={showPriorityZones}
            />
            <CoverageOverlay
              features={strategicOverlays.coverage}
              isVisible={showCoverage}
              priorityZonesVisible={showPriorityZones}
            />
            <PriorityZoneOverlay
              zones={strategicOverlays.priorityZones}
              isVisible={showPriorityZones}
              highlightedZone={strategicOverlays.highlightedZone}
            />
          </>
        )}

        <MapInstanceBinder mapRef={mapRef} onReady={handleMapReady} />
        {isSelectingLocation && <Picker />}
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

      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 map-controls items-end">
        {/* Mobile Controls Container */}
        {!isDesktop && (
          <div className="flex flex-col items-end gap-2">
            <Card
              className={`flex flex-col gap-1 p-2 transition-all duration-300 ease-in-out bg-white/85 backdrop-blur-xl border-white/20 shadow-lg ${
                isMobileExpanded ? 'w-48' : 'w-11 items-center'
              }`}
            >
              {/* Hamburger / Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 self-end hover:bg-black/5"
                onClick={() => setIsMobileExpanded(!isMobileExpanded)}
                aria-label={isMobileExpanded ? 'Collapse menu' : 'Expand menu'}
              >
                <Menu className="h-5 w-5 text-zinc-700" />
              </Button>

              {/* Controls */}
              <div className={`flex flex-col gap-1 ${isMobileExpanded ? 'w-full' : ''}`}>
                {/* Zoom In */}
                <Button
                  variant="ghost"
                  size="sm"
                  className={`justify-start h-8 hover:bg-black/5 ${
                    isMobileExpanded ? 'w-full px-2' : 'w-8 p-0'
                  }`}
                  onClick={handleZoomIn}
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-5 w-5 shrink-0 text-zinc-700" />
                  {isMobileExpanded && (
                    <span className="ml-3 text-sm font-medium text-zinc-700">Zoom In</span>
                  )}
                </Button>

                {/* Zoom Out */}
                <Button
                  variant="ghost"
                  size="sm"
                  className={`justify-start h-8 hover:bg-black/5 ${
                    isMobileExpanded ? 'w-full px-2' : 'w-8 p-0'
                  }`}
                  onClick={handleZoomOut}
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-5 w-5 shrink-0 text-zinc-700" />
                  {isMobileExpanded && (
                    <span className="ml-3 text-sm font-medium text-zinc-700">Zoom Out</span>
                  )}
                </Button>

                {/* Reset */}
                <Button
                  variant="ghost"
                  size="sm"
                  className={`justify-start h-8 hover:bg-black/5 ${
                    isMobileExpanded ? 'w-full px-2' : 'w-8 p-0'
                  }`}
                  onClick={handleResetView}
                  aria-label="Reset map view"
                >
                  <RefreshCw className="h-5 w-5 shrink-0 text-zinc-700" />
                  {isMobileExpanded && (
                    <span className="ml-3 text-sm font-medium text-zinc-700">Reset View</span>
                  )}
                </Button>

                {/* Stations */}
                <Button
                  variant={showStations ? 'secondary' : 'ghost'}
                  size="sm"
                  className={`justify-start h-8 hover:bg-black/5 ${
                    isMobileExpanded ? 'w-full px-2' : 'w-8 p-0'
                  } ${showStations ? 'bg-black/10' : ''}`}
                  onClick={toggleStations}
                  aria-label="Toggle fire stations"
                >
                  <Flame className="h-5 w-5 shrink-0 text-zinc-700" />
                  {isMobileExpanded && (
                    <span className="ml-3 text-sm font-medium text-zinc-700">Fire Stations</span>
                  )}
                </Button>

                {/* Info / Legend Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  className={`justify-start h-8 hover:bg-black/5 ${
                    isMobileExpanded ? 'w-full px-2 opacity-100 cursor-default' : 'w-8 p-0'
                  }`}
                  onClick={() => !isMobileExpanded && setIsMobileExpanded(true)}
                  aria-label="Show legend"
                >
                  <Info className="h-5 w-5 shrink-0 text-zinc-700" />
                  {isMobileExpanded && (
                    <span className="ml-3 text-sm font-medium text-zinc-700">Legend</span>
                  )}
                </Button>
              </div>

              {/* Legend Content (Embedded) */}
              {isMobileExpanded && (
                <div className="mt-2 pt-2 border-t border-black/10 animate-in fade-in slide-in-from-top-1">
                  <div className="grid gap-2 text-xs">
                    {severityLegend.map(([label, color]) => (
                      <div key={label} className="flex items-center gap-3 py-0.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0 shadow-sm ring-1 ring-white/50"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-medium text-zinc-700">{label}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-3 py-0.5">
                      <span className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0 bg-gradient-to-br from-violet-600 to-purple-500 shadow-sm ring-1 ring-white/50" />
                      <span className="font-medium text-zinc-700">Fire stations</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Desktop Controls - Cards */}
        {isDesktop && (
          <div className="flex flex-col gap-2 items-end">
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
                      {option.id === 'satellite' && (
                        <Globe className="h-4 w-4" aria-hidden="true" />
                      )}
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
                <span className="hidden md:inline">
                  {showStations ? 'Stations on' : 'Stations off'}
                </span>
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
                <span className="hidden md:inline">Legend</span>
              </Button>
            </Card>

            <Card className="map-control">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => useIncidentCreateStore.getState().open()}
                className="map-control__button"
                aria-label="Create new incident"
              >
                New Incident
              </Button>
            </Card>
          </div>
        )}

        {showLegend && isDesktop && (
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

      {!isDesktop && (
        <div className="absolute bottom-6 right-4 z-[1000]">
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            onClick={() => useIncidentCreateStore.getState().open()}
            aria-label="Create new incident"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      )}
    </div>
  );
}
