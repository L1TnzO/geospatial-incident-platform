import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DashboardLayout from '@/layouts/DashboardLayout';

const {
  mockUseDashboardLast24HoursKpi,
  mockUseDashboardTypeDistribution,
  mockUseDashboardSeverityDistribution,
  mockUseDashboardDailyTrend,
  mockUseDashboardRecentIncidents,
  mockUseDashboardExport,
} = vi.hoisted(() => ({
  mockUseDashboardLast24HoursKpi: vi.fn(),
  mockUseDashboardTypeDistribution: vi.fn(),
  mockUseDashboardSeverityDistribution: vi.fn(),
  mockUseDashboardDailyTrend: vi.fn(),
  mockUseDashboardRecentIncidents: vi.fn(),
  mockUseDashboardExport: vi.fn(),
}));

vi.mock('@/hooks/useDashboardLast24HoursKpi', () => ({
  useDashboardLast24HoursKpi: () => mockUseDashboardLast24HoursKpi(),
}));

vi.mock('@/hooks/useDashboardTypeDistribution', () => ({
  useDashboardTypeDistribution: () => mockUseDashboardTypeDistribution(),
}));

vi.mock('@/hooks/useDashboardSeverityDistribution', () => ({
  useDashboardSeverityDistribution: () => mockUseDashboardSeverityDistribution(),
}));

vi.mock('@/hooks/useDashboardDailyTrend', () => ({
  useDashboardDailyTrend: () => mockUseDashboardDailyTrend(),
}));

vi.mock('@/hooks/useDashboardRecentIncidents', () => ({
  useDashboardRecentIncidents: () => mockUseDashboardRecentIncidents(),
}));

vi.mock('@/hooks/useDashboardExport', () => ({
  useDashboardExport: () => mockUseDashboardExport(),
}));

describe('DashboardLayout', () => {
  it('renders loading placeholders for dashboard sections', () => {
    mockUseDashboardExport.mockReturnValue({
      status: 'idle',
      isExporting: false,
      error: null,
      filename: null,
      completedAt: null,
      startExport: vi.fn(),
      cancelExport: vi.fn(),
      resetExport: vi.fn(),
      downloadAgain: vi.fn(),
    });
    mockUseDashboardLast24HoursKpi.mockReturnValue({
      status: 'loading',
      data: null,
      error: null,
      lastUpdated: null,
      refresh: vi.fn(),
    });

    mockUseDashboardTypeDistribution.mockReturnValue({
      status: 'loading',
      data: null,
      error: null,
      lastUpdated: null,
      refresh: vi.fn(),
    });

    mockUseDashboardSeverityDistribution.mockReturnValue({
      status: 'loading',
      data: null,
      error: null,
      lastUpdated: null,
      refresh: vi.fn(),
    });

    mockUseDashboardDailyTrend.mockReturnValue({
      status: 'loading',
      data: null,
      error: null,
      lastUpdated: null,
      refresh: vi.fn(),
    });

    mockUseDashboardRecentIncidents.mockReturnValue({
      status: 'loading',
      data: [],
      error: null,
      lastUpdated: null,
      refresh: vi.fn(),
    });

    render(<DashboardLayout />);

    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel export/i })).not.toBeInTheDocument();
    expect(screen.getByText(/loading kpi metrics/i)).toBeInTheDocument();
    expect(screen.getByText(/loading incident type distribution/i)).toBeInTheDocument();
    expect(screen.getByText(/loading severity distribution/i)).toBeInTheDocument();
    expect(screen.getByText(/loading incident daily trend/i)).toBeInTheDocument();
    expect(screen.getByText(/loading recent incidents/i)).toBeInTheDocument();
  });

  it('renders empty states when data is missing', () => {
    mockUseDashboardExport.mockReturnValue({
      status: 'success',
      isExporting: false,
      error: null,
      filename: 'incidents.csv',
      completedAt: '2025-01-11T12:05:00Z',
      startExport: vi.fn(),
      cancelExport: vi.fn(),
      resetExport: vi.fn(),
      downloadAgain: vi.fn(),
    });
    mockUseDashboardLast24HoursKpi.mockReturnValue({
      status: 'success',
      data: {
        window: { start: '2025-01-10T12:00:00Z', end: '2025-01-11T12:00:00Z' },
        previousWindow: { start: '2025-01-09T12:00:00Z', end: '2025-01-10T12:00:00Z' },
        currentCount: 0,
        previousCount: 0,
        delta: 0,
        deltaPercentage: null,
      },
      error: null,
      lastUpdated: '2025-01-11T12:05:00Z',
      refresh: vi.fn(),
    });

    mockUseDashboardTypeDistribution.mockReturnValue({
      status: 'success',
      data: { total: 0, buckets: [] },
      error: null,
      lastUpdated: '2025-01-11T12:05:00Z',
      refresh: vi.fn(),
    });

    mockUseDashboardSeverityDistribution.mockReturnValue({
      status: 'success',
      data: { total: 0, buckets: [] },
      error: null,
      lastUpdated: '2025-01-11T12:05:00Z',
      refresh: vi.fn(),
    });

    mockUseDashboardDailyTrend.mockReturnValue({
      status: 'success',
      data: {
        points: [],
        trend: {
          currentTotal: 0,
          previousTotal: 0,
          change: 0,
          percentageChange: null,
          direction: 'flat',
        },
      },
      error: null,
      lastUpdated: '2025-01-11T12:05:00Z',
      refresh: vi.fn(),
    });

    mockUseDashboardRecentIncidents.mockReturnValue({
      status: 'success',
      data: [],
      error: null,
      lastUpdated: '2025-01-11T12:05:00Z',
      refresh: vi.fn(),
    });

    render(<DashboardLayout />);

    expect(screen.getByText(/export ready/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
    expect(screen.getByText(/incidents \(last 24h\)/i)).toBeInTheDocument();
    expect(screen.getByText(/no type data yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no severity data yet/i)).toBeInTheDocument();
    expect(screen.getByText(/trend data will appear/i)).toBeInTheDocument();
    expect(screen.getByText(/recent incidents will surface here shortly/i)).toBeInTheDocument();
  });
});
