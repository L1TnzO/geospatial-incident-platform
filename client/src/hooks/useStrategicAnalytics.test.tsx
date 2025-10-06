import { act, renderHook, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { HttpResponse, http } from 'msw';
import {
  createStrategicErrorHandlers,
  createStrategicHandlers,
  defaultStrategicMocks,
} from '@/test-utils/strategicHandlers';
import { useStrategicHotspots } from './useStrategicHotspots';
import { useStrategicMonthlyTrends } from './useStrategicMonthlyTrends';
import { useStrategicQuarterlyTrends } from './useStrategicQuarterlyTrends';
import { useStrategicResponseMetrics } from './useStrategicResponseMetrics';
import { useStrategicPriorityScores } from './useStrategicPriorityScores';
import { useStrategicTypeTimelines } from './useStrategicTypeTimelines';

const filtersState = {
  typeCodes: ['FIRE_STRUCTURE'] as string[] | undefined,
  severityCodes: undefined as string[] | undefined,
  statusCodes: undefined as string[] | undefined,
  startDate: undefined as string | undefined,
  endDate: undefined as string | undefined,
  incidentNumber: undefined as string | undefined,
  isActive: true,
};

const setFiltersMock = vi.fn((partial: { typeCodes?: string[] | undefined }) => {
  if (Object.prototype.hasOwnProperty.call(partial, 'typeCodes')) {
    filtersState.typeCodes = partial.typeCodes;
  }
});

vi.mock('./useStrategicFilters', () => {
  return {
    useStrategicFilters: () => filtersState,
  };
});

vi.mock('./useIncidentTableData', () => ({
  useIncidentTableData: () => ({
    setFilters: setFiltersMock,
  }),
}));

const server = setupServer(...createStrategicHandlers());

describe('strategic analytics hooks', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
    filtersState.typeCodes = ['FIRE_STRUCTURE'];
    setFiltersMock.mockClear();
    vi.useRealTimers();
  });

  afterAll(() => {
    server.close();
  });

  it('loads monthly trends and supports manual refresh', async () => {
    server.use(
      http.get('*/api/strategic/trends/monthly', () =>
        HttpResponse.json(defaultStrategicMocks.monthly)
      )
    );

    const { result } = renderHook(() => useStrategicMonthlyTrends({ autoRefreshMs: null }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.series).toHaveLength(2);

    server.use(
      http.get('*/api/strategic/trends/monthly', () =>
        HttpResponse.json({
          ...defaultStrategicMocks.monthly,
          totals: {
            ...defaultStrategicMocks.monthly.totals,
            currentPeriodTotal: 999,
          },
        })
      )
    );

    const initialUpdatedAt = result.current.lastUpdated;

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.data?.totals.currentPeriodTotal).toBe(999));
    expect(result.current.lastUpdated).not.toBe(initialUpdatedAt);
  });

  it('auto-refreshes monthly trends when ttl elapses', async () => {
    let requestCount = 0;

    server.use(
      http.get('*/api/strategic/trends/monthly', () => {
        requestCount += 1;
        return HttpResponse.json(defaultStrategicMocks.monthly);
      })
    );

    const timeoutSpy = vi.spyOn(window, 'setTimeout');

    try {
      const { result } = renderHook(() => useStrategicMonthlyTrends({ autoRefreshMs: 1000 }));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(requestCount).toBe(1);

      const refreshCall = timeoutSpy.mock.calls.find(([, delay]) => delay === 1000);
      expect(refreshCall).toBeDefined();
      const refreshCallback = refreshCall?.[0] as (() => void) | undefined;
      expect(typeof refreshCallback).toBe('function');

      await act(async () => {
        refreshCallback?.();
      });

      await waitFor(() => expect(requestCount).toBe(2));
    } finally {
      timeoutSpy.mockRestore();
    }
  });

  it('loads quarterly trends data', async () => {
    const { result } = renderHook(() => useStrategicQuarterlyTrends());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.series[0]?.label).toBe('Q4 2023');
  });

  it('caches timeframe switches to avoid redundant requests', async () => {
    const requestedMonths: number[] = [];

    server.use(
      http.get('*/api/strategic/trends/monthly', ({ request }) => {
        const url = new URL(request.url);
        const months = Number(url.searchParams.get('months') ?? '12');
        requestedMonths.push(months);
        return HttpResponse.json({
          ...defaultStrategicMocks.monthly,
          range: { ...defaultStrategicMocks.monthly.range, months },
        });
      })
    );

    const { result } = renderHook(() => useStrategicMonthlyTrends({ autoRefreshMs: null }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requestedMonths).toEqual([12]);
    expect(result.current.availableTimeframes).toEqual([6, 12, 24]);

    await act(async () => {
      result.current.setTimeframe(6);
    });

    await waitFor(() => expect(result.current.data?.range.months).toBe(6));
    expect(requestedMonths).toEqual([12, 6]);

    const requestCountAfterSix = requestedMonths.length;

    await act(async () => {
      result.current.setTimeframe(12);
    });

    await waitFor(() => expect(result.current.timeframe).toBe(12));
    expect(requestedMonths).toHaveLength(requestCountAfterSix);
  });

  it('loads type timeline explorer data and surfaces computed metrics', async () => {
    filtersState.typeCodes = ['FIRE_STRUCTURE'];

    const { result } = renderHook(() => useStrategicTypeTimelines({ autoRefreshMs: null }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.availableTypes.map((type) => type.code)).toEqual([
      'FIRE_STRUCTURE',
      'RESCUE',
    ]);
    expect(result.current.selectedTypeCode).toBe('FIRE_STRUCTURE');
    expect(result.current.selectedTypeName).toBe('Structure Fire');
    expect(result.current.availableWindows).toEqual([7, 14, 30]);
    expect(result.current.movingAverageWindow).toBe(7);
    expect(result.current.selectedSeries).toHaveLength(
      defaultStrategicMocks.typeTimelines.types[0]?.points.length ?? 0
    );
    expect(result.current.summary.latestCount).toBe(
      defaultStrategicMocks.typeTimelines.types[0]?.points.at(-1)?.count ?? null
    );
  });

  it('updates filters when selecting new types and caches moving-average calculations', async () => {
    filtersState.typeCodes = undefined;
    setFiltersMock.mockClear();

    let typeRequestCount = 0;
    server.use(
      http.get('*/api/strategic/trends/types', () => {
        typeRequestCount += 1;
        return HttpResponse.json(defaultStrategicMocks.typeTimelines);
      })
    );

    const { result } = renderHook(() => useStrategicTypeTimelines({ autoRefreshMs: null }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(typeRequestCount).toBe(1);
    expect(result.current.selectedTypeCode).toBe('FIRE_STRUCTURE');

    await act(async () => {
      result.current.setSelectedTypeCode('RESCUE');
    });

    await waitFor(() => expect(result.current.selectedTypeCode).toBe('RESCUE'));
    expect(setFiltersMock).toHaveBeenLastCalledWith({ typeCodes: ['RESCUE'] });
    expect(result.current.selectedTypeName).toBe('Rescue');

    await act(async () => {
      result.current.setMovingAverageWindow(14);
    });

    expect(result.current.movingAverageWindow).toBe(14);
    expect(typeRequestCount).toBe(1);

    const requestCountBeforeRefresh = typeRequestCount;
    await act(async () => {
      result.current.refresh();
    });
    await waitFor(() => expect(typeRequestCount).toBe(requestCountBeforeRefresh + 1));

    await act(async () => {
      result.current.setSelectedTypeCode(null);
    });

    await waitFor(() => expect(result.current.selectedTypeCode).toBeNull());
    expect(setFiltersMock).toHaveBeenLastCalledWith({ typeCodes: undefined });
    expect(result.current.selectedTypeName).toMatch(/all incident types/i);
    expect(result.current.selectedSeries).toHaveLength(
      defaultStrategicMocks.typeTimelines.totalsByMonth.length
    );
  });

  it('includes resolution query param for hotspots hook', async () => {
    let capturedUrl = '';
    server.use(...createStrategicHandlers({ onHotspotsRequest: (url) => (capturedUrl = url) }));

    const { result } = renderHook(() => useStrategicHotspots({ resolution: 6 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(capturedUrl).toContain('resolution=6');
  });

  it('surfaces errors from backend responses', async () => {
    server.use(...createStrategicErrorHandlers({ message: 'Backend unavailable', status: 503 }));

    const { result } = renderHook(() => useStrategicTypeTimelines());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe('Backend unavailable');
  });

  it('loads response metrics and forwards query params', async () => {
    let capturedUrl = '';
    server.use(
      ...createStrategicHandlers({
        onResponseMetricsRequest: (url) => {
          capturedUrl = url;
        },
      })
    );

    const { result } = renderHook(() =>
      useStrategicResponseMetrics({ groupBy: 'grid', resolution: 6, autoRefreshMs: null })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.metadata.groupBy).toBe('station');
    expect(capturedUrl).toContain('groupBy=grid');
    expect(capturedUrl).toContain('resolution=6');
  });

  it('loads priority scores with decay parameter', async () => {
    let capturedUrl = '';
    server.use(
      ...createStrategicHandlers({
        onPriorityScoresRequest: (url) => {
          capturedUrl = url;
        },
      })
    );

    const { result } = renderHook(() =>
      useStrategicPriorityScores({ decayHalfLifeDays: 45, autoRefreshMs: null })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.metadata.decayHalfLifeDays).toBe(30);
    expect(capturedUrl).toContain('decayHalfLifeDays=45');
  });
});
