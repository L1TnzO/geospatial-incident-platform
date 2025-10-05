import type { DashboardQueryState } from '@/hooks/useDashboardQuery';
import type { DashboardDailyTrend } from '@/types/dashboard';

interface DashboardDailyTrendChartProps {
  trend: DashboardQueryState<DashboardDailyTrend>;
}

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

const formatLongDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const DashboardDailyTrendChart = ({ trend }: DashboardDailyTrendChartProps) => {
  const handleRefresh = () => {
    trend.refresh();
  };

  if (trend.status === 'loading' || trend.status === 'idle') {
    return (
      <div className="dashboard-trend-card" role="status" aria-live="polite">
        <h3>Daily Trend</h3>
        <p className="dashboard-loading">Loading incident daily trend…</p>
        <div className="dashboard-placeholder" aria-hidden="true" />
        <div className="dashboard-placeholder" aria-hidden="true" />
      </div>
    );
  }

  if (trend.status === 'error') {
    return (
      <div className="dashboard-trend-card" role="alert">
        <h3>Daily Trend</h3>
        <div className="dashboard-error">
          <p>{trend.error ?? 'Unable to load daily trend data.'}</p>
          <button type="button" className="dashboard-daily-trend__retry" onClick={handleRefresh}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const data = trend.data;

  if (!data || data.points.length === 0) {
    return (
      <div className="dashboard-trend-card" role="status" aria-live="polite">
        <h3>Daily Trend</h3>
        <p className="dashboard-empty">Trend data will appear once incidents stream in.</p>
        <button type="button" className="dashboard-daily-trend__refresh" onClick={handleRefresh}>
          Refresh data
        </button>
      </div>
    );
  }

  const points = data.points.slice(-30);

  const metrics = data.trend;
  const minimum = Math.min(...points.map((point) => point.count));
  const maximum = Math.max(...points.map((point) => point.count));
  const yRange = maximum === minimum ? 1 : maximum - minimum;

  const paddingX = 24;
  const paddingY = 24;
  const width = 600;
  const height = 220;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;

  const svgPoints = points.map((point, index) => {
    const x = paddingX + (index / Math.max(points.length - 1, 1)) * usableWidth;
    const y = paddingY + (1 - (point.count - minimum) / yRange) * usableHeight;
    return { ...point, x, y };
  });

  const pathD = svgPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaPathD = [
    `M ${svgPoints[0].x} ${svgPoints[0].y}`,
    ...svgPoints.slice(1).map((point) => `L ${point.x} ${point.y}`),
    `L ${svgPoints[svgPoints.length - 1].x} 244`,
    `L ${svgPoints[0].x} 244`,
    'Z',
  ].join(' ');

  const highlightStartIndex = Math.max(svgPoints.length - 7, 0);
  const highlightPoints = svgPoints.slice(highlightStartIndex);
  const highlightPath = [
    `M ${highlightPoints[0].x} ${highlightPoints[0].y}`,
    ...highlightPoints.slice(1).map((point) => `L ${point.x} ${point.y}`),
  ].join(' ');

  const percentageDisplay =
    metrics.percentageChange === null
      ? 'n/a'
      : `${metrics.percentageChange >= 0 ? '+' : ''}${metrics.percentageChange.toFixed(1)}%`;

  return (
    <section className="dashboard-trend-card" aria-label="Daily incident trend" role="listitem">
      <header className="dashboard-daily-trend__header">
        <div>
          <h3>Daily Trend</h3>
          <p className="dashboard-daily-trend__subtitle">
            Last 30 days · {metrics.currentTotal.toLocaleString()} incidents
          </p>
        </div>
        <button type="button" className="dashboard-daily-trend__refresh" onClick={handleRefresh}>
          Refresh data
        </button>
      </header>

      <figure
        className="dashboard-daily-trend__chart"
        role="figure"
        aria-label="Incident counts per day"
      >
        <svg viewBox="0 0 600 244" role="presentation" aria-hidden="true">
          <defs>
            <linearGradient id="dailyTrendArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(37, 99, 235, 0.25)" />
              <stop offset="100%" stopColor="rgba(37, 99, 235, 0)" />
            </linearGradient>
            <linearGradient id="dailyTrendHighlight" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(16, 185, 129, 0.5)" />
              <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
            </linearGradient>
          </defs>

          <path d={areaPathD} fill="url(#dailyTrendArea)" />
          {highlightPoints.length > 1 && (
            <path
              d={`M ${highlightPoints[0].x} ${highlightPoints[0].y} ${highlightPath} L ${
                highlightPoints[highlightPoints.length - 1].x
              } 244 L ${highlightPoints[0].x} 244 Z`}
              fill="url(#dailyTrendHighlight)"
            />
          )}
          <path
            d={pathD}
            fill="none"
            stroke="rgba(37, 99, 235, 0.9)"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <path
            d={highlightPath}
            fill="none"
            stroke="rgba(16, 185, 129, 0.9)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="6 4"
          />

          {svgPoints.map((point) => (
            <g key={point.date} className="dashboard-daily-trend__point">
              <circle cx={point.x} cy={point.y} r={4} />
              <title>
                {formatLongDate(point.date)}: {point.count.toLocaleString()} incidents
              </title>
            </g>
          ))}
        </svg>

        <ul className="dashboard-daily-trend__ticks" aria-hidden="true">
          <li>{formatDate(points[0].date)}</li>
          <li>{formatDate(points[Math.floor(points.length / 2)].date)}</li>
          <li>{formatDate(points[points.length - 1].date)}</li>
        </ul>
      </figure>

      <div className="dashboard-daily-trend__summary">
        <p>
          7-day trend:{' '}
          <strong>
            {metrics.change >= 0 ? '+' : ''}
            {metrics.change.toLocaleString()}
          </strong>{' '}
          incidents ({percentageDisplay})
        </p>
        <p>
          Current 7-day total: <strong>{metrics.currentTotal.toLocaleString()}</strong> · Previous:{' '}
          <strong>{metrics.previousTotal.toLocaleString()}</strong>
        </p>
        <p
          className={`dashboard-daily-trend__direction dashboard-daily-trend__direction--${metrics.direction}`}
        >
          Direction:{' '}
          {metrics.direction === 'up'
            ? 'Upward'
            : metrics.direction === 'down'
              ? 'Downward'
              : 'Flat'}{' '}
          trend
        </p>
      </div>

      {trend.lastUpdated && (
        <p className="dashboard-daily-trend__timestamp">
          Last refreshed{' '}
          <time dateTime={trend.lastUpdated}>{new Date(trend.lastUpdated).toLocaleString()}</time>
        </p>
      )}
    </section>
  );
};

export default DashboardDailyTrendChart;
