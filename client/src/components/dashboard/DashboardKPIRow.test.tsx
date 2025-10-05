import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DashboardKPIRow from './DashboardKPIRow';
import type { DashboardQueryState } from '@/hooks/useDashboardQuery';
import type { DashboardLast24HoursKpi } from '@/types/dashboard';

const buildState = (
  overrides: Partial<DashboardQueryState<DashboardLast24HoursKpi>>
): DashboardQueryState<DashboardLast24HoursKpi> => ({
  status: 'success',
  data: null,
  error: null,
  lastUpdated: null,
  refresh: vi.fn(),
  ...overrides,
});

describe('DashboardKPIRow', () => {
  it('renders loading skeleton', () => {
    const state = buildState({ status: 'loading' });
    render(<DashboardKPIRow kpi={state} />);

    expect(screen.getByText(/loading kpi metrics/i)).toBeInTheDocument();
  });

  it('renders error state with retry', () => {
    const refresh = vi.fn();
    const state = buildState({ status: 'error', error: 'Network hiccup', refresh });
    render(<DashboardKPIRow kpi={state} />);

    expect(screen.getByText(/network hiccup/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('renders KPI data with trend indicators', () => {
    const metric: DashboardLast24HoursKpi = {
      window: {
        start: '2025-01-10T12:00:00Z',
        end: '2025-01-11T12:00:00Z',
      },
      previousWindow: {
        start: '2025-01-09T12:00:00Z',
        end: '2025-01-10T12:00:00Z',
      },
      currentCount: 18,
      previousCount: 14,
      delta: 4,
      deltaPercentage: 28.57,
    };

    const state = buildState({ data: metric, lastUpdated: '2025-01-11T12:05:00Z' });
    render(<DashboardKPIRow kpi={state} />);

    expect(screen.getByText(/incidents \(last 24h\)/i)).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('+4')).toBeInTheDocument();
    expect(screen.getByText('+28.6%')).toBeInTheDocument();
    expect(screen.getByText(/compared to/i)).toHaveTextContent(/14 incidents/i);
    expect(screen.getByText(/last refreshed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh kpi/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/incident count increased by 4 incidents/i)).toBeInTheDocument();
  });

  it('renders flat trend when delta is zero', () => {
    const metric: DashboardLast24HoursKpi = {
      window: {
        start: '2025-01-10T12:00:00Z',
        end: '2025-01-11T12:00:00Z',
      },
      previousWindow: {
        start: '2025-01-09T12:00:00Z',
        end: '2025-01-10T12:00:00Z',
      },
      currentCount: 10,
      previousCount: 10,
      delta: 0,
      deltaPercentage: 0,
    };

    const state = buildState({ data: metric });
    render(<DashboardKPIRow kpi={state} />);

    expect(
      screen.getByLabelText(/incident count was unchanged compared to the previous 24 hour window/i)
    ).toBeInTheDocument();
  });
});
