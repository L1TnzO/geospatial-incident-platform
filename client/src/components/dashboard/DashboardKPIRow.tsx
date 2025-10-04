import type { DashboardQueryState } from '@/hooks/useDashboardQuery';
import type { DashboardLast24HoursKpi } from '@/types/dashboard';

interface DashboardKPIRowProps {
  kpi: DashboardQueryState<DashboardLast24HoursKpi>;
}

const valueFormatter = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const deltaFormatter = new Intl.NumberFormat(undefined, {
  signDisplay: 'always',
  maximumFractionDigits: 1,
});

const formatValue = (value: number | null | undefined, unit?: string | null): string => {
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

const DashboardKPIRow = ({ kpi }: DashboardKPIRowProps) => {
  if (kpi.status === 'loading' || kpi.status === 'idle') {
    return (
      <div className="dashboard-kpi-row" role="status" aria-live="polite">
        <div className="dashboard-placeholder">Loading KPI metrics…</div>
        <div className="dashboard-placeholder" aria-hidden="true" />
        <div className="dashboard-placeholder" aria-hidden="true" />
      </div>
    );
  }

  if (kpi.status === 'error') {
    return (
      <div className="dashboard-kpi-row" role="alert">
        <div className="dashboard-error">{kpi.error ?? 'Unable to load KPI metrics.'}</div>
      </div>
    );
  }

  const metric = kpi.data;

  if (!metric) {
    return (
      <div className="dashboard-kpi-row" role="status" aria-live="polite">
        <div className="dashboard-empty">KPI metrics will appear here soon.</div>
      </div>
    );
  }

  const cards = [
    {
      id: 'current',
      label: 'Incidents (last 24h)',
      value: metric.currentCount,
      unit: null,
      delta: metric.deltaPercentage,
    },
    {
      id: 'previous',
      label: 'Incidents (previous 24h)',
      value: metric.previousCount,
      unit: null,
      delta: null,
    },
    {
      id: 'change',
      label: 'Net change',
      value: metric.delta,
      unit: null,
      delta: metric.deltaPercentage,
    },
  ];

  return (
    <div className="dashboard-kpi-row" role="list">
      {cards.map((card) => (
        <article key={card.id} className="dashboard-kpi-card" role="listitem">
          <p className="dashboard-kpi-card__label">{card.label}</p>
          <p className="dashboard-kpi-card__value">{formatValue(card.value, card.unit)}</p>
          <p className="dashboard-kpi-card__delta">Change: {formatDelta(card.delta)}</p>
        </article>
      ))}
    </div>
  );
};

export default DashboardKPIRow;
