import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { defaultStrategicMocks } from '@/test-utils/strategicHandlers';
import type { StrategicMonthlyTrendsState } from '@/hooks/useStrategicMonthlyTrends';
import StrategicMonthlyTrendCard from './StrategicMonthlyTrendCard';

vi.mock('@/utils/download', () => ({
  triggerBrowserDownload: vi.fn(),
}));

import { triggerBrowserDownload } from '@/utils/download';

type PartialState = Partial<StrategicMonthlyTrendsState>;

const createState = (overrides: PartialState = {}) => ({
  timeframe: 12,
  setTimeframe: vi.fn(),
  availableTimeframes: [6, 12, 24],
  status: 'success' as const,
  data: defaultStrategicMocks.monthly,
  error: null,
  lastUpdated: '2025-01-11T12:05:00Z',
  refresh: vi.fn(),
  isIdle: false,
  isLoading: false,
  isSuccess: true,
  isError: false,
  ...overrides,
});

describe('StrategicMonthlyTrendCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders timeframe controls and metrics', () => {
    render(<StrategicMonthlyTrendCard state={createState()} />);

    expect(screen.getByRole('heading', { name: /monthly trendline/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '12m' })).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByText(defaultStrategicMocks.monthly.totals.currentPeriodTotal.toLocaleString())
    ).toBeVisible();
  });

  it('invokes setTimeframe when timeframe button clicked', () => {
    const state = createState();
    render(<StrategicMonthlyTrendCard state={state} />);

    const sixMonthButton = screen.getByRole('button', { name: '6m' });
    fireEvent.click(sixMonthButton);

    expect(state.setTimeframe).toHaveBeenCalledWith(6);
  });

  it('disables export controls when data is unavailable', () => {
    const emptyData = {
      ...defaultStrategicMocks.monthly,
      series: [],
    };
    render(
      <StrategicMonthlyTrendCard
        state={createState({
          data: emptyData,
        })}
      />
    );

    expect(screen.getByRole('button', { name: /export csv/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /export png/i })).toBeDisabled();
  });

  it('triggers CSV export with timeframe-based filename', () => {
    render(<StrategicMonthlyTrendCard state={createState()} />);

    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));

    expect(triggerBrowserDownload).toHaveBeenCalledTimes(1);
    const [blob, filename] = vi.mocked(triggerBrowserDownload).mock.calls[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(filename).toBe('strategic-monthly-trend-12m.csv');
  });

  it('surfaces loading and error states', () => {
    const loadingState = createState({
      status: 'loading',
      isLoading: true,
      isSuccess: false,
      data: null,
    });
    const errorState = createState({
      status: 'error',
      isError: true,
      isSuccess: false,
      data: null,
      error: 'Backend unavailable',
    });

    const { rerender } = render(<StrategicMonthlyTrendCard state={loadingState} />);
    expect(screen.getByText(/loading monthly trend data/i)).toBeVisible();

    rerender(<StrategicMonthlyTrendCard state={errorState} />);
    expect(screen.getByText(/backend unavailable/i)).toBeVisible();
  });
});
