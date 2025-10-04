import type { FC } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseDashboardLast24HoursKpi = vi.fn();
const mockUseDashboardTypeDistribution = vi.fn();
const mockUseDashboardSeverityDistribution = vi.fn();
const mockUseDashboardDailyTrend = vi.fn();
const mockUseDashboardRecentIncidents = vi.fn();

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

describe('App routing', () => {
  let App: FC;

  beforeEach(async () => {
    mockUseDashboardLast24HoursKpi.mockReset();
    mockUseDashboardTypeDistribution.mockReset();
    mockUseDashboardSeverityDistribution.mockReset();
    mockUseDashboardDailyTrend.mockReset();
    mockUseDashboardRecentIncidents.mockReset();

    mockUseDashboardLast24HoursKpi.mockReturnValue({
      status: 'success',
      data: {
        window: { start: '2025-01-10T12:00:00Z', end: '2025-01-11T12:00:00Z' },
        previousWindow: { start: '2025-01-09T12:00:00Z', end: '2025-01-10T12:00:00Z' },
        currentCount: 18,
        previousCount: 14,
        delta: 4,
        deltaPercentage: 28.57,
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

    ({ default: App } = await import('./App'));
  });

  it('navigates between overview and dashboard routes', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    const overviewLink = screen.getByRole('link', { name: /overview/i });
    expect(overviewLink).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('link', { name: /dashboard/i }));

    expect(screen.getByRole('heading', { name: /dashboard analytics/i })).toBeInTheDocument();
    expect(screen.getByText(/key performance indicators/i)).toBeInTheDocument();
  });
});
