import { useId } from 'react';
import type { StrategicQueryState } from '@/hooks/useStrategicQuery';
import type { StrategicHotspotResponse } from '@/types/strategic';

const formatCoordinate = (value: number) => value.toFixed(3);

interface StrategicHotspotSummaryProps {
  state: StrategicQueryState<StrategicHotspotResponse>;
}

const StrategicHotspotSummary = ({ state }: StrategicHotspotSummaryProps) => {
  const titleId = useId();

  const handleRefresh = () => {
    state.refresh();
  };

  const { data } = state;
  const topCells = data?.cells.slice(0, 3) ?? [];

  return (
    <article className="strategic-card" aria-busy={state.isLoading} aria-labelledby={titleId}>
      <header className="strategic-card__header">
        <div>
          <h3 id={titleId}>Hotspot heatmap preview</h3>
          <p className="strategic-card__subtitle">
            Summaries of gridded hotspot cells for upcoming map overlays and alert workflows.
          </p>
        </div>
        <button type="button" className="strategic-card__refresh" onClick={handleRefresh}>
          Refresh
        </button>
      </header>
      <div className="strategic-card__body">
        {state.isLoading || state.isIdle ? (
          <p className="strategic-card__status" role="status">
            Loading hotspot aggregates…
          </p>
        ) : null}
        {state.isError ? (
          <div className="strategic-card__status" role="alert">
            <p>{state.error ?? 'Unable to load hotspot aggregates.'}</p>
            <button type="button" onClick={handleRefresh}>
              Try again
            </button>
          </div>
        ) : null}
        {state.isSuccess && data ? (
          <div className="strategic-card__content">
            <dl className="strategic-card__metrics strategic-card__metrics--grid">
              <div>
                <dt>Total incidents</dt>
                <dd>{data.metadata.totalIncidents.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Resolution</dt>
                <dd>
                  {data.metadata.resolution} ({data.metadata.cellSizeMeters.toLocaleString()}m
                  cells)
                </dd>
              </div>
              <div>
                <dt>Active cells</dt>
                <dd>{data.metadata.cellCount.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Max incidents in cell</dt>
                <dd>{data.metadata.maxIncidentCount.toLocaleString()}</dd>
              </div>
            </dl>
            <div className="strategic-card__highlight">
              <h4>Top hotspot cells</h4>
              <ul>
                {topCells.map((cell) => (
                  <li key={cell.cellId}>
                    <span className="strategic-card__highlight-month">Cell {cell.cellId}</span>
                    <span className="strategic-card__highlight-count">
                      {cell.incidentCount.toLocaleString()} incidents
                    </span>
                    <span className="strategic-card__highlight-change">
                      Centroid: {formatCoordinate(cell.centroid.latitude)},{' '}
                      {formatCoordinate(cell.centroid.longitude)} (intensity{' '}
                      {cell.intensity.toFixed(2)})
                    </span>
                  </li>
                ))}
              </ul>
              {topCells.length === 0 ? <p>No hotspot cells for the current filters.</p> : null}
            </div>
            {state.lastUpdated ? (
              <p className="strategic-card__timestamp">
                Updated at{' '}
                <time dateTime={state.lastUpdated}>
                  {new Date(state.lastUpdated).toLocaleString()}
                </time>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
};

export default StrategicHotspotSummary;
