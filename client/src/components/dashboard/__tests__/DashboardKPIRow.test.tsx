import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardKPIRow } from '../DashboardKPIRow';
import type { UseDashboardLast24HoursKpiResult } from '../../../hooks/useDashboardLast24HoursKpi';
import type { Last24HoursKpiResponse } from '../../../types/api/dashboard';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockKpiData: Last24HoursKpiResponse = {
  window: {
    start: '2025-10-21T12:00:00.000Z',
    end: '2025-10-22T12:00:00.000Z',
  },
  previousWindow: {
    start: '2025-10-20T12:00:00.000Z',
    end: '2025-10-21T12:00:00.000Z',
  },
  currentCount: 42,
  previousCount: 35,
  delta: 7,
  deltaPercentage: 20,
};

describe('DashboardKPIRow', () => {
  const mockRefresh = vi.fn();


  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    const mockQuery: UseDashboardLast24HoursKpiResult = {
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refresh: mockRefresh,
      lastUpdated: null,
    } as unknown as UseDashboardLast24HoursKpiResult;

    render(<DashboardKPIRow kpiQuery={mockQuery} highSeverityKpiQuery={mockQuery} timeRangeLabel="Last 24 Hours" comparisonLabel="vs previous 24h" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getAllByRole('status', { hidden: true })).toHaveLength(2);
  });

  it('renders error state with retry button', async () => {
    const user = userEvent.setup();
    const mockQuery: UseDashboardLast24HoursKpiResult = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Failed to load KPI'),
      refresh: mockRefresh,
      lastUpdated: null,
    } as unknown as UseDashboardLast24HoursKpiResult;

    render(<DashboardKPIRow kpiQuery={mockQuery} highSeverityKpiQuery={mockQuery} timeRangeLabel="Last 24 Hours" comparisonLabel="vs previous 24h" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getAllByText(/Failed to load KPI/i)).toHaveLength(2);

    const retryButtons = screen.getAllByRole('button', { name: /retry/i });
    await user.click(retryButtons[0]);

    expect(mockRefresh).toHaveBeenCalledWith(true);
  });

  it('renders KPI data with trend indicators', () => {
    const mockQuery: UseDashboardLast24HoursKpiResult = {
      data: mockKpiData,
      isLoading: false,
      isError: false,
      error: null,
      refresh: mockRefresh,
      lastUpdated: Date.now(),
    } as unknown as UseDashboardLast24HoursKpiResult;

    render(<DashboardKPIRow kpiQuery={mockQuery} highSeverityKpiQuery={mockQuery} timeRangeLabel="Last 24 Hours" comparisonLabel="vs previous 24h" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getAllByText('42')).toHaveLength(2);
    expect(screen.getAllByText('+7')).toHaveLength(2);
    expect(screen.getAllByText('+20.0%')).toHaveLength(2);
  });


});
