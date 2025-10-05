import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DashboardTypeDistributionChart from './DashboardTypeDistributionChart';
import type { DashboardQueryState } from '@/hooks/useDashboardQuery';
import type { DashboardTypeDistribution } from '@/types/dashboard';

const buildState = (
  overrides: Partial<DashboardQueryState<DashboardTypeDistribution>>
): DashboardQueryState<DashboardTypeDistribution> => ({
  status: 'success',
  data: null,
  error: null,
  lastUpdated: null,
  refresh: vi.fn(),
  ...overrides,
});

describe('DashboardTypeDistributionChart', () => {
  it('renders loading state', () => {
    const state = buildState({ status: 'loading' });
    render(<DashboardTypeDistributionChart distribution={state} />);

    expect(screen.getByText(/loading incident type distribution/i)).toBeInTheDocument();
  });

  it('renders error state with retry', () => {
    const refresh = vi.fn();
    const state = buildState({ status: 'error', error: 'Fetch failed', refresh });
    render(<DashboardTypeDistributionChart distribution={state} />);

    expect(screen.getByText(/fetch failed/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('renders empty state with refresh', () => {
    const refresh = vi.fn();
    const distribution: DashboardTypeDistribution = { total: 0, buckets: [] };
    const state = buildState({ data: distribution, refresh });
    render(<DashboardTypeDistributionChart distribution={state} />);

    expect(screen.getByText(/no type data yet/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /refresh data/i }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('renders bars and toggles between count and percentage', () => {
    const distribution: DashboardTypeDistribution = {
      total: 18,
      buckets: [
        {
          type: { code: 'FIRE', name: 'Structure Fire', description: null },
          count: 12,
          percentage: 66.67,
        },
        {
          type: { code: 'HAZMAT', name: 'Hazmat', description: null },
          count: 6,
          percentage: 33.33,
        },
      ],
    };

    const state = buildState({ data: distribution, lastUpdated: '2025-01-11T12:05:00Z' });
    render(<DashboardTypeDistributionChart distribution={state} />);

    expect(screen.getByRole('heading', { name: /incident types/i })).toBeInTheDocument();
    expect(screen.getByText(/structure fire/i)).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText(/last refreshed/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /percentage/i }));

    expect(screen.getByText(/66.7%/i)).toBeInTheDocument();
    expect(screen.getByText(/33.3%/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /percentage/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});
