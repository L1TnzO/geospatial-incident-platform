import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultStrategicMocks } from '@/test-utils/strategicHandlers';

const createSuccessState = <T,>(data: T) => ({
  status: 'success' as const,
  data,
  error: null,
  lastUpdated: '2025-01-11T12:05:00Z',
  refresh: vi.fn(),
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

let monthlyState = createMonthlyState();
let quarterlyState = createSuccessState(defaultStrategicMocks.quarterly);
let typeTimelineState = createSuccessState(defaultStrategicMocks.typeTimelines);
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
    quarterlyState = createSuccessState(defaultStrategicMocks.quarterly);
    typeTimelineState = createSuccessState(defaultStrategicMocks.typeTimelines);
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

    const typePanel = screen.getByRole('article', { name: /incident type timelines/i });
    expect(typePanel).toHaveTextContent(
      defaultStrategicMocks.typeTimelines.types[0]?.type.name ?? ''
    );

    const hotspotCard = screen.getByRole('article', { name: /hotspot heatmap preview/i });
    expect(hotspotCard).toHaveTextContent(
      defaultStrategicMocks.hotspots.cells[0]?.incidentCount.toString() ?? ''
    );

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
    expect(hotspotState.refresh).toHaveBeenCalled();
    expect(responseMetricsState.refresh).toHaveBeenCalled();
    expect(priorityScoresState.refresh).toHaveBeenCalled();

    expect(screen.getByText(/last updated/i)).toBeInTheDocument();

    const timeframeButton = screen.getByRole('button', { name: '6m' });
    fireEvent.click(timeframeButton);
    expect(monthlyState.setTimeframe).toHaveBeenCalledWith(6);
  });
});
