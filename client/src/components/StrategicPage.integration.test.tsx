import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultStrategicMocks } from '@/test-utils/strategicHandlers';

const createSuccessState = <T,>(data: T) => ({
  status: 'success' as const,
  data,
  error: null,
  lastUpdated: '2025-01-11T12:05:00Z',
  refresh: vi.fn(),
  cancel: vi.fn(),
  isIdle: false,
  isLoading: false,
  isSuccess: true,
  isError: false,
});

const createMonthlyState = () => ({
  ...createSuccessState(defaultStrategicMocks.monthly),
  timeframe: 12,
  setTimeframe: vi.fn(),
  availableTimeframes: [6, 12, 24],
});

const createQuarterlyState = () => ({
  ...createSuccessState(defaultStrategicMocks.quarterly),
  timeframe: 8,
  setTimeframe: vi.fn(),
  availableTimeframes: [4, 8],
});

const createTypeExplorerState = () => {
  const primarySeries = defaultStrategicMocks.typeTimelines.types[0];
  return {
    ...createSuccessState(defaultStrategicMocks.typeTimelines),
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
    movingAverageSeries:
      primarySeries?.points.map((point) => ({ ...point, movingAverage: point.count })) ?? [],
    summary: {
      latestCount: primarySeries?.points.at(-1)?.count ?? null,
      previousCount: primarySeries?.points.at(-2)?.count ?? null,
      change:
        primarySeries?.points.length && primarySeries.points.length > 1
          ? primarySeries.points.at(-1)!.count - primarySeries.points.at(-2)!.count
          : null,
      changePercentage: null,
      movingAverage: primarySeries?.points.at(-1)?.count ?? null,
      movingAverageDelta: null,
      movingAveragePercentage: null,
    },
  } as const;
};

let monthlyState = createMonthlyState();
let quarterlyState = createQuarterlyState();
let typeTimelineState = createTypeExplorerState();
let hotspotState = createSuccessState(defaultStrategicMocks.hotspots);
let responseMetricsState = createSuccessState(defaultStrategicMocks.responseMetrics);
let priorityScoresState = createSuccessState(defaultStrategicMocks.priorityScores);

vi.mock('@/hooks/useStrategicFilters', () => ({
  useStrategicFilters: () => ({
    typeCodes: undefined,
    severityCodes: undefined,
    statusCodes: undefined,
    startDate: undefined,
    endDate: undefined,
    incidentNumber: undefined,
    isActive: undefined,
  }),
}));

vi.mock('@/hooks/useStrategicMonthlyTrends', () => ({
  useStrategicMonthlyTrends: () => monthlyState,
}));

vi.mock('@/hooks/useStrategicQuarterlyTrends', () => ({
  useStrategicQuarterlyTrends: () => quarterlyState,
}));

vi.mock('@/hooks/useStrategicTypeTimelines', () => ({
  useStrategicTypeTimelines: () => typeTimelineState,
}));

vi.mock('@/hooks/useStrategicHotspots', () => ({
  useStrategicHotspots: () => hotspotState,
}));

vi.mock('@/hooks/useStrategicResponseMetrics', () => ({
  useStrategicResponseMetrics: () => responseMetricsState,
}));

vi.mock('@/hooks/useStrategicPriorityScores', () => ({
  useStrategicPriorityScores: () => priorityScoresState,
}));

describe('Strategic analytics integration', () => {
  let StrategicPage: (typeof import('@/pages/StrategicPage'))['default'];

  beforeEach(async () => {
    monthlyState = createMonthlyState();
    quarterlyState = createQuarterlyState();
    typeTimelineState = createTypeExplorerState();
    hotspotState = createSuccessState(defaultStrategicMocks.hotspots);
    responseMetricsState = createSuccessState(defaultStrategicMocks.responseMetrics);
    priorityScoresState = createSuccessState(defaultStrategicMocks.priorityScores);

    ({ default: StrategicPage } = await import('@/pages/StrategicPage'));
  });

  it('renders strategic analytics widgets and handles refresh interactions', () => {
    render(
      <MemoryRouter>
        <StrategicPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /strategic analytics/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /trend intelligence/i })).toBeInTheDocument();

    const monthlyCard = screen.getByRole('article', { name: /monthly trendline/i });
    expect(monthlyCard).toHaveTextContent(
      defaultStrategicMocks.monthly.totals.currentPeriodTotal.toLocaleString()
    );
    expect(screen.getByRole('button', { name: '12m' })).toHaveAttribute('aria-pressed', 'true');

    const quarterlyCard = screen.getByRole('article', { name: /quarterly comparison/i });
    expect(quarterlyCard).toHaveTextContent(/quarter-over-quarter change/i);
    expect(within(quarterlyCard).getByRole('button', { name: '8q' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(within(quarterlyCard).getByRole('button', { name: /export csv/i })).toBeEnabled();

    const typeExplorer = screen.getByRole('article', { name: /type trend explorer/i });
    expect(typeExplorer).toHaveTextContent(
      defaultStrategicMocks.typeTimelines.types[0]?.type.name ?? ''
    );

    const hotspotCard = screen.getByRole('article', { name: /hotspot heatmap preview/i });
    expect(hotspotCard).toHaveTextContent(
      defaultStrategicMocks.hotspots.cells[0]?.incidentCount.toString() ?? ''
    );

    const overlayCard = screen.getByRole('article', { name: /^hotspot heatmap$/i });
    const resolutionSelect = within(overlayCard).getByLabelText('Resolution');
    expect(resolutionSelect).toHaveValue(
      String(defaultStrategicMocks.hotspots.metadata.resolution)
    );
    fireEvent.change(resolutionSelect, { target: { value: '8' } });
    expect(resolutionSelect).toHaveValue('8');

    const responseCard = screen.getByRole('article', { name: /response readiness snapshot/i });
    expect(responseCard).toHaveTextContent('Station 101');
    expect(responseCard).toHaveTextContent('260s');

    const priorityCard = screen.getByRole('article', { name: /priority score leaders/i });
    expect(priorityCard).toHaveTextContent('Score 1.00');

    const refreshAll = screen.getByRole('button', { name: /refresh all/i });
    fireEvent.click(refreshAll);
    expect(monthlyState.refresh).toHaveBeenCalled();
    expect(quarterlyState.refresh).toHaveBeenCalled();
    expect(typeTimelineState.refresh).toHaveBeenCalled();
    expect(hotspotState.refresh).toHaveBeenCalledTimes(1);
    expect(responseMetricsState.refresh).toHaveBeenCalled();
    expect(priorityScoresState.refresh).toHaveBeenCalled();

    const overlayRefresh = within(overlayCard).getByRole('button', { name: /refresh layer/i });
    fireEvent.click(overlayRefresh);
    expect(hotspotState.refresh).toHaveBeenCalledTimes(2);

    expect(screen.getByText(/last updated/i)).toBeInTheDocument();

    const timeframeButton = screen.getByRole('button', { name: '6m' });
    fireEvent.click(timeframeButton);
    expect(monthlyState.setTimeframe).toHaveBeenCalledWith(6);

    const quarterButton = within(quarterlyCard).getByRole('button', { name: '4q' });
    fireEvent.click(quarterButton);
    expect(quarterlyState.setTimeframe).toHaveBeenCalledWith(4);

    const typeSelect = screen.getByLabelText('Select type');
    fireEvent.change(typeSelect, { target: { value: typeTimelineState.availableTypes[1]?.code } });
    expect(typeTimelineState.setSelectedTypeCode).toHaveBeenCalledWith(
      typeTimelineState.availableTypes[1]?.code
    );

    const windowButton = screen.getByRole('button', { name: '14d' });
    fireEvent.click(windowButton);
    expect(typeTimelineState.setMovingAverageWindow).toHaveBeenCalledWith(14);
  });
});
