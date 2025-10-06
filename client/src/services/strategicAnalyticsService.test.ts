import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { StrategicMonthlyTrendResponse } from '@/types/strategic';
import {
  fetchHotspots,
  fetchMonthlyTrends,
  fetchQuarterlyTrends,
} from './strategicAnalyticsService';

describe('strategicAnalyticsService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useRealTimers();
    global.fetch = vi.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('requests monthly trends with filters and months parameter', async () => {
    const responseBody: StrategicMonthlyTrendResponse = {
      range: { start: '2024-01-01T00:00:00Z', end: '2024-12-31T23:59:59Z', months: 12 },
      series: [],
      totals: {
        currentPeriodTotal: 0,
        previousPeriodTotal: null,
        periodDelta: null,
        periodPercentage: null,
      },
    };

    (global.fetch as unknown as Mock).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(responseBody),
    });

    const result = await fetchMonthlyTrends({
      months: 18,
      typeCodes: ['FIRE_STRUCTURE'],
      severityCodes: ['CRITICAL'],
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-12-31T23:59:59Z',
    });

    expect(result).toEqual(responseBody);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = (global.fetch as unknown as Mock).mock.calls[0];
    expect(String(requestUrl)).toContain('/api/strategic/trends/monthly');
    expect(String(requestUrl)).toContain('months=18');
    expect(String(requestUrl)).toContain('typeCodes=FIRE_STRUCTURE');
    expect(String(requestUrl)).toContain('severityCodes=CRITICAL');
    expect(String(requestUrl)).toContain('startDate=2024-01-01T00%3A00%3A00Z');
    expect(String(requestUrl)).toContain('endDate=2024-12-31T23%3A59%3A59Z');
    expect((requestInit as RequestInit).headers).toMatchObject({ Accept: 'application/json' });
  });

  it('requests hotspots with resolution and refresh flag', async () => {
    (global.fetch as unknown as Mock).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        metadata: {
          resolution: 6,
          cellSizeMeters: 200,
          cellAreaSquareMeters: 40000,
          totalIncidents: 5,
          maxIncidentCount: 2,
          cellCount: 3,
          generatedAt: '2025-01-01T00:00:00Z',
        },
        cells: [],
      }),
    });

    await fetchHotspots({
      resolution: 6,
      refresh: true,
      statusCodes: ['RESOLVED'],
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [requestUrl] = (global.fetch as unknown as Mock).mock.calls[0];
    expect(String(requestUrl)).toContain('/api/strategic/hotspots');
    expect(String(requestUrl)).toContain('resolution=6');
    expect(String(requestUrl)).toContain('statusCodes=RESOLVED');
    expect(String(requestUrl)).toContain('refresh=true');
  });

  it('throws descriptive error when quarterly trends request fails', async () => {
    (global.fetch as unknown as Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue('Service unavailable'),
    });

    await expect(fetchQuarterlyTrends()).rejects.toThrow('Service unavailable');
  });
});
