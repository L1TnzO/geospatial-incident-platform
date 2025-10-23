import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardTypeDistributionChart } from '../DashboardTypeDistributionChart';
import type { UseDashboardTypeDistributionResult } from '../../../hooks/useDashboardTypeDistribution';
import type { TypeDistributionResponse } from '../../../types/api/dashboard';

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

const mockTypeData: TypeDistributionResponse = {
  total: 100,
  buckets: [
    {
      type: { code: 'FIRE_STRUCTURE', name: 'Structure Fire' },
      count: 45,
      percentage: 45.0,
    },
    {
      type: { code: 'MEDICAL', name: 'Medical Emergency' },
      count: 35,
      percentage: 35.0,
    },
    {
      type: { code: 'HAZMAT', name: 'Hazardous Materials' },
      count: 20,
      percentage: 20.0,
    },
  ],
};

describe('DashboardTypeDistributionChart', () => {
  const mockRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    const mockQuery: UseDashboardTypeDistributionResult = {
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refresh: mockRefresh,
      lastUpdated: null,
    } as unknown as UseDashboardTypeDistributionResult;

    render(<DashboardTypeDistributionChart distributionQuery={mockQuery} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('renders error state with retry button', async () => {
    const user = userEvent.setup();
    const mockQuery: UseDashboardTypeDistributionResult = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Failed to load'),
      refresh: mockRefresh,
      lastUpdated: null,
    } as unknown as UseDashboardTypeDistributionResult;

    render(<DashboardTypeDistributionChart distributionQuery={mockQuery} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /retry/i });
    await user.click(retryButton);

    expect(mockRefresh).toHaveBeenCalled();
  });

  it('renders empty state when no data', () => {
    const mockQuery: UseDashboardTypeDistributionResult = {
      data: { total: 0, buckets: [] },
      isLoading: false,
      isError: false,
      error: null,
      refresh: mockRefresh,
      lastUpdated: null,
    } as unknown as UseDashboardTypeDistributionResult;

    render(<DashboardTypeDistributionChart distributionQuery={mockQuery} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText(/No type data available/i)).toBeInTheDocument();
  });

  it('renders type distribution bars with counts', () => {
    const mockQuery: UseDashboardTypeDistributionResult = {
      data: mockTypeData,
      isLoading: false,
      isError: false,
      error: null,
      refresh: mockRefresh,
      lastUpdated: Date.now(),
    } as unknown as UseDashboardTypeDistributionResult;

    render(<DashboardTypeDistributionChart distributionQuery={mockQuery} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Structure Fire')).toBeInTheDocument();
    expect(screen.getByText('Medical Emergency')).toBeInTheDocument();
    expect(screen.getByText('Hazardous Materials')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument();
  });

  it('toggles between count and percentage mode', async () => {
    const user = userEvent.setup();
    const mockQuery: UseDashboardTypeDistributionResult = {
      data: mockTypeData,
      isLoading: false,
      isError: false,
      error: null,
      refresh: mockRefresh,
      lastUpdated: Date.now(),
    } as unknown as UseDashboardTypeDistributionResult;

    render(<DashboardTypeDistributionChart distributionQuery={mockQuery} />, {
      wrapper: createWrapper(),
    });

    // Initially in count mode
    expect(screen.getByText('45')).toBeInTheDocument();

    // Switch to percentage mode
    const percentageButton = screen.getByRole('button', { name: /percentage/i });
    await user.click(percentageButton);

    expect(screen.getByText('45.0%')).toBeInTheDocument();
    expect(screen.getByText('35.0%')).toBeInTheDocument();
  });

  it('calls refresh when refresh button clicked', async () => {
    const user = userEvent.setup();
    const mockQuery: UseDashboardTypeDistributionResult = {
      data: mockTypeData,
      isLoading: false,
      isError: false,
      error: null,
      refresh: mockRefresh,
      lastUpdated: Date.now(),
    } as unknown as UseDashboardTypeDistributionResult;

    render(<DashboardTypeDistributionChart distributionQuery={mockQuery} />, {
      wrapper: createWrapper(),
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    expect(mockRefresh).toHaveBeenCalledWith(true);
  });
});
