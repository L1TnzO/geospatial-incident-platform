import { useId } from 'react';
import type { StrategicQueryState } from '@/hooks/useStrategicQuery';
import type { StrategicTypeTimelinePoint, StrategicTypeTimelineResponse } from '@/types/strategic';

interface StrategicTypeTimelinePanelProps {
  state: StrategicQueryState<StrategicTypeTimelineResponse>;
}

const StrategicTypeTimelinePanel = ({ state }: StrategicTypeTimelinePanelProps) => {
  const titleId = useId();

  const handleRefresh = () => {
    state.refresh();
  };

  const { data } = state;
  const topTypes = data?.types.slice(0, 5) ?? [];
  const latestMonth = data?.totalsByMonth.at(-1);

  const formatMonthLabel = (iso?: string) => {
    if (!iso) {
      return '—';
    }
    return new Date(iso).toLocaleString(undefined, { month: 'short', year: 'numeric' });
  };

  const describePeak = (points: StrategicTypeTimelinePoint[]) => {
    if (points.length === 0) {
      return 'No monthly detail yet';
    }

    const peak = points.reduce((max, point) => (point.count > max.count ? point : max));
    return `Peak month: ${formatMonthLabel(peak.start)} (${peak.count.toLocaleString()} incidents)`;
  };

  return (
    <article className="strategic-card" aria-busy={state.isLoading} aria-labelledby={titleId}>
      <header className="strategic-card__header">
        <div>
          <h3 id={titleId}>Incident type timelines</h3>
          <p className="strategic-card__subtitle">
            Highest-volume incident types across the selected timeframe with month-ending totals.
          </p>
        </div>
        <button type="button" className="strategic-card__refresh" onClick={handleRefresh}>
          Refresh
        </button>
      </header>
      <div className="strategic-card__body">
        {state.isLoading || state.isIdle ? (
          <p className="strategic-card__status" role="status">
            Loading incident timelines…
          </p>
        ) : null}
        {state.isError ? (
          <div className="strategic-card__status" role="alert">
            <p>{state.error ?? 'Unable to load incident type timelines.'}</p>
            <button type="button" onClick={handleRefresh}>
              Try again
            </button>
          </div>
        ) : null}
        {state.isSuccess && data ? (
          <div className="strategic-card__content">
            <dl className="strategic-card__metrics strategic-card__metrics--list">
              <div>
                <dt>Latest month</dt>
                <dd>
                  {latestMonth ? (
                    <>
                      <span>{formatMonthLabel(latestMonth.start)}</span>
                      <span>{latestMonth.count.toLocaleString()} total incidents</span>
                    </>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
            </dl>
            <div className="strategic-card__highlight">
              <h4>Top incident types</h4>
              <ul>
                {topTypes.map((type) => (
                  <li key={type.type.code}>
                    <span className="strategic-card__highlight-month">{type.type.name}</span>
                    <span className="strategic-card__highlight-count">
                      {type.total.toLocaleString()} total incidents
                    </span>
                    <span className="strategic-card__highlight-change">
                      {describePeak(type.points)}
                    </span>
                  </li>
                ))}
              </ul>
              {topTypes.length === 0 ? (
                <p>No type timelines available for the current filter set.</p>
              ) : null}
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

export default StrategicTypeTimelinePanel;
