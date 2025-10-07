import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { FeatureCollection, GeoJsonObject, Polygon } from 'geojson';
import L from 'leaflet';
import '@/lib/leaflet';
import type { StrategicQueryState } from '@/hooks/useStrategicQuery';
import type { StrategicHotspotResponse, StrategicHotspotCell } from '@/types/strategic';
import StrategicHotspotLayer from './StrategicHotspotLayer';
import {
  buildHotspotFeatureCollection,
  type HotspotFeatureProperties,
} from './StrategicHotspotLayer.utils';

const DEFAULT_CENTER: [number, number] = [37.7749, -122.4194];
const RESOLUTION_OPTIONS = [2, 4, 6, 8, 12];
const MIN_INTENSITY_SCALE = 0.5;
const MAX_INTENSITY_SCALE = 3;
const INTENSITY_STEP = 0.25;

interface StrategicHotspotOverlayCardProps {
  state: StrategicQueryState<StrategicHotspotResponse>;
  resolution: number;
  onResolutionChange: (value: number) => void;
  intensityScale: number;
  onIntensityScaleChange: (value: number) => void;
}

const clampIntensity = (value: number) =>
  Math.min(MAX_INTENSITY_SCALE, Math.max(MIN_INTENSITY_SCALE, value));

const resolveResolutionOptions = (current: number, response?: StrategicHotspotResponse) => {
  if (!response) {
    return RESOLUTION_OPTIONS;
  }

  const { resolution } = response.metadata;
  const all = new Set<number>(RESOLUTION_OPTIONS);
  if (resolution) {
    all.add(resolution);
  }
  if (current) {
    all.add(current);
  }
  return Array.from(all).sort((a, b) => a - b);
};

const findInitialCenter = (cells: StrategicHotspotCell[]): [number, number] => {
  if (!cells.length) {
    return DEFAULT_CENTER;
  }

  const { centroid } = cells[0];
  return [centroid.latitude, centroid.longitude];
};

const StrategicHotspotViewport = ({
  featureCollection,
}: {
  featureCollection: FeatureCollection<Polygon, HotspotFeatureProperties>;
}) => {
  const map = useMap();

  useEffect(() => {
    if (!featureCollection.features.length) {
      return;
    }

    const geoJson = L.geoJSON(featureCollection as GeoJsonObject);
    const bounds = geoJson.getBounds();
    if (!bounds.isValid()) {
      return;
    }

    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
  }, [featureCollection, map]);

  return null;
};

const StrategicHotspotOverlayCard = ({
  state,
  resolution,
  onResolutionChange,
  intensityScale,
  onIntensityScaleChange,
}: StrategicHotspotOverlayCardProps) => {
  const titleId = useId();
  const descriptionId = useId();
  const legendId = useId();
  const [isUserEditingIntensity, setIsUserEditingIntensity] = useState(false);

  const featureCollection = useMemo(() => {
    if (!state.data) {
      return buildHotspotFeatureCollection([], intensityScale);
    }
    return buildHotspotFeatureCollection(state.data.cells, intensityScale);
  }, [state.data, intensityScale]);

  const resolutionOptions = useMemo(
    () => resolveResolutionOptions(resolution, state.data ?? undefined),
    [resolution, state.data]
  );

  const handleResolutionSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = Number.parseInt(event.target.value, 10);
    if (!Number.isNaN(next)) {
      onResolutionChange(next);
    }
  };

  const handleIntensityChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number.parseFloat(event.target.value);
    if (!Number.isNaN(next)) {
      onIntensityScaleChange(clampIntensity(next));
      setIsUserEditingIntensity(true);
    }
  };

  const handleIntensityCommit = useCallback(() => {
    setIsUserEditingIntensity(false);
  }, []);

  const handleRefresh = () => {
    state.refresh();
  };

  const handleCancel = () => {
    state.cancel();
  };

  const isEmpty = state.isSuccess && state.data?.cells.length === 0;
  const center = useMemo(() => findInitialCenter(state.data?.cells ?? []), [state.data]);
  const intensityPercentage = Math.round((intensityScale / MAX_INTENSITY_SCALE) * 100);

  return (
    <article
      className="strategic-card strategic-hotspot-overlay"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={state.isLoading}
    >
      <header className="strategic-card__header strategic-hotspot-overlay__header">
        <div>
          <h3 id={titleId}>Hotspot heatmap</h3>
          <p id={descriptionId} className="strategic-card__subtitle">
            Interactive Leaflet heatmap of strategic grid cells. Adjust resolution and intensity to
            explore concentration patterns aligned with dashboard filters.
          </p>
        </div>
        <div className="strategic-hotspot-overlay__actions">
          <label className="strategic-hotspot-overlay__control">
            <span>Resolution</span>
            <select value={resolution} onChange={handleResolutionSelect} aria-label="Resolution">
              {resolutionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}×{option}
                </option>
              ))}
            </select>
          </label>
          <label className="strategic-hotspot-overlay__control">
            <span id={`${legendId}-label`}>Intensity scaling</span>
            <input
              type="range"
              min={MIN_INTENSITY_SCALE}
              max={MAX_INTENSITY_SCALE}
              step={INTENSITY_STEP}
              value={intensityScale}
              onChange={handleIntensityChange}
              onMouseUp={handleIntensityCommit}
              onKeyUp={handleIntensityCommit}
              onTouchEnd={handleIntensityCommit}
              aria-valuemin={MIN_INTENSITY_SCALE}
              aria-valuemax={MAX_INTENSITY_SCALE}
              aria-valuenow={Number(intensityScale.toFixed(2))}
              aria-labelledby={`${legendId}-label`}
            />
            <span className="strategic-hotspot-overlay__control-value">
              {isUserEditingIntensity ? intensityScale.toFixed(2) : `${intensityPercentage}%`}
            </span>
          </label>
          <div className="strategic-hotspot-overlay__buttons">
            <button type="button" onClick={handleRefresh} disabled={state.isLoading}>
              Refresh layer
            </button>
            <button type="button" onClick={handleCancel} disabled={!state.isLoading}>
              Cancel request
            </button>
          </div>
        </div>
      </header>

      <div className="strategic-card__body strategic-hotspot-overlay__body">
        {state.isLoading ? (
          <p className="strategic-card__status" role="status">
            Loading heatmap data…
          </p>
        ) : null}
        {state.isError ? (
          <div className="strategic-card__status" role="alert">
            <p>{state.error ?? 'Unable to load hotspot heatmap data.'}</p>
            <button type="button" onClick={handleRefresh}>
              Try again
            </button>
          </div>
        ) : null}
        {isEmpty ? (
          <p className="strategic-card__status" role="status">
            No hotspot cells match the current filters. Try broadening the date or severity range.
          </p>
        ) : null}
        {!state.isError && !isEmpty ? (
          <div className="strategic-hotspot-overlay__map" role="group" aria-label="Hotspot map">
            <MapContainer
              center={center}
              zoom={12}
              className="strategic-hotspot-overlay__map-container"
              zoomControl={false}
              attributionControl
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <StrategicHotspotViewport featureCollection={featureCollection} />
              <StrategicHotspotLayer
                cells={state.data?.cells ?? []}
                intensityScale={intensityScale}
              />
            </MapContainer>
            <div className="strategic-hotspot-overlay__legend" id={legendId} aria-live="polite">
              <div className="strategic-hotspot-overlay__legend-gradient" aria-hidden="true" />
              <div className="strategic-hotspot-overlay__legend-labels">
                <span>0</span>
                <span>0.25</span>
                <span>0.5</span>
                <span>0.75</span>
                <span>1.0</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {state.isSuccess && state.data ? (
        <footer className="strategic-hotspot-overlay__meta">
          <dl>
            <div>
              <dt>Resolution</dt>
              <dd>
                {state.data.metadata.resolution} (
                {state.data.metadata.cellSizeMeters.toLocaleString()}m cells)
              </dd>
            </div>
            <div>
              <dt>Total incidents</dt>
              <dd>{state.data.metadata.totalIncidents.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Active cells</dt>
              <dd>{state.data.metadata.cellCount.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Max per cell</dt>
              <dd>{state.data.metadata.maxIncidentCount.toLocaleString()}</dd>
            </div>
            {state.lastUpdated ? (
              <div>
                <dt>Updated</dt>
                <dd>
                  <time dateTime={state.lastUpdated}>
                    {new Date(state.lastUpdated).toLocaleString()}
                  </time>
                </dd>
              </div>
            ) : null}
          </dl>
        </footer>
      ) : null}
    </article>
  );
};

export default StrategicHotspotOverlayCard;
