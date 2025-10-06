import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { StrategicQuarterlyTrendsState } from '@/hooks/useStrategicQuarterlyTrends';
import type { StrategicQuarterlyTrendResponse } from '@/types/strategic';
import { triggerBrowserDownload } from '@/utils/download';
import StrategicQuarterComparisonChart from './StrategicQuarterComparisonChart';

vi.mock('@/utils/download', () => ({
  triggerBrowserDownload: vi.fn(),
}));

const buildQuarterlyData = (): StrategicQuarterlyTrendResponse => ({
  range: { start: '2023-07-01T00:00:00Z', end: '2024-06-30T23:59:59Z', quarters: 8 },
  series: [
    {
      year: 2023,
      quarter: 4,
      label: 'Q4 2023',
      start: '2023-10-01T00:00:00Z',
      end: '2023-12-31T23:59:59Z',
      count: 300,
      previousQuarterCount: 280,
      quarterOverQuarterDelta: 20,
      quarterOverQuarterPercentage: 7.14,
      previousYearCount: 260,
      yearOverYearDelta: 40,
      yearOverYearPercentage: 15.38,
    },
    {
      year: 2024,
      quarter: 1,
      label: 'Q1 2024',
      start: '2024-01-01T00:00:00Z',
      end: '2024-03-31T23:59:59Z',
      count: 320,
      previousQuarterCount: 300,
      quarterOverQuarterDelta: 20,
      quarterOverQuarterPercentage: 6.67,
      previousYearCount: 280,
      yearOverYearDelta: 40,
      yearOverYearPercentage: 14.29,
    },
  ],
  summary: {
    current: {
      year: 2024,
      quarter: 1,
      label: 'Q1 2024',
      start: '2024-01-01T00:00:00Z',
      end: '2024-03-31T23:59:59Z',
      count: 320,
      previousQuarterCount: 300,
      quarterOverQuarterDelta: 20,
      quarterOverQuarterPercentage: 6.67,
      previousYearCount: 280,
      yearOverYearDelta: 40,
      yearOverYearPercentage: 14.29,
    },
    previous: {
      year: 2023,
      quarter: 4,
      label: 'Q4 2023',
      start: '2023-10-01T00:00:00Z',
      end: '2023-12-31T23:59:59Z',
      count: 300,
      previousQuarterCount: 280,
      quarterOverQuarterDelta: 20,
      quarterOverQuarterPercentage: 7.14,
      previousYearCount: 260,
      yearOverYearDelta: 40,
      yearOverYearPercentage: 15.38,
    },
    delta: 20,
    percentage: 6.67,
    yearOverYearReference: {
      year: 2023,
      quarter: 1,
      label: 'Q1 2023',
      start: '2023-01-01T00:00:00Z',
      end: '2023-03-31T23:59:59Z',
      count: 280,
      previousQuarterCount: 270,
      quarterOverQuarterDelta: 10,
      quarterOverQuarterPercentage: 3.7,
      previousYearCount: 250,
      yearOverYearDelta: 30,
      yearOverYearPercentage: 12,
    },
    yearOverYearDelta: 40,
    yearOverYearPercentage: 14.29,
  },
});

const buildState = (
  overrides: Partial<StrategicQuarterlyTrendsState> = {}
): StrategicQuarterlyTrendsState => ({
  timeframe: 8,
  setTimeframe: vi.fn(),
  availableTimeframes: [4, 8],
  status: 'success',
  data: buildQuarterlyData(),
  error: null,
  lastUpdated: '2025-01-11T12:05:00Z',
  refresh: vi.fn(),
  isIdle: false,
  isLoading: false,
  isSuccess: true,
  isError: false,
  ...overrides,
});

describe('StrategicQuarterComparisonChart', () => {
  const mockedDownload = vi.mocked(triggerBrowserDownload);

  beforeEach(() => {
    mockedDownload.mockClear();
  });

  it('renders grouped bars, metrics, and legend for quarterly trends', () => {
    const state = buildState();
    render(<StrategicQuarterComparisonChart state={state} />);

    const article = screen.getByRole('article', { name: /quarterly comparison/i });
    expect(article).toBeInTheDocument();
    expect(within(article).getByText(/q1 2024/i, { selector: 'strong' })).toBeInTheDocument();
    expect(within(article).getByText(/q4 2023/i, { selector: 'strong' })).toBeInTheDocument();
    expect(within(article).getByText(/quarter-over-quarter change/i)).toBeInTheDocument();
    expect(within(article).getByText(/year-over-year reference/i)).toBeInTheDocument();
    expect(within(article).getByText(/recent quarters/i)).toBeInTheDocument();
  });

  it('invokes callbacks for timeframe switches, exports, and refresh', () => {
    const state = buildState();
    render(<StrategicQuarterComparisonChart state={state} />);

    const article = screen.getByRole('article', { name: /quarterly comparison/i });

    fireEvent.click(within(article).getByRole('button', { name: '4q' }));
    expect(state.setTimeframe).toHaveBeenCalledWith(4);

    fireEvent.click(within(article).getByRole('button', { name: /refresh/i }));
    expect(state.refresh).toHaveBeenCalled();

    fireEvent.click(within(article).getByRole('button', { name: /export csv/i }));
    expect(mockedDownload).toHaveBeenCalledTimes(1);
  });

  it('shows loading and error states when appropriate', () => {
    const loadingState = buildState({ status: 'loading', isLoading: true });
    const { rerender } = render(<StrategicQuarterComparisonChart state={loadingState} />);

    expect(screen.getByText(/loading quarterly trend data/i)).toBeInTheDocument();

    const errorState = buildState({
      status: 'error',
      isLoading: false,
      isSuccess: false,
      isError: true,
      data: null,
      error: 'Backend unavailable',
    });

    rerender(<StrategicQuarterComparisonChart state={errorState} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Backend unavailable');
  });
});
