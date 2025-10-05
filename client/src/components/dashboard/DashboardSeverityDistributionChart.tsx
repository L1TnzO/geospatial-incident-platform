import type { DashboardQueryState } from '@/hooks/useDashboardQuery';
import type { DashboardSeverityDistribution } from '@/types/dashboard';

interface DashboardSeverityDistributionChartProps {
  distribution: DashboardQueryState<DashboardSeverityDistribution>;
}

const percentageFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

const DashboardSeverityDistributionChart = ({
  distribution,
}: DashboardSeverityDistributionChartProps) => {
  const handleRefresh = () => {
    distribution.refresh();
  };

  if (distribution.status === 'loading' || distribution.status === 'idle') {
    return (
      <div className="dashboard-severity-chart" role="status" aria-live="polite">
        <h3>Severity Mix</h3>
        <p className="dashboard-loading">Loading severity distribution…</p>
        <div className="dashboard-placeholder" aria-hidden="true" />
        <div className="dashboard-placeholder" aria-hidden="true" />
      </div>
    );
  }

  if (distribution.status === 'error') {
    return (
      <div className="dashboard-severity-chart" role="alert">
        <h3>Severity Mix</h3>
        <div className="dashboard-error">
          <p>{distribution.error ?? 'Unable to load severity distribution.'}</p>
          <button type="button" className="dashboard-severity-chart__retry" onClick={handleRefresh}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const buckets = distribution.data?.buckets ?? [];
  const total = distribution.data?.total ?? 0;

  if (buckets.length === 0 || total === 0) {
    return (
      <div className="dashboard-severity-chart" role="status" aria-live="polite">
        <h3>Severity Mix</h3>
        <p className="dashboard-empty">No severity data yet. Adjust timeframe filters if needed.</p>
        <button type="button" className="dashboard-severity-chart__refresh" onClick={handleRefresh}>
          Refresh data
        </button>
      </div>
    );
  }

  let cursor = 0;
  const segments = buckets.map((bucket, index) => {
    const start = cursor;
    cursor += bucket.percentage;
    const end = index === buckets.length - 1 ? 100 : Math.min(100, cursor);

    return {
      start,
      end,
      bucket,
    };
  });

  const gradientStops = segments
    .map(({ start, end, bucket }) => {
      const safeColor = bucket.severity.colorHex ?? '#1f2937';
      return `${safeColor} ${start}% ${end}%`;
    })
    .join(', ');

  const gradientStyle = {
    background: `conic-gradient(${gradientStops})`,
  } as const;

  return (
    <section
      className="dashboard-severity-chart"
      aria-label="Severity distribution"
      role="listitem"
    >
      <header className="dashboard-severity-chart__header">
        <div>
          <h3>Severity Mix</h3>
          <p className="dashboard-severity-chart__subtitle">
            Last 7 days · {total.toLocaleString()} incidents
          </p>
        </div>
        <button type="button" className="dashboard-severity-chart__refresh" onClick={handleRefresh}>
          Refresh data
        </button>
      </header>

      <div className="dashboard-severity-chart__body">
        <div
          className="dashboard-severity-chart__donut"
          role="img"
          aria-label="Incident counts by severity"
          style={gradientStyle}
        >
          <div className="dashboard-severity-chart__center">
            <span className="dashboard-severity-chart__total">{total.toLocaleString()}</span>
            <span className="dashboard-severity-chart__label">Incidents</span>
          </div>
        </div>

        <ul className="dashboard-severity-chart__legend" role="list">
          {segments.map(({ bucket }) => {
            const percentageText = percentageFormatter.format(bucket.percentage);
            const tooltip = `${bucket.severity.name}: ${bucket.count.toLocaleString()} incidents (${percentageText}%)`;

            return (
              <li
                key={bucket.severity.code}
                className="dashboard-severity-chart__legend-item"
                role="listitem"
                aria-label={tooltip}
                title={tooltip}
              >
                <span
                  className="dashboard-severity-chart__swatch"
                  style={{ backgroundColor: bucket.severity.colorHex ?? '#1f2937' }}
                  aria-hidden="true"
                />
                <div className="dashboard-severity-chart__legend-text">
                  <span className="dashboard-severity-chart__legend-label">
                    {bucket.severity.name}
                  </span>
                  <span className="dashboard-severity-chart__legend-value">
                    {bucket.count.toLocaleString()} · {percentageText}%
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {distribution.lastUpdated && (
        <p className="dashboard-severity-chart__timestamp">
          Last refreshed{' '}
          <time dateTime={distribution.lastUpdated}>
            {new Date(distribution.lastUpdated).toLocaleString()}
          </time>
        </p>
      )}
    </section>
  );
};

export default DashboardSeverityDistributionChart;
