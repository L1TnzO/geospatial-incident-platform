import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DashboardLayout from '@/layouts/DashboardLayout';

const { mockUseDashboardAggregations, mockUseDashboardRecentIncidents } = vi.hoisted(() => ({
  mockUseDashboardAggregations: vi.fn(),
  mockUseDashboardRecentIncidents: vi.fn(),
}));

vi.mock('@/hooks/useDashboardAggregations', () => ({
  useDashboardAggregations: () => mockUseDashboardAggregations(),
}));

vi.mock('@/hooks/useDashboardRecentIncidents', () => ({
  useDashboardRecentIncidents: () => mockUseDashboardRecentIncidents(),
}));

describe('DashboardLayout', () => {
  it('renders loading placeholders for dashboard sections', () => {
    mockUseDashboardAggregations.mockReturnValue({
      status: 'loading',
      data: null,
      error: null,
    });

    mockUseDashboardRecentIncidents.mockReturnValue({
      status: 'loading',
      data: [],
      error: null,
    });

    render(<DashboardLayout />);

    expect(screen.getByText(/loading kpi metrics/i)).toBeInTheDocument();
    expect(screen.getByText(/loading distribution data/i)).toBeInTheDocument();
    expect(screen.getByText(/loading recent incidents/i)).toBeInTheDocument();
  });

  it('renders empty states when data is missing', () => {
    mockUseDashboardAggregations.mockReturnValue({
      status: 'success',
      data: {
        kpis: [],
        typeDistribution: [],
        severityDistribution: [],
        dailyTrend: [],
      },
      error: null,
    });

    mockUseDashboardRecentIncidents.mockReturnValue({
      status: 'success',
      data: [],
      error: null,
    });

    render(<DashboardLayout />);

    expect(screen.getByText(/kpi metrics will appear here soon/i)).toBeInTheDocument();
    expect(screen.getByText(/no type data yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no severity data yet/i)).toBeInTheDocument();
    expect(screen.getByText(/trend data will appear/i)).toBeInTheDocument();
    expect(screen.getByText(/recent incidents will surface here shortly/i)).toBeInTheDocument();
  });
});
