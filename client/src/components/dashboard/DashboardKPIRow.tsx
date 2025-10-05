import type { DashboardQueryState } from '@/hooks/useDashboardQuery';
import type { DashboardLast24HoursKpi } from '@/types/dashboard';

interface DashboardKPIRowProps {
  kpi: DashboardQueryState<DashboardLast24HoursKpi>;
}

const countFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const signedCountFormatter = new Intl.NumberFormat(undefined, {
  signDisplay: 'always',
  maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat(undefined, {
  signDisplay: 'always',
  maximumFractionDigits: 1,
});

const formatPercentageChange = (value: number | null): string => {
  if (value === null) {
    return 'N/A';
  }

  return `${percentageFormatter.format(value)}%`;
};

type TrendDirection = 'up' | 'down' | 'flat';

const getTrendDirection = (delta: number): TrendDirection => {
  if (delta > 0) {
    return 'up';
  }
  if (delta < 0) {
    return 'down';
  }
  return 'flat';
};

const TrendIcon = ({ direction }: { direction: TrendDirection }) => {
  switch (direction) {
    case 'up':
      return (
        <svg
          aria-hidden="true"
          className="dashboard-kpi-card__trend-icon"
          viewBox="0 0 24 24"
          focusable="false"
        >
          <path d="M12 4l7 7h-4v7h-6v-7H5l7-7z" />
        </svg>
      );
    case 'down':
      return (
        <svg
          aria-hidden="true"
          className="dashboard-kpi-card__trend-icon"
          viewBox="0 0 24 24"
          focusable="false"
        >
          <path d="M12 20l-7-7h4V6h6v7h4l-7 7z" />
        </svg>
      );
    default:
      return (
        <svg
          aria-hidden="true"
          className="dashboard-kpi-card__trend-icon"
          viewBox="0 0 24 24"
          focusable="false"
        >
          <path d="M5 12h14v2H5z" />
        </svg>
      );
  }
};

const formatWindow = (window: DashboardLast24HoursKpi['window']): string => {
  const start = new Date(window.start);
  const end = new Date(window.end);
  return `${start.toLocaleString()} – ${end.toLocaleString()}`;
};

const DashboardKPIRow = ({ kpi }: DashboardKPIRowProps) => {
  const isLoadingState = kpi.status === 'loading' || kpi.status === 'idle';

  const handleRefresh = () => {
    kpi.refresh();
  };

  if (isLoadingState) {
    return (
      <div className="dashboard-kpi-row" role="status" aria-live="polite">
        <div className="dashboard-placeholder">Loading KPI metrics…</div>
        <div className="dashboard-placeholder" aria-hidden="true" />
      </div>
    );
  }

  if (kpi.status === 'error') {
    return (
      <div className="dashboard-kpi-row" role="alert">
        <div className="dashboard-error">
          <p>{kpi.error ?? 'Unable to load KPI metrics.'}</p>
          <button type="button" className="dashboard-kpi-card__retry" onClick={handleRefresh}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const metric = kpi.data;

  if (!metric) {
    return (
      <div className="dashboard-kpi-row" role="status" aria-live="polite">
        <div className="dashboard-empty">No incidents recorded in the last 24 hours yet.</div>
      </div>
    );
  }

  const direction = getTrendDirection(metric.delta);
  const deltaText = signedCountFormatter.format(metric.delta);
  const percentageText = formatPercentageChange(metric.deltaPercentage);
  const comparisonLabel = `Compared to ${formatWindow(metric.previousWindow)} (${countFormatter.format(
    metric.previousCount
  )} incidents)`;
  const percentageNarrative =
    metric.deltaPercentage === null ? '' : ` (${formatPercentageChange(metric.deltaPercentage)})`;
  const trendAriaLabel =
    direction === 'flat'
      ? 'Incident count was unchanged compared to the previous 24 hour window.'
      : `Incident count ${direction === 'up' ? 'increased' : 'decreased'} by ${Math.abs(
          metric.delta
        )} incidents${percentageNarrative} compared to the previous 24 hour window.`;

  return (
    <div className="dashboard-kpi-row" role="list">
      <article
        className="dashboard-kpi-card dashboard-kpi-card--last24h"
        role="listitem"
        aria-label={`Incidents recorded ${formatWindow(metric.window)}. ${comparisonLabel}.`}
      >
        <header className="dashboard-kpi-card__header">
          <div>
            <p className="dashboard-kpi-card__label">Incidents (last 24h)</p>
            <p className="dashboard-kpi-card__value">
              {countFormatter.format(metric.currentCount)}
            </p>
          </div>
          <button
            type="button"
            className="dashboard-kpi-card__refresh"
            onClick={handleRefresh}
            disabled={isLoadingState}
          >
            Refresh KPI
          </button>
        </header>

        <div
          className={`dashboard-kpi-card__trend dashboard-kpi-card__trend--${direction}`}
          aria-label={trendAriaLabel}
        >
          <TrendIcon direction={direction} />
          <span className="dashboard-kpi-card__trend-delta">{deltaText}</span>
          <span className="dashboard-kpi-card__trend-percentage">{percentageText}</span>
          <span className="dashboard-kpi-card__trend-caption">vs previous 24h</span>
        </div>

        <p className="dashboard-kpi-card__comparison" title={comparisonLabel}>
          {comparisonLabel}
        </p>

        {kpi.lastUpdated && (
          <p className="dashboard-kpi-card__timestamp">
            Last refreshed{' '}
            <time dateTime={kpi.lastUpdated}>{new Date(kpi.lastUpdated).toLocaleString()}</time>
          </p>
        )}
      </article>
    </div>
  );
};

export default DashboardKPIRow;
