import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardSeverityDistributionChart } from '../DashboardSeverityDistributionChart';
import type { UseDashboardSeverityDistributionResult } from '../../../hooks/useDashboardSeverityDistribution';
import type { SeverityDistributionResponse } from '../../../types/api/dashboard';

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock Recharts components
vi.mock('recharts', async (importOriginal) => {
    const original = await importOriginal<any>();
    return {
        ...original,
        ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
            <div className="recharts-responsive-container">{children}</div>
        ),
        PieChart: ({ children }: { children: React.ReactNode }) => (
            <div data-testid="pie-chart">{children}</div>
        ),
        Pie: ({ data }: { data: any[] }) => (
            <div data-testid="pie">
                {data.map((item) => (
                    <div key={item.name}>{item.name}</div>
                ))}
            </div>
        ),
        Cell: () => <div data-testid="cell" />,
        Tooltip: () => <div data-testid="tooltip" />,
        Legend: () => <div data-testid="legend" />,
    };
});

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

const mockSeverityData: SeverityDistributionResponse = {
    total: 100,
    buckets: [
        {
            severity: { code: 'CRITICAL', name: 'Critical', colorHex: '#ff0000', priority: 1 },
            count: 20,
            percentage: 20.0,
        },
        {
            severity: { code: 'HIGH', name: 'High', colorHex: '#ff9900', priority: 2 },
            count: 30,
            percentage: 30.0,
        },
        {
            severity: { code: 'MEDIUM', name: 'Medium', colorHex: '#ffff00', priority: 3 },
            count: 50,
            percentage: 50.0,
        },
    ],
};

describe('DashboardSeverityDistributionChart', () => {
    const mockRefresh = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state', () => {
        const mockQuery: UseDashboardSeverityDistributionResult = {
            data: undefined,
            isLoading: true,
            isError: false,
            error: null,
            refresh: mockRefresh,
            lastUpdated: null,
        } as unknown as UseDashboardSeverityDistributionResult;

        render(
            <DashboardSeverityDistributionChart
                distributionQuery={mockQuery}
                timeRangeLabel="Last 7 days"
            />,
            {
                wrapper: createWrapper(),
            }
        );

        // Check for skeleton or loading indicator
        // Since we use Skeleton, we can check for that or just generic structure
        // The previous implementation checked for 'status' role, let's see if our new one has it or we can check for structure
        // We can check if the card content has the loading structure
        expect(document.querySelector('.rounded-full')).toBeInTheDocument();
    });

    it('renders error state with retry button', async () => {
        const user = userEvent.setup();
        const mockQuery: UseDashboardSeverityDistributionResult = {
            data: undefined,
            isLoading: false,
            isError: true,
            error: new Error('Failed to load'),
            refresh: mockRefresh,
            lastUpdated: null,
        } as unknown as UseDashboardSeverityDistributionResult;

        render(
            <DashboardSeverityDistributionChart
                distributionQuery={mockQuery}
                timeRangeLabel="Last 7 days"
            />,
            {
                wrapper: createWrapper(),
            }
        );

        expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();

        const retryButton = screen.getByRole('button', { name: /retry/i });
        await user.click(retryButton);

        expect(mockRefresh).toHaveBeenCalled();
    });

    it('renders empty state when no data', () => {
        const mockQuery: UseDashboardSeverityDistributionResult = {
            data: { total: 0, buckets: [] },
            isLoading: false,
            isError: false,
            error: null,
            refresh: mockRefresh,
            lastUpdated: null,
        } as unknown as UseDashboardSeverityDistributionResult;

        render(
            <DashboardSeverityDistributionChart
                distributionQuery={mockQuery}
                timeRangeLabel="Last 7 days"
            />,
            {
                wrapper: createWrapper(),
            }
        );

        expect(screen.getByText(/No severity data available/i)).toBeInTheDocument();
    });

    it('renders severity distribution pie chart', () => {
        const mockQuery: UseDashboardSeverityDistributionResult = {
            data: mockSeverityData,
            isLoading: false,
            isError: false,
            error: null,
            refresh: mockRefresh,
            lastUpdated: Date.now(),
        } as unknown as UseDashboardSeverityDistributionResult;

        render(
            <DashboardSeverityDistributionChart
                distributionQuery={mockQuery}
                timeRangeLabel="Last 7 days"
            />,
            {
                wrapper: createWrapper(),
            }
        );

        // Check for chart elements
        // Recharts renders SVGs. We can check if the text is present.
        expect(screen.getByText('Critical')).toBeInTheDocument();
        expect(screen.getByText('High')).toBeInTheDocument();
        expect(screen.getByText('Medium')).toBeInTheDocument();
    });
});
