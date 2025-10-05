import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DashboardDailyTrendChart from './DashboardDailyTrendChart';
import type { DashboardQueryState } from '@/hooks/useDashboardQuery';
import type { DashboardDailyTrend } from '@/types/dashboard';

const buildState = (
  overrides: Partial<DashboardQueryState<DashboardDailyTrend>>
): DashboardQueryState<DashboardDailyTrend> => ({
  status: 'success',
  data: null,
  error: null,
  lastUpdated: null,
  refresh: vi.fn(),
  ...overrides,
});

describe('DashboardDailyTrendChart', () => {
  it('renders loading state', () => {
    const state = buildState({ status: 'loading' });
    render(<DashboardDailyTrendChart trend={state} />);

    expect(screen.getByText(/loading incident daily trend/i)).toBeInTheDocument();
  });

  it('renders error state with retry', () => {
    const refresh = vi.fn();
    const state = buildState({ status: 'error', error: 'Trend failed', refresh });
    render(<DashboardDailyTrendChart trend={state} />);

    expect(screen.getByText(/trend failed/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('renders empty state', () => {
    const refresh = vi.fn();
    const state = buildState({
      data: {
        points: [],
        trend: {
          change: 0,
          currentTotal: 0,
          previousTotal: 0,
          percentageChange: null,
          direction: 'flat',
        },
      },
      refresh,
    });
    render(<DashboardDailyTrendChart trend={state} />);

    expect(screen.getByText(/trend data will appear/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /refresh data/i }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('renders chart and summary', () => {
    const data: DashboardDailyTrend = {
      points: [
        { date: '2025-01-01T00:00:00Z', count: 2 },
        { date: '2025-01-02T00:00:00Z', count: 3 },
        { date: '2025-01-03T00:00:00Z', count: 4 },
        { date: '2025-01-04T00:00:00Z', count: 5 },
        { date: '2025-01-05T00:00:00Z', count: 6 },
        { date: '2025-01-06T00:00:00Z', count: 7 },
        { date: '2025-01-07T00:00:00Z', count: 8 },
        { date: '2025-01-08T00:00:00Z', count: 9 },
        { date: '2025-01-09T00:00:00Z', count: 10 },
      ],
      trend: {
        currentTotal: 55,
        previousTotal: 42,
        change: 13,
        percentageChange: 30.95,
        direction: 'up',
      },
    };

    const state = buildState({ data, lastUpdated: '2025-01-11T12:05:00Z' });
    render(<DashboardDailyTrendChart trend={state} />);

    expect(screen.getByRole('figure', { name: /incident counts per day/i })).toBeInTheDocument();
    expect(screen.getByText(/last 30 days/i)).toBeInTheDocument();
    expect(screen.getByText(/7-day trend:/i)).toBeInTheDocument();
    expect(screen.getByText(/direction: upward trend/i)).toBeInTheDocument();
    expect(screen.getByText(/last refreshed/i)).toBeInTheDocument();
  });
});
