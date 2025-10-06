import { useId } from 'react';
import type { StrategicQueryState } from '@/hooks/useStrategicQuery';
import type { StrategicQuarterlyTrendResponse } from '@/types/strategic';

const formatQuarterLabel = (label?: string | null, fallback: string = '—') => {
  if (!label) {
    return fallback;
  }
  return label;
};

const formatChange = (delta: number | null, percentage: number | null) => {
  if (delta === null && percentage === null) {
    return 'No quarter-over-quarter change data';
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

interface StrategicQuarterlySummaryProps {
  state: StrategicQueryState<StrategicQuarterlyTrendResponse>;
}

const StrategicQuarterlySummary = ({ state }: StrategicQuarterlySummaryProps) => {
  const titleId = useId();

  const handleRefresh = () => {
    state.refresh();
  };

  const { data } = state;
  const current = data?.summary.current;
  const previous = data?.summary.previous;
  const yoy = data?.summary.yearOverYearReference;

  return (
    <article className="strategic-card" aria-busy={state.isLoading} aria-labelledby={titleId}>
      <header className="strategic-card__header">
        <div>
          <h3 id={titleId}>Quarterly comparison</h3>
          <p className="strategic-card__subtitle">
            Track quarter-over-quarter momentum and year-over-year alignment for executive
            scorecards.
          </p>
        </div>
        <button type="button" className="strategic-card__refresh" onClick={handleRefresh}>
          Refresh
        </button>
      </header>
      <div className="strategic-card__body">
        {state.isLoading || state.isIdle ? (
          <p className="strategic-card__status" role="status">
            Loading quarterly trend data…
          </p>
        ) : null}
        {state.isError ? (
          <div className="strategic-card__status" role="alert">
            <p>{state.error ?? 'Unable to load quarterly trends.'}</p>
            <button type="button" onClick={handleRefresh}>
              Try again
            </button>
          </div>
        ) : null}
        {state.isSuccess && data ? (
          <div className="strategic-card__content strategic-card__content--inline">
            <dl className="strategic-card__metrics strategic-card__metrics--grid">
              <div>
                <dt>Current quarter</dt>
                <dd>
                  <strong>{formatQuarterLabel(current?.label)}</strong>
                  <span>{current ? `${current.count.toLocaleString()} incidents` : '—'}</span>
                </dd>
              </div>
              <div>
                <dt>Previous quarter</dt>
                <dd>
                  <strong>{formatQuarterLabel(previous?.label)}</strong>
                  <span>{previous ? `${previous.count.toLocaleString()} incidents` : '—'}</span>
                </dd>
              </div>
              <div>
                <dt>Quarter-over-quarter change</dt>
                <dd>{formatChange(data.summary.delta, data.summary.percentage)}</dd>
              </div>
              <div>
                <dt>Year-over-year reference</dt>
                <dd>
                  <strong>{formatQuarterLabel(yoy?.label)}</strong>
                  <span>
                    {formatChange(
                      data.summary.yearOverYearDelta,
                      data.summary.yearOverYearPercentage
                    )}
                  </span>
                </dd>
              </div>
            </dl>
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

export default StrategicQuarterlySummary;
