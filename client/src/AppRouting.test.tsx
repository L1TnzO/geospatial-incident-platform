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
const mockUseStrategicMonthlyTrends = vi.fn();
const mockUseStrategicQuarterlyTrends = vi.fn();
const mockUseStrategicTypeTimelines = vi.fn();
const mockUseStrategicHotspots = vi.fn();

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

vi.mock('@/hooks/useStrategicMonthlyTrends', () => ({
  useStrategicMonthlyTrends: () => mockUseStrategicMonthlyTrends(),
}));

vi.mock('@/hooks/useStrategicQuarterlyTrends', () => ({
  useStrategicQuarterlyTrends: () => mockUseStrategicQuarterlyTrends(),
}));

vi.mock('@/hooks/useStrategicTypeTimelines', () => ({
  useStrategicTypeTimelines: () => mockUseStrategicTypeTimelines(),
}));

vi.mock('@/hooks/useStrategicHotspots', () => ({
  useStrategicHotspots: () => mockUseStrategicHotspots(),
}));

describe('App routing', () => {
  let App: FC;

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

  const createMonthlyState = <T,>(data: T) => ({
    ...createSuccessState(data),
    timeframe: 12,
    setTimeframe: vi.fn(),
    availableTimeframes: [6, 12, 24],
  });

  beforeEach(async () => {
    mockUseDashboardLast24HoursKpi.mockReset();
    mockUseDashboardTypeDistribution.mockReset();
    mockUseDashboardSeverityDistribution.mockReset();
    mockUseDashboardDailyTrend.mockReset();
    mockUseDashboardRecentIncidents.mockReset();
    mockUseStrategicMonthlyTrends.mockReset();
    mockUseStrategicQuarterlyTrends.mockReset();
    mockUseStrategicTypeTimelines.mockReset();
    mockUseStrategicHotspots.mockReset();

    mockUseDashboardLast24HoursKpi.mockReturnValue(
      createSuccessState({
        window: { start: '2025-01-10T12:00:00Z', end: '2025-01-11T12:00:00Z' },
        previousWindow: { start: '2025-01-09T12:00:00Z', end: '2025-01-10T12:00:00Z' },
        currentCount: 18,
        previousCount: 14,
        delta: 4,
        deltaPercentage: 28.57,
      })
    );

    mockUseDashboardTypeDistribution.mockReturnValue(createSuccessState({ total: 0, buckets: [] }));

    mockUseDashboardSeverityDistribution.mockReturnValue(
      createSuccessState({ total: 0, buckets: [] })
    );

    mockUseDashboardDailyTrend.mockReturnValue(
      createSuccessState({
        points: [],
        trend: {
          currentTotal: 0,
          previousTotal: 0,
          change: 0,
          percentageChange: null,
          direction: 'flat',
        },
      })
    );

    mockUseDashboardRecentIncidents.mockReturnValue(createSuccessState([]));

    mockUseStrategicMonthlyTrends.mockReturnValue(
      createMonthlyState({
        range: { start: '2024-01-01T00:00:00Z', end: '2024-12-31T23:59:59Z', months: 12 },
        series: [
          {
            month: '2024-12',
            label: 'Dec 2024',
            start: '2024-12-01T00:00:00Z',
            end: '2024-12-31T23:59:59Z',
            count: 320,
            previousMonthCount: 300,
            monthOverMonthDelta: 20,
            monthOverMonthPercentage: 6.67,
            previousYearCount: 280,
            yearOverYearDelta: 40,
            yearOverYearPercentage: 14.29,
          },
        ],
        totals: {
          currentPeriodTotal: 320,
          previousPeriodTotal: 280,
          periodDelta: 40,
          periodPercentage: 14.29,
        },
      })
    );

    mockUseStrategicQuarterlyTrends.mockReturnValue(
      createSuccessState({
        range: { start: '2023-04-01T00:00:00Z', end: '2024-03-31T23:59:59Z', quarters: 4 },
        series: [],
        summary: {
          current: null,
          previous: null,
          delta: null,
          percentage: null,
          yearOverYearReference: null,
          yearOverYearDelta: null,
          yearOverYearPercentage: null,
        },
      })
    );

    const typeTimelineData = {
      range: { start: '2024-01-01T00:00:00Z', end: '2024-12-31T23:59:59Z', months: 12 },
      totalsByMonth: [
        {
          month: '2024-12',
          start: '2024-12-01T00:00:00Z',
          end: '2024-12-31T23:59:59Z',
          count: 320,
        },
      ],
      types: [
        {
          type: { code: 'FIRE', name: 'Fire', description: null },
          total: 200,
          points: [
            {
              month: '2024-11',
              start: '2024-11-01T00:00:00Z',
              end: '2024-11-30T23:59:59Z',
              count: 150,
            },
            {
              month: '2024-12',
              start: '2024-12-01T00:00:00Z',
              end: '2024-12-31T23:59:59Z',
              count: 200,
            },
          ],
        },
        {
          type: { code: 'RESCUE', name: 'Rescue', description: null },
          total: 120,
          points: [
            {
              month: '2024-11',
              start: '2024-11-01T00:00:00Z',
              end: '2024-11-30T23:59:59Z',
              count: 50,
            },
            {
              month: '2024-12',
              start: '2024-12-01T00:00:00Z',
              end: '2024-12-31T23:59:59Z',
              count: 70,
            },
          ],
        },
      ],
    };

    mockUseStrategicTypeTimelines.mockReturnValue({
      ...createSuccessState(typeTimelineData),
      availableTypes: typeTimelineData.types.map((series) => ({
        code: series.type.code,
        name: series.type.name,
      })),
      selectedTypeCode: 'FIRE',
      selectedTypeName: 'Fire',
      setSelectedTypeCode: vi.fn(),
      availableWindows: [7, 14, 30],
      movingAverageWindow: 7,
      setMovingAverageWindow: vi.fn(),
      selectedSeries: typeTimelineData.types[0]?.points ?? [],
      movingAverageSeries:
        typeTimelineData.types[0]?.points.map((point) => ({
          ...point,
          movingAverage: point.count,
        })) ?? [],
      summary: {
        latestCount: typeTimelineData.types[0]?.points.at(-1)?.count ?? null,
        previousCount: typeTimelineData.types[0]?.points.at(-2)?.count ?? null,
        change:
          typeTimelineData.types[0]?.points.length && typeTimelineData.types[0]!.points.length > 1
            ? typeTimelineData.types[0]!.points.at(-1)!.count -
              typeTimelineData.types[0]!.points.at(-2)!.count
            : null,
        changePercentage: null,
        movingAverage: typeTimelineData.types[0]?.points.at(-1)?.count ?? null,
        movingAverageDelta: null,
        movingAveragePercentage: null,
      },
    });

    mockUseStrategicHotspots.mockReturnValue(
      createSuccessState({
        metadata: {
          resolution: 4,
          cellSizeMeters: 500,
          cellAreaSquareMeters: 250_000,
          totalIncidents: 12,
          maxIncidentCount: 5,
          cellCount: 3,
          generatedAt: '2025-01-11T12:04:00Z',
        },
        cells: [
          {
            cellId: 'A1',
            geometry: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [-122.41, 37.79],
                    [-122.4, 37.79],
                    [-122.4, 37.78],
                    [-122.41, 37.78],
                    [-122.41, 37.79],
                  ],
                ],
              },
            },
            centroid: { latitude: 37.785, longitude: -122.405 },
            incidentCount: 5,
            intensity: 1,
          },
        ],
      })
    );

    ({ default: App } = await import('./App'));
  });

  it('navigates between overview, dashboard, and strategic routes', async () => {
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

    await user.click(screen.getByRole('link', { name: /strategic/i }));

    expect(screen.getByRole('heading', { name: /strategic analytics/i })).toBeInTheDocument();
    expect(screen.getByText(/trend intelligence/i)).toBeInTheDocument();
  });
});
