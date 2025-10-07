import type { ChangeEvent } from 'react';
import { useEffect, useId, useMemo, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { FeatureCollection, GeoJsonObject, Polygon } from 'geojson';
import L from 'leaflet';
import '@/lib/leaflet';
import type { StrategicQueryState } from '@/hooks/useStrategicQuery';
import type { StrategicResponseMetricsResponse } from '@/types/strategic';
import StrategicResponseOverlayLayer from './StrategicResponseOverlayLayer';
import {
  RESPONSE_GRADIENT_STOPS,
  buildResponseGridFeatureCollection,
  buildResponseStationPoints,
  type ResponseFeatureProperties,
  type ResponseStationPoint,
} from './StrategicResponseOverlayLayer.utils';

interface StrategicResponseOverlayCardProps {
  state: StrategicQueryState<StrategicResponseMetricsResponse>;
  groupBy: 'grid' | 'station';
  onGroupByChange: (group: 'grid' | 'station') => void;
}

const DEFAULT_CENTER: [number, number] = [37.7749, -122.4194];
const THRESHOLD_MIN_MINUTES = 4;
const THRESHOLD_MAX_MINUTES = 15;
const THRESHOLD_STEP_MINUTES = 1;
const DEFAULT_THRESHOLD_MINUTES = 8;

const StrategicResponseViewport = ({
  groupBy,
  featureCollection,
  stationPoints,
}: {
  groupBy: 'grid' | 'station';
  featureCollection: FeatureCollection<Polygon, ResponseFeatureProperties>;
  stationPoints: ResponseStationPoint[];
}) => {
  const map = useMap();

  useEffect(() => {
    if (groupBy === 'grid') {
      if (!featureCollection.features.length) {
        return;
      }
      const geoJson = L.geoJSON(featureCollection as unknown as GeoJsonObject);
      const bounds = geoJson.getBounds();
      geoJson.remove();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
      }
      return;
    }

    if (!stationPoints.length) {
      return;
    }

    const latLngs = stationPoints
      .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
      .map((point) => L.latLng(point.latitude, point.longitude));

    if (!latLngs.length) {
      return;
    }

    const bounds = L.latLngBounds(latLngs);
    if (bounds.isValid()) {
      const padding = latLngs.length === 1 ? 0.08 : 0.02;
      const paddedBounds = bounds.pad(padding);
      map.fitBounds(paddedBounds, { padding: [24, 24], maxZoom: latLngs.length === 1 ? 12 : 13 });
    }
  }, [featureCollection, groupBy, map, stationPoints]);

  return null;
};

const StrategicResponseOverlayCard = ({
  state,
  groupBy,
  onGroupByChange,
}: StrategicResponseOverlayCardProps) => {
  const titleId = useId();
  const descriptionId = useId();
  const listId = useId();

  const [thresholdMinutes, setThresholdMinutes] = useState<number>(DEFAULT_THRESHOLD_MINUTES);

  const groups = useMemo(() => state.data?.groups ?? [], [state.data?.groups]);
  const metadata = state.data?.metadata;
  const thresholdSeconds = thresholdMinutes * 60;

  const gridFeatureCollection = useMemo(
    () =>
      buildResponseGridFeatureCollection(
        groups.filter((group) => group.groupType === 'grid'),
        thresholdSeconds,
        metadata?.minAverageSeconds,
        metadata?.maxAverageSeconds
      ),
    [groups, metadata?.maxAverageSeconds, metadata?.minAverageSeconds, thresholdSeconds]
  );

  const stationPoints = useMemo(
    () =>
      buildResponseStationPoints(
        groups.filter((group) => group.groupType === 'station'),
        thresholdSeconds,
        metadata?.minAverageSeconds,
        metadata?.maxAverageSeconds
      ).filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)),
    [groups, metadata?.maxAverageSeconds, metadata?.minAverageSeconds, thresholdSeconds]
  );

  const exceededGroups = useMemo(
    () =>
      groups.filter(
        (group) => !group.insufficientSample && group.averageSeconds >= thresholdSeconds
      ),
    [groups, thresholdSeconds]
  );

  const insufficientSampleCount = useMemo(
    () => groups.filter((group) => group.insufficientSample).length,
    [groups]
  );

  const legendGradient = useMemo(() => {
    const stops = RESPONSE_GRADIENT_STOPS.map(
      ({ stop, color }) => `${color} ${Math.round(stop * 100)}%`
    );
    return `linear-gradient(90deg, ${stops.join(', ')})`;
  }, []);

  const handleGroupToggle = (value: 'grid' | 'station') => {
    if (value === groupBy) {
      return;
    }
    onGroupByChange(value);
  };

  const handleThresholdChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (Number.isNaN(value)) {
      return;
    }
    setThresholdMinutes(value);
  };

  const emptyState = state.isSuccess && groups.length === 0;

  return (
    <article
      className="strategic-card strategic-response-overlay"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={state.isLoading}
    >
      <header className="strategic-card__header strategic-response-overlay__header">
        <div>
          <h3 id={titleId}>Response time heatmap</h3>
          <p id={descriptionId} className="strategic-card__subtitle">
            Choropleth and station markers highlighting response performance. Adjust grouping and
            thresholds to spotlight areas exceeding target travel minutes.
          </p>
        </div>
        <div className="strategic-response-overlay__actions">
          <div
            className="strategic-response-overlay__toggle"
            role="group"
            aria-label="Response grouping"
          >
            <button
              type="button"
              className={groupBy === 'grid' ? 'is-active' : ''}
              onClick={() => handleGroupToggle('grid')}
              aria-pressed={groupBy === 'grid'}
            >
              Grid view
            </button>
            <button
              type="button"
              className={groupBy === 'station' ? 'is-active' : ''}
              onClick={() => handleGroupToggle('station')}
              aria-pressed={groupBy === 'station'}
            >
              Station view
            </button>
          </div>
          <label className="strategic-response-overlay__threshold">
            <span>Threshold</span>
            <input
              type="range"
              min={THRESHOLD_MIN_MINUTES}
              max={THRESHOLD_MAX_MINUTES}
              step={THRESHOLD_STEP_MINUTES}
              value={thresholdMinutes}
              onChange={handleThresholdChange}
              aria-label="Highlight groups above threshold minutes"
            />
            <span className="strategic-response-overlay__threshold-value">
              {thresholdMinutes} min
            </span>
          </label>
          <div className="strategic-response-overlay__buttons">
            <button type="button" onClick={state.refresh} disabled={state.isLoading}>
              Refresh overlay
            </button>
            <button type="button" onClick={state.cancel} disabled={!state.isLoading}>
              Cancel request
            </button>
          </div>
        </div>
      </header>

      <div className="strategic-card__body strategic-response-overlay__body">
        {state.isLoading ? (
          <p className="strategic-card__status" role="status">
            Loading response overlays…
          </p>
        ) : null}
        {state.isError ? (
          <div className="strategic-card__status" role="alert">
            <p>{state.error ?? 'Unable to load response metrics overlay.'}</p>
            <button type="button" onClick={state.refresh}>
              Try again
            </button>
          </div>
        ) : null}
        {emptyState ? (
          <p className="strategic-card__status" role="status">
            No response metrics are available for the current filters.
          </p>
        ) : null}

        {!state.isError && !emptyState ? (
          <div className="strategic-response-overlay__content">
            <div
              className="strategic-response-overlay__map"
              role="group"
              aria-label="Response performance map"
            >
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={11}
                className="strategic-response-overlay__map-container"
                scrollWheelZoom
                attributionControl
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <StrategicResponseViewport
                  groupBy={groupBy}
                  featureCollection={gridFeatureCollection}
                  stationPoints={stationPoints}
                />
                <StrategicResponseOverlayLayer
                  groups={groups}
                  groupBy={groupBy}
                  thresholdSeconds={thresholdSeconds}
                  minAverageSeconds={metadata?.minAverageSeconds}
                  maxAverageSeconds={metadata?.maxAverageSeconds}
                />
              </MapContainer>
              <aside
                className="strategic-response-overlay__legend"
                aria-label="Response time legend"
              >
                <span className="strategic-response-overlay__legend-title">
                  Average response time
                </span>
                <div
                  className="strategic-response-overlay__legend-bar"
                  style={{ background: legendGradient }}
                />
                <div className="strategic-response-overlay__legend-scale">
                  <span>
                    {metadata?.minAverageSeconds
                      ? Math.round(metadata.minAverageSeconds / 60)
                      : '—'}
                    m
                  </span>
                  <span>
                    {metadata?.maxAverageSeconds
                      ? Math.round(metadata.maxAverageSeconds / 60)
                      : '—'}
                    m
                  </span>
                </div>
                <div className="strategic-response-overlay__legend-flags">
                  <span>
                    <span
                      className="strategic-response-overlay__legend-marker strategic-response-overlay__legend-marker--threshold"
                      aria-hidden="true"
                    />
                    Above threshold
                  </span>
                  <span>
                    <span
                      className="strategic-response-overlay__legend-marker strategic-response-overlay__legend-marker--insufficient"
                      aria-hidden="true"
                    />
                    Insufficient sample
                  </span>
                </div>
              </aside>
            </div>
            <aside
              className="strategic-response-overlay__panel"
              aria-labelledby={`${titleId}-panel`}
            >
              <h4 id={`${titleId}-panel`}>Response groups</h4>
              <ul className="strategic-response-overlay__group-list" id={listId}>
                {groups.slice(0, 12).map((group) => {
                  const label =
                    group.groupType === 'station'
                      ? group.station.name
                        ? `${group.station.name} (${group.station.code})`
                        : group.station.code
                      : `Cell ${group.cell.cellId}`;
                  const key =
                    group.groupType === 'station'
                      ? `station-${group.station.code}`
                      : `grid-${group.cell.cellId}`;
                  const exceeded =
                    !group.insufficientSample && group.averageSeconds >= thresholdSeconds;
                  return (
                    <li key={key}>
                      <span className="strategic-response-overlay__group-label">{label}</span>
                      <span className="strategic-response-overlay__group-metric">
                        Avg {Math.round(group.averageSeconds)}s · p90 {Math.round(group.p90Seconds)}
                        s
                      </span>
                      <span
                        className={`strategic-response-overlay__group-status${
                          group.insufficientSample
                            ? ' is-insufficient'
                            : exceeded
                              ? ' is-exceeded'
                              : ''
                        }`}
                      >
                        {group.insufficientSample
                          ? 'Insufficient sample'
                          : exceeded
                            ? 'Above threshold'
                            : 'On target'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>
        ) : null}
      </div>

      {state.isSuccess && !state.isError ? (
        <footer className="strategic-response-overlay__meta">
          <dl>
            <div>
              <dt>Total groups</dt>
              <dd>{metadata?.totalGroups?.toLocaleString() ?? groups.length.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Threshold</dt>
              <dd>
                {thresholdMinutes} min (≥ {thresholdSeconds}s)
              </dd>
            </div>
            <div>
              <dt>Above threshold</dt>
              <dd>{exceededGroups.length.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Insufficient sample</dt>
              <dd>{insufficientSampleCount.toLocaleString()}</dd>
            </div>
            {metadata?.generatedAt ? (
              <div>
                <dt>Generated</dt>
                <dd>
                  <time dateTime={metadata.generatedAt}>
                    {new Date(metadata.generatedAt).toLocaleString()}
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

export default StrategicResponseOverlayCard;
