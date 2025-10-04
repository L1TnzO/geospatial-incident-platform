import type { FC } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseDashboardAggregations = vi.fn();
const mockUseDashboardRecentIncidents = vi.fn();

vi.mock('@/hooks/useDashboardAggregations', () => ({
  useDashboardAggregations: () => mockUseDashboardAggregations(),
}));

vi.mock('@/hooks/useDashboardRecentIncidents', () => ({
  useDashboardRecentIncidents: () => mockUseDashboardRecentIncidents(),
}));

describe('App routing', () => {
  let App: FC;

  beforeEach(async () => {
    mockUseDashboardAggregations.mockReset();
    mockUseDashboardRecentIncidents.mockReset();

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
