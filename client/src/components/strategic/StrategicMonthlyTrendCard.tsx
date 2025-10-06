import { useId } from 'react';
import type { StrategicQueryState } from '@/hooks/useStrategicQuery';
import type { StrategicMonthlyTrendResponse } from '@/types/strategic';

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return '—';
  }
  return value.toLocaleString();
};

const renderChange = (delta: number | null, percentage: number | null) => {
  if (delta === null && percentage === null) {
    return 'Change data unavailable';
  }

  const pieces: string[] = [];
  if (delta !== null) {
    const sign = delta > 0 ? '+' : '';
    pieces.push(`${sign}${delta.toLocaleString()} incidents`);
  }
  if (percentage !== null) {
    const sign = percentage > 0 ? '+' : '';
    const rounded = Math.abs(percentage) < 1 ? percentage.toFixed(2) : percentage.toFixed(1);
    pieces.push(`${sign}${rounded}%`);
  }
  return pieces.join(' • ');
};

interface StrategicMonthlyTrendCardProps {
  state: StrategicQueryState<StrategicMonthlyTrendResponse>;
}

const StrategicMonthlyTrendCard = ({ state }: StrategicMonthlyTrendCardProps) => {
  const titleId = useId();

  const handleRefresh = () => {
    state.refresh();
  };

  const { data } = state;
  const highlight = data?.series.slice(-3) ?? [];

  return (
    <article className="strategic-card" aria-busy={state.isLoading} aria-labelledby={titleId}>
      <header className="strategic-card__header">
        <div>
          <h3 id={titleId}>Monthly trendline</h3>
          <p className="strategic-card__subtitle">
            Rolling incident totals compared year-over-year across the active filter set.
          </p>
        </div>
        <button type="button" className="strategic-card__refresh" onClick={handleRefresh}>
          Refresh
        </button>
      </header>
      <div className="strategic-card__body">
        {state.isLoading || state.isIdle ? (
          <p className="strategic-card__status" role="status">
            Loading monthly trend data…
          </p>
        ) : null}
        {state.isError ? (
          <div className="strategic-card__status" role="alert">
            <p>{state.error ?? 'Unable to load monthly trends.'}</p>
            <button type="button" onClick={handleRefresh}>
              Try again
            </button>
          </div>
        ) : null}
        {state.isSuccess && data ? (
          <div className="strategic-card__content">
            <dl className="strategic-card__metrics">
              <div>
                <dt>Current period total</dt>
                <dd>{formatNumber(data.totals.currentPeriodTotal)}</dd>
              </div>
              <div>
                <dt>Previous period total</dt>
                <dd>{formatNumber(data.totals.previousPeriodTotal)}</dd>
              </div>
              <div>
                <dt>Change</dt>
                <dd>{renderChange(data.totals.periodDelta, data.totals.periodPercentage)}</dd>
              </div>
            </dl>
            <div className="strategic-card__highlight">
              <h4>Recent months</h4>
              <ul>
                {highlight.map((point) => (
                  <li key={point.month}>
                    <span className="strategic-card__highlight-month">{point.label}</span>
                    <span className="strategic-card__highlight-count">
                      {point.count.toLocaleString()} incidents
                    </span>
                    <span className="strategic-card__highlight-change">
                      {renderChange(point.monthOverMonthDelta, point.monthOverMonthPercentage)}
                    </span>
                  </li>
                ))}
              </ul>
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

export default StrategicMonthlyTrendCard;
