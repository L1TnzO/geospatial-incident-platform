import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DashboardSeverityDistributionChart from './DashboardSeverityDistributionChart';
import type { DashboardQueryState } from '@/hooks/useDashboardQuery';
import type { DashboardSeverityDistribution } from '@/types/dashboard';

const buildState = (
  overrides: Partial<DashboardQueryState<DashboardSeverityDistribution>>
): DashboardQueryState<DashboardSeverityDistribution> => ({
  status: 'success',
  data: null,
  error: null,
  lastUpdated: null,
  refresh: vi.fn(),
  ...overrides,
});

describe('DashboardSeverityDistributionChart', () => {
  it('renders loading state', () => {
    const state = buildState({ status: 'loading' });
    render(<DashboardSeverityDistributionChart distribution={state} />);

    expect(screen.getByText(/loading severity distribution/i)).toBeInTheDocument();
  });

  it('renders error state with retry', () => {
    const refresh = vi.fn();
    const state = buildState({ status: 'error', error: 'Fetch failed', refresh });
    render(<DashboardSeverityDistributionChart distribution={state} />);

    expect(screen.getByText(/fetch failed/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('renders empty state with refresh', () => {
    const refresh = vi.fn();
    const data: DashboardSeverityDistribution = { total: 0, buckets: [] };
    const state = buildState({ data, refresh });
    render(<DashboardSeverityDistributionChart distribution={state} />);

    expect(screen.getByText(/no severity data yet/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /refresh data/i }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('renders severity donut and legend', () => {
    const distribution: DashboardSeverityDistribution = {
      total: 14,
      buckets: [
        {
          severity: {
            code: 'CRITICAL',
            name: 'Critical',
            description: null,
            priority: 4,
            colorHex: '#dc2626',
          },
          count: 8,
          percentage: 57.14,
        },
        {
          severity: {
            code: 'MODERATE',
            name: 'Moderate',
            description: null,
            priority: 2,
            colorHex: '#f59e0b',
          },
          count: 6,
          percentage: 42.86,
        },
      ],
    };

    const state = buildState({ data: distribution, lastUpdated: '2025-01-11T12:05:00Z' });
    render(<DashboardSeverityDistributionChart distribution={state} />);

    expect(screen.getByRole('img', { name: /incident counts by severity/i })).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText(/critical/i)).toBeInTheDocument();
    expect(screen.getByText(/moderate/i)).toBeInTheDocument();
    expect(screen.getByText(/8 · 57.1%/i)).toBeInTheDocument();
    expect(screen.getByText(/6 · 42.9%/i)).toBeInTheDocument();
    expect(screen.getByText(/last refreshed/i)).toBeInTheDocument();
  });
});
