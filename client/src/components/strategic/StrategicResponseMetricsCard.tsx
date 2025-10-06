import { useId } from 'react';
import type { StrategicQueryState } from '@/hooks/useStrategicQuery';
import type {
  StrategicResponseMetricsResponse,
  StrategicResponseMetricGroup,
} from '@/types/strategic';

interface StrategicResponseMetricsCardProps {
  state: StrategicQueryState<StrategicResponseMetricsResponse>;
}

const getGroupLabel = (group: StrategicResponseMetricGroup): string => {
  if (group.groupType === 'station') {
    return group.station.name
      ? `${group.station.name} (${group.station.code})`
      : group.station.code;
  }
  return `Cell ${group.cell.cellId}`;
};

const formatSeconds = (value: number): string => `${Math.round(value)}s`;

const StrategicResponseMetricsCard = ({ state }: StrategicResponseMetricsCardProps) => {
  const titleId = useId();
  const { data } = state;
  const groups = data?.groups ?? [];
  const eligible = groups.filter((group) => !group.insufficientSample);
  const sorted = [...eligible].sort((a, b) => b.normalizedAverage - a.normalizedAverage);
  const leaders = sorted.slice(0, 3);
  const watchlist = sorted.slice(-3).reverse();

  const handleRefresh = () => {
    state.refresh();
  };

  return (
    <article className="strategic-card" aria-busy={state.isLoading} aria-labelledby={titleId}>
      <header className="strategic-card__header">
        <div>
          <h3 id={titleId}>Response readiness snapshot</h3>
          <p className="strategic-card__subtitle">
            Average turnout, median travel, and 90th percentile comparisons per{' '}
            {data?.metadata.groupBy ?? 'station'}.
          </p>
        </div>
        <button type="button" className="strategic-card__refresh" onClick={handleRefresh}>
          Refresh
        </button>
      </header>
      <div className="strategic-card__body">
        {state.isLoading || state.isIdle ? (
          <p className="strategic-card__status" role="status">
            Loading response metrics…
          </p>
        ) : null}
        {state.isError ? (
          <div className="strategic-card__status" role="alert">
            <p>{state.error ?? 'Unable to load response metrics.'}</p>
            <button type="button" onClick={handleRefresh}>
              Try again
            </button>
          </div>
        ) : null}
        {state.isSuccess && data ? (
          <div className="strategic-card__content">
            <dl className="strategic-card__metrics strategic-card__metrics--grid">
              <div>
                <dt>Total groups</dt>
                <dd>{data.metadata.totalGroups.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Sample threshold</dt>
                <dd>{data.metadata.sampleThreshold}</dd>
              </div>
              <div>
                <dt>Fastest average</dt>
                <dd>
                  {data.metadata.minAverageSeconds !== null
                    ? formatSeconds(data.metadata.minAverageSeconds)
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Slowest average</dt>
                <dd>
                  {data.metadata.maxAverageSeconds !== null
                    ? formatSeconds(data.metadata.maxAverageSeconds)
                    : '—'}
                </dd>
              </div>
            </dl>
            <div className="strategic-card__highlight">
              <h4>Top performers</h4>
              <ul>
                {leaders.map((group) => (
                  <li key={getGroupLabel(group)}>
                    <span className="strategic-card__highlight-month">{getGroupLabel(group)}</span>
                    <span className="strategic-card__highlight-count">
                      Avg {formatSeconds(group.averageSeconds)} (p90{' '}
                      {formatSeconds(group.p90Seconds)})
                    </span>
                    <span className="strategic-card__highlight-change">
                      Percentile {Math.round(group.percentileRank * 100)} • Sample{' '}
                      {group.sampleSize}
                    </span>
                  </li>
                ))}
              </ul>
              {leaders.length === 0 ? <p>No groups with sufficient samples yet.</p> : null}
            </div>
            <div className="strategic-card__highlight">
              <h4>Watchlist</h4>
              <ul>
                {watchlist.map((group) => (
                  <li key={`${getGroupLabel(group)}-watch`}>
                    <span className="strategic-card__highlight-month">{getGroupLabel(group)}</span>
                    <span className="strategic-card__highlight-count">
                      Avg {formatSeconds(group.averageSeconds)} • Normalized{' '}
                      {group.normalizedAverage.toFixed(2)}
                    </span>
                    <span className="strategic-card__highlight-change">
                      Percentile {Math.round(group.percentileRank * 100)} • Sample{' '}
                      {group.sampleSize}
                    </span>
                  </li>
                ))}
              </ul>
              {watchlist.length === 0 ? <p>No groups fall below threshold.</p> : null}
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

export default StrategicResponseMetricsCard;
