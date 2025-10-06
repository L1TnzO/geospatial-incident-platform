import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { defaultStrategicMocks } from '@/test-utils/strategicHandlers';
import type { StrategicTypeTimelinesState } from '@/hooks/useStrategicTypeTimelines';
import StrategicTypeTrendExplorer from './StrategicTypeTrendExplorer';

const buildState = (
  overrides: Partial<StrategicTypeTimelinesState> = {}
): StrategicTypeTimelinesState => {
  const primarySeries = defaultStrategicMocks.typeTimelines.types[0];
  const movingAverageSeries = primarySeries?.points.map((point) => ({
    ...point,
    movingAverage: point.count,
  }));

  const baseState: StrategicTypeTimelinesState = {
    status: 'success',
    data: defaultStrategicMocks.typeTimelines,
    error: null,
    lastUpdated: '2025-01-11T12:05:00Z',
    refresh: vi.fn(),
    isIdle: false,
    isLoading: false,
    isSuccess: true,
    isError: false,
    availableTypes: defaultStrategicMocks.typeTimelines.types.map((series) => ({
      code: series.type.code,
      name: series.type.name,
    })),
    selectedTypeCode: primarySeries?.type.code ?? null,
    selectedTypeName: primarySeries?.type.name ?? primarySeries?.type.code ?? 'Structure Fire',
    setSelectedTypeCode: vi.fn(),
    availableWindows: [7, 14, 30],
    movingAverageWindow: 7,
    setMovingAverageWindow: vi.fn(),
    selectedSeries: primarySeries?.points.map((point) => ({ ...point })) ?? [],
    movingAverageSeries: movingAverageSeries ?? [],
    summary: {
      latestCount: primarySeries?.points.at(-1)?.count ?? null,
      previousCount: primarySeries?.points.at(-2)?.count ?? null,
      change:
        primarySeries && primarySeries.points.length > 1
          ? primarySeries.points.at(-1)!.count - primarySeries.points.at(-2)!.count
          : null,
      changePercentage: null,
      movingAverage: movingAverageSeries?.at(-1)?.movingAverage ?? null,
      movingAverageDelta: null,
      movingAveragePercentage: null,
    },
  };

  return { ...baseState, ...overrides };
};

describe('StrategicTypeTrendExplorer', () => {
  it('renders controls, chart, and metrics for the selected type', () => {
    const state = buildState();
    render(<StrategicTypeTrendExplorer state={state} />);

    expect(screen.getByRole('heading', { name: /type trend explorer/i })).toBeInTheDocument();
    const viewingLabel = screen.getByText('Structure Fire', { selector: 'strong' }).parentElement;
    expect(viewingLabel).toHaveTextContent(/viewing:\s*structure fire/i);
    expect(screen.getByLabelText('Select type')).toHaveValue(state.selectedTypeCode ?? '');
    expect(
      screen.getByRole('figure', {
        name: /incident counts and moving average for the selected type/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/latest month/i).nextElementSibling).toHaveTextContent('incidents');
  });

  it('invokes callbacks when selecting types and moving-average windows', () => {
    const state = buildState();
    render(<StrategicTypeTrendExplorer state={state} />);

    fireEvent.change(screen.getByLabelText('Select type'), { target: { value: 'RESCUE' } });
    expect(state.setSelectedTypeCode).toHaveBeenCalledWith('RESCUE');

    fireEvent.click(screen.getByRole('button', { name: '14d' }));
    expect(state.setMovingAverageWindow).toHaveBeenCalledWith(14);

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(state.refresh).toHaveBeenCalled();
  });

  it('renders placeholder content when no points are available', () => {
    const emptyState = buildState({
      availableTypes: [],
      selectedTypeCode: null,
      selectedTypeName: 'All incident types',
      selectedSeries: [],
      movingAverageSeries: [],
      summary: {
        latestCount: null,
        previousCount: null,
        change: null,
        changePercentage: null,
        movingAverage: null,
        movingAverageDelta: null,
        movingAveragePercentage: null,
      },
    });

    render(<StrategicTypeTrendExplorer state={emptyState} />);

    expect(
      screen.getByText(/incident timelines will appear once data becomes available/i)
    ).toBeVisible();
  });
});
