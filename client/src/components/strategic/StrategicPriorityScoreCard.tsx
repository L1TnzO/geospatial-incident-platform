import { useId } from 'react';
import type { StrategicQueryState } from '@/hooks/useStrategicQuery';
import type {
  StrategicPriorityScoreResponse,
  StrategicPriorityScoreGroup,
} from '@/types/strategic';

interface StrategicPriorityScoreCardProps {
  state: StrategicQueryState<StrategicPriorityScoreResponse>;
}

const getGroupLabel = (group: StrategicPriorityScoreGroup): string => {
  if (group.groupType === 'station') {
    return group.station.name
      ? `${group.station.name} (${group.station.code})`
      : group.station.code;
  }
  return `Cell ${group.cell.cellId}`;
};

const StrategicPriorityScoreCard = ({ state }: StrategicPriorityScoreCardProps) => {
  const titleId = useId();
  const { data } = state;
  const groups = data?.groups ?? [];
  const sorted = [...groups].sort((a, b) => b.normalizedScore - a.normalizedScore);
  const leaders = sorted.slice(0, 3);
  const emerging = sorted.slice(-3).reverse();

  const handleRefresh = () => {
    state.refresh();
  };

  return (
    <article className="strategic-card" aria-busy={state.isLoading} aria-labelledby={titleId}>
      <header className="strategic-card__header">
        <div>
          <h3 id={titleId}>Priority score leaders</h3>
          <p className="strategic-card__subtitle">
            Severity-weighted activity highlighting stations or grid cells that may need additional
            coverage.
          </p>
        </div>
        <button type="button" className="strategic-card__refresh" onClick={handleRefresh}>
          Refresh
        </button>
      </header>
      <div className="strategic-card__body">
        {state.isLoading || state.isIdle ? (
          <p className="strategic-card__status" role="status">
            Loading priority scores…
          </p>
        ) : null}
        {state.isError ? (
          <div className="strategic-card__status" role="alert">
            <p>{state.error ?? 'Unable to load priority scores.'}</p>
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
                <dt>Decay window</dt>
                <dd>
                  {data.metadata.decayHalfLifeDays
                    ? `${data.metadata.decayHalfLifeDays} days`
                    : 'None'}
                </dd>
              </div>
              <div>
                <dt>Max raw score</dt>
                <dd>
                  {data.metadata.maxRawScore !== null
                    ? data.metadata.maxRawScore.toLocaleString(undefined, {
                        maximumFractionDigits: 1,
                      })
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Min raw score</dt>
                <dd>
                  {data.metadata.minRawScore !== null
                    ? data.metadata.minRawScore.toLocaleString(undefined, {
                        maximumFractionDigits: 1,
                      })
                    : '—'}
                </dd>
              </div>
            </dl>
            <div className="strategic-card__highlight">
              <h4>High priority</h4>
              <ul>
                {leaders.map((group) => (
                  <li key={getGroupLabel(group)}>
                    <span className="strategic-card__highlight-month">{getGroupLabel(group)}</span>
                    <span className="strategic-card__highlight-count">
                      Score {group.normalizedScore.toFixed(2)} • Incidents{' '}
                      {group.totalIncidents.toLocaleString()}
                    </span>
                    <span className="strategic-card__highlight-change">
                      Avg severity {group.averageSeverity.toFixed(2)} • Percentile{' '}
                      {Math.round(group.percentileRank * 100)}
                    </span>
                  </li>
                ))}
              </ul>
              {leaders.length === 0 ? <p>No high priority groups yet.</p> : null}
            </div>
            <div className="strategic-card__highlight">
              <h4>Emerging demand</h4>
              <ul>
                {emerging.map((group) => (
                  <li key={`${getGroupLabel(group)}-emerging`}>
                    <span className="strategic-card__highlight-month">{getGroupLabel(group)}</span>
                    <span className="strategic-card__highlight-count">
                      Score {group.normalizedScore.toFixed(2)} • Weight {group.weightSum.toFixed(1)}
                    </span>
                    <span className="strategic-card__highlight-change">
                      Percentile {Math.round(group.percentileRank * 100)} • Incidents{' '}
                      {group.totalIncidents.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
              {emerging.length === 0 ? <p>No emerging groups below threshold.</p> : null}
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

export default StrategicPriorityScoreCard;
