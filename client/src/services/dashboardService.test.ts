import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { DashboardFilterParams } from '@/types/dashboard';
import { exportDashboardCsv } from './dashboardService';

describe('exportDashboardCsv', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useRealTimers();
    global.fetch = vi.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('requests CSV with filters and returns filename from Content-Disposition', async () => {
    const blob = new Blob(['id,name\n1,Alice']);
    const headers = new Headers({
      'Content-Disposition': 'attachment; filename="incidents-export.csv"',
    });

    (global.fetch as unknown as Mock).mockResolvedValue({
      ok: true,
      headers,
      blob: vi.fn().mockResolvedValue(blob),
    });

    const filters: DashboardFilterParams = {
      typeCodes: ['FIRE_STRUCTURE'],
      severityCodes: ['CRITICAL'],
      startDate: '2025-01-01T00:00:00Z',
      endDate: '2025-01-31T23:59:59Z',
      isActive: true,
    };

    const result = await exportDashboardCsv(filters);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = (global.fetch as unknown as Mock).mock.calls[0];
    expect(requestUrl).toContain('/api/dashboard/export');
    expect(requestUrl).toContain('typeCodes=FIRE_STRUCTURE');
    expect(requestUrl).toContain('severityCodes=CRITICAL');
    expect(requestUrl).toContain('isActive=true');
    expect(requestUrl).toContain('startDate=2025-01-01T00%3A00%3A00Z');
    expect(requestUrl).toContain('endDate=2025-01-31T23%3A59%3A59Z');
    expect((requestInit as RequestInit).headers).toMatchObject({ Accept: 'text/csv' });

    expect(result.filename).toBe('incidents-export.csv');
    expect(result.blob).toBe(blob);
  });

  it('falls back to generated filename when header missing', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-02-03T04:05:00Z'));

    const blob = new Blob(['data']);

    (global.fetch as unknown as Mock).mockResolvedValue({
      ok: true,
      headers: new Headers(),
      blob: vi.fn().mockResolvedValue(blob),
    });

    const result = await exportDashboardCsv();

    expect(result.filename).toBe('incidents-20250203-0405.csv');
    expect(result.blob).toBe(blob);
  });

  it('throws error with message from response when request fails', async () => {
    (global.fetch as unknown as Mock).mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      text: vi.fn().mockResolvedValue('Export limit exceeded'),
    });

    await expect(exportDashboardCsv()).rejects.toThrow('Export limit exceeded');
  });
});
