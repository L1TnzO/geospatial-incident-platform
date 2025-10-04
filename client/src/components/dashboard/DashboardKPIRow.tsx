import type { DashboardAggregationsState } from '@/hooks/useDashboardAggregations';
import type { DashboardKpi } from '@/types/dashboard';

interface DashboardKPIRowProps {
  summary: DashboardAggregationsState;
}

const valueFormatter = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const deltaFormatter = new Intl.NumberFormat(undefined, {
  signDisplay: 'always',
  maximumFractionDigits: 1,
});

const formatValue = (value: DashboardKpi['value'], unit?: string | null): string => {
  if (value === null || value === undefined) {
    return '—';
  }

  const formatted = valueFormatter.format(value);
  return unit ? `${formatted} ${unit}` : formatted;
};

const formatDelta = (delta: number | null | undefined): string => {
  if (delta === null || delta === undefined) {
    return '—';
  }

  return `${deltaFormatter.format(delta)}%`;
};

const DashboardKPIRow = ({ summary }: DashboardKPIRowProps) => {
  if (summary.status === 'loading' || summary.status === 'idle') {
    return (
      <div className="dashboard-kpi-row" role="status" aria-live="polite">
        <div className="dashboard-placeholder">Loading KPI metrics…</div>
        <div className="dashboard-placeholder" aria-hidden="true" />
        <div className="dashboard-placeholder" aria-hidden="true" />
      </div>
    );
  }

  if (summary.status === 'error') {
    return (
      <div className="dashboard-kpi-row" role="alert">
        <div className="dashboard-error">{summary.error ?? 'Unable to load KPI metrics.'}</div>
      </div>
    );
  }

  const kpis = summary.data?.kpis ?? [];

  if (kpis.length === 0) {
    return (
      <div className="dashboard-kpi-row" role="status" aria-live="polite">
        <div className="dashboard-empty">KPI metrics will appear here soon.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-kpi-row" role="list">
      {kpis.map((kpi) => (
        <article key={kpi.id} className="dashboard-kpi-card" role="listitem">
          <p className="dashboard-kpi-card__label">{kpi.label}</p>
          <p className="dashboard-kpi-card__value">{formatValue(kpi.value, kpi.unit)}</p>
          <p className="dashboard-kpi-card__delta">Change: {formatDelta(kpi.delta)}</p>
        </article>
      ))}
    </div>
  );
};

export default DashboardKPIRow;
