import { useState } from 'react';
import type { DashboardQueryState } from '@/hooks/useDashboardQuery';
import type { DashboardTypeDistribution } from '@/types/dashboard';

export type TypeChartMode = 'count' | 'percentage';

interface DashboardTypeDistributionChartProps {
  distribution: DashboardQueryState<DashboardTypeDistribution>;
}

const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

const DashboardTypeDistributionChart = ({ distribution }: DashboardTypeDistributionChartProps) => {
  const [mode, setMode] = useState<TypeChartMode>('count');

  const handleRefresh = () => {
    distribution.refresh();
  };

  if (distribution.status === 'loading' || distribution.status === 'idle') {
    return (
      <div className="dashboard-chart-card" role="status" aria-live="polite">
        <h3>Incident Types</h3>
        <p className="dashboard-loading">Loading incident type distribution…</p>
        <div className="dashboard-placeholder" aria-hidden="true" />
        <div className="dashboard-placeholder" aria-hidden="true" />
        <div className="dashboard-placeholder" aria-hidden="true" />
      </div>
    );
  }

  if (distribution.status === 'error') {
    return (
      <div className="dashboard-chart-card" role="alert">
        <h3>Incident Types</h3>
        <div className="dashboard-error">
          <p>{distribution.error ?? 'Unable to load incident type distribution.'}</p>
          <button type="button" className="dashboard-type-chart__retry" onClick={handleRefresh}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const data = distribution.data?.buckets ?? [];

  if (data.length === 0) {
    return (
      <div className="dashboard-chart-card" role="status" aria-live="polite">
        <h3>Incident Types</h3>
        <p className="dashboard-empty">No type data yet. Configure filters to begin.</p>
        <button type="button" className="dashboard-type-chart__refresh" onClick={handleRefresh}>
          Refresh data
        </button>
      </div>
    );
  }

  const maxCount = data.reduce((max, bucket) => Math.max(max, bucket.count), 0);

  const bars = data.map((bucket) => {
    const count = bucket.count;
    const percentage = bucket.percentage;
    const value = mode === 'count' ? count : percentage;
    const maxValue = mode === 'count' ? maxCount : 100;
    const normalized = maxValue === 0 ? 0 : (value / maxValue) * 100;
    const visualWidth = value === 0 ? 0 : Math.max(normalized, 6);
    const displayValue = mode === 'count' ? count.toLocaleString() : formatPercentage(percentage);
    const tooltip = `${bucket.type.name}: ${count.toLocaleString()} incidents (${formatPercentage(
      percentage
    )})`;

    return {
      id: bucket.type.code,
      label: bucket.type.name,
      visualWidth,
      displayValue,
      tooltip,
      count,
      percentage,
    };
  });

  return (
    <div className="dashboard-chart-card" role="listitem" aria-label="Incident type distribution">
      <header className="dashboard-type-chart__header">
        <div>
          <h3>Incident Types</h3>
          <p className="dashboard-type-chart__subtitle">
            Last 7 days · {distribution.data?.total.toLocaleString() ?? 0} incidents
          </p>
        </div>
        <div className="dashboard-type-chart__controls" role="group" aria-label="Display mode">
          <button
            type="button"
            className={`dashboard-type-chart__toggle ${mode === 'count' ? 'is-active' : ''}`}
            onClick={() => setMode('count')}
            aria-pressed={mode === 'count'}
          >
            Count
          </button>
          <button
            type="button"
            className={`dashboard-type-chart__toggle ${mode === 'percentage' ? 'is-active' : ''}`}
            onClick={() => setMode('percentage')}
            aria-pressed={mode === 'percentage'}
          >
            Percentage
          </button>
        </div>
      </header>

      <ul className="dashboard-type-chart__bars" role="list">
        {bars.map((bar) => (
          <li
            key={bar.id}
            className="dashboard-type-chart__bar"
            role="listitem"
            aria-label={bar.tooltip}
            title={bar.tooltip}
          >
            <div className="dashboard-type-chart__bar-label" aria-hidden="true">
              <span>{bar.label}</span>
            </div>
            <div className="dashboard-type-chart__bar-track" aria-hidden="true">
              <div
                className={`dashboard-type-chart__bar-fill dashboard-type-chart__bar-fill--${mode}`}
                style={{ width: `${bar.visualWidth}%` }}
              />
            </div>
            <div className="dashboard-type-chart__bar-value" aria-hidden="true">
              <span>{bar.displayValue}</span>
            </div>
          </li>
        ))}
      </ul>

      <footer className="dashboard-type-chart__footer">
        <button type="button" className="dashboard-type-chart__refresh" onClick={handleRefresh}>
          Refresh data
        </button>
        {distribution.lastUpdated && (
          <p className="dashboard-type-chart__timestamp">
            Last refreshed{' '}
            <time dateTime={distribution.lastUpdated}>
              {new Date(distribution.lastUpdated).toLocaleString()}
            </time>
          </p>
        )}
      </footer>
    </div>
  );
};

export default DashboardTypeDistributionChart;
