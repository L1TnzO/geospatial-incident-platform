import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { FeatureCollection, GeoJsonObject, Polygon } from 'geojson';
import L from 'leaflet';
import '@/lib/leaflet';
import type { StrategicCoverageResponse } from '@/types/strategic';
import type { StrategicQueryState } from '@/hooks/useStrategicQuery';
import StrategicCoverageOverlayLayer from './StrategicCoverageOverlayLayer';
import {
  COVERAGE_COLOR_PALETTE,
  buildCoverageFeatureCollection,
  resolveCoverageColor,
  type CoverageFeatureProperties,
} from './StrategicCoverageOverlayLayer.utils';

const DEFAULT_CENTER: [number, number] = [37.7749, -122.4194];

interface StrategicCoverageOverlayCardProps {
  state: StrategicQueryState<StrategicCoverageResponse>;
}

const StrategicCoverageViewport = ({
  featureCollection,
}: {
  featureCollection: FeatureCollection<Polygon, CoverageFeatureProperties>;
}) => {
  const map = useMap();

  useEffect(() => {
    if (!featureCollection.features.length) {
      return;
    }

    const geoJson = L.geoJSON(featureCollection as GeoJsonObject);
    const bounds = geoJson.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
    }

    return () => {
      geoJson.remove();
    };
  }, [featureCollection, map]);

  return null;
};

const StrategicCoverageOverlayCard = ({ state }: StrategicCoverageOverlayCardProps) => {
  const titleId = useId();
  const descriptionId = useId();
  const listId = useId();
  const userInteractedRef = useRef(false);

  const stations = useMemo(() => state.data?.stations ?? [], [state.data?.stations]);
  const stationCodes = useMemo(() => stations.map((station) => station.station.code), [stations]);
  const stationColorMap = useMemo(() => {
    const map = new Map<string, string>();
    stations.forEach((station, index) => {
      const color = resolveCoverageColor(index, station.colorHex ?? undefined);
      map.set(station.station.code, color);
    });
    return map;
  }, [stations]);

  const [selectedStationCodes, setSelectedStationCodes] = useState<Set<string>>(
    () => new Set(stationCodes)
  );

  useEffect(() => {
    if (!stations.length) {
      setSelectedStationCodes(new Set());
      return;
    }

    setSelectedStationCodes((current) => {
      if (userInteractedRef.current) {
        const next = new Set<string>();
        const codeSet = new Set(stationCodes);
        current.forEach((code) => {
          if (codeSet.has(code)) {
            next.add(code);
          }
        });
        return next;
      }
      return new Set(stationCodes);
    });
  }, [stations, stationCodes]);

  const visibleStationCodes = useMemo(() => {
    if (selectedStationCodes.size > 0) {
      return selectedStationCodes;
    }
    return new Set(stationCodes);
  }, [selectedStationCodes, stationCodes]);

  const featureCollection = useMemo(
    () => buildCoverageFeatureCollection(stations, visibleStationCodes),
    [stations, visibleStationCodes]
  );

  const handleStationToggle = (event: ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    userInteractedRef.current = true;
    setSelectedStationCodes((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(value);
      } else {
        next.delete(value);
      }
      return next;
    });
  };

  const handleSelectAll = useCallback(() => {
    userInteractedRef.current = true;
    setSelectedStationCodes(new Set(stationCodes));
  }, [stationCodes]);

  const handleClearAll = useCallback(() => {
    userInteractedRef.current = true;
    setSelectedStationCodes(new Set());
  }, []);

  const totalStations = state.data?.metadata.totalStations ?? stations.length;
  const activeStations = state.data?.metadata.activeStations ?? stations.length;
  const generatedAt = state.data?.metadata.generatedAt ?? null;

  const emptyState = state.isSuccess && stations.length === 0;

  return (
    <article
      className="strategic-card strategic-coverage-overlay"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={state.isLoading}
    >
      <header className="strategic-card__header strategic-coverage-overlay__header">
        <div>
          <h3 id={titleId}>Station coverage overlay</h3>
          <p id={descriptionId} className="strategic-card__subtitle">
            Visualize station coverage buffers alongside strategic analytics. Enable stations to
            view their coverage radius polygons, inspect metadata, and analyze readiness gaps.
          </p>
        </div>
        <div className="strategic-coverage-overlay__actions">
          <div
            className="strategic-coverage-overlay__action-group"
            role="group"
            aria-label="Coverage layer visibility"
          >
            <button type="button" onClick={handleSelectAll}>
              Enable all
            </button>
            <button type="button" onClick={handleClearAll}>
              Disable all
            </button>
          </div>
          <div className="strategic-coverage-overlay__buttons">
            <button type="button" onClick={state.refresh} disabled={state.isLoading}>
              Refresh coverage
            </button>
            <button type="button" onClick={state.cancel} disabled={!state.isLoading}>
              Cancel request
            </button>
          </div>
        </div>
      </header>

      <div className="strategic-card__body strategic-coverage-overlay__body">
        {state.isLoading ? (
          <p className="strategic-card__status" role="status">
            Loading station coverage buffers…
          </p>
        ) : null}
        {state.isError ? (
          <div className="strategic-card__status" role="alert">
            <p>{state.error ?? 'Unable to load station coverage buffers.'}</p>
            <button type="button" onClick={state.refresh}>
              Try again
            </button>
          </div>
        ) : null}
        {emptyState ? (
          <p className="strategic-card__status" role="status">
            No station coverage areas are available for the current filters.
          </p>
        ) : null}
        {!state.isError && !emptyState ? (
          <div className="strategic-coverage-overlay__content">
            <div
              className="strategic-coverage-overlay__map"
              role="group"
              aria-label="Station coverage map"
            >
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={11}
                className="strategic-coverage-overlay__map-container"
                scrollWheelZoom
                attributionControl
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <StrategicCoverageViewport featureCollection={featureCollection} />
                <StrategicCoverageOverlayLayer
                  stations={stations}
                  visibleStationCodes={visibleStationCodes}
                />
              </MapContainer>
              <div className="strategic-coverage-overlay__legend" aria-hidden="true">
                <span className="strategic-coverage-overlay__legend-title">Coverage buffer</span>
                <span className="strategic-coverage-overlay__legend-description">
                  Semi-transparent polygons outline station coverage radii.
                </span>
              </div>
            </div>
            <aside
              className="strategic-coverage-overlay__panel"
              aria-labelledby={`${titleId}-panel`}
            >
              <h4 id={`${titleId}-panel`}>Stations</h4>
              <ul className="strategic-coverage-overlay__station-list" id={listId}>
                {stations.map((station) => {
                  const code = station.station.code;
                  const name = station.station.name ?? code;
                  const isSelected = visibleStationCodes.has(code);
                  const radius = `${Math.round(station.coverageRadiusMeters).toLocaleString()} m`;
                  const status = station.isActive ? 'Active' : 'Inactive';
                  return (
                    <li key={code} className="strategic-coverage-overlay__station-item">
                      <label className="strategic-coverage-overlay__station-toggle">
                        <input
                          type="checkbox"
                          value={code}
                          checked={isSelected}
                          onChange={handleStationToggle}
                          aria-label={`Toggle coverage for ${name}`}
                        />
                        <span
                          className="strategic-coverage-overlay__station-indicator"
                          aria-hidden="true"
                          style={{
                            backgroundColor: stationColorMap.get(code) ?? COVERAGE_COLOR_PALETTE[0],
                          }}
                        />
                        <span className="strategic-coverage-overlay__station-text">
                          <span className="strategic-coverage-overlay__station-name">{name}</span>
                          <span className="strategic-coverage-overlay__station-meta">
                            Radius {radius} · {status}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>
        ) : null}
      </div>

      {state.isSuccess && !state.isError ? (
        <footer className="strategic-coverage-overlay__meta">
          <dl>
            <div>
              <dt>Total stations</dt>
              <dd>{totalStations.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Active stations</dt>
              <dd>{activeStations.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Visible stations</dt>
              <dd>{visibleStationCodes.size.toLocaleString()}</dd>
            </div>
            {generatedAt ? (
              <div>
                <dt>Generated</dt>
                <dd>
                  <time dateTime={generatedAt}>{new Date(generatedAt).toLocaleString()}</time>
                </dd>
              </div>
            ) : null}
          </dl>
        </footer>
      ) : null}
    </article>
  );
};

export default StrategicCoverageOverlayCard;
