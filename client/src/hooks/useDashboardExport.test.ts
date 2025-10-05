import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DashboardFilterParams } from '@/types/dashboard';
import { useDashboardExport } from './useDashboardExport';

const exportDashboardCsv = vi.fn();
const triggerBrowserDownload = vi.fn();

vi.mock('@/services/dashboardService', () => ({
  exportDashboardCsv: (...args: unknown[]) => exportDashboardCsv(...args),
}));

vi.mock('@/utils/download', () => ({
  triggerBrowserDownload: (...args: unknown[]) => triggerBrowserDownload(...args),
}));

vi.mock('@/hooks/useDashboardFilters', () => ({
  useDashboardFilters: () => ({}) as DashboardFilterParams,
}));

describe('useDashboardExport', () => {
  const filters: DashboardFilterParams = {
    typeCodes: ['FIRE_STRUCTURE'],
    severityCodes: ['CRITICAL'],
  };

  beforeEach(() => {
    exportDashboardCsv.mockReset();
    triggerBrowserDownload.mockReset();
  });

  it('invokes export service and triggers download on success', async () => {
    const blob = new Blob(['id']);
    exportDashboardCsv.mockResolvedValue({ blob, filename: 'incidents.csv' });

    const { result } = renderHook(() => useDashboardExport({ filters }));

    await act(async () => {
      await result.current.startExport();
    });

    expect(exportDashboardCsv).toHaveBeenCalledTimes(1);
    const [passedFilters, options] = exportDashboardCsv.mock.calls[0];
    expect(passedFilters).toEqual(filters);
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(triggerBrowserDownload).toHaveBeenCalledWith(blob, 'incidents.csv');
    expect(result.current.status).toBe('success');
    expect(result.current.filename).toBe('incidents.csv');

    triggerBrowserDownload.mockClear();
    act(() => {
      result.current.downloadAgain();
    });
    expect(triggerBrowserDownload).toHaveBeenCalledWith(blob, 'incidents.csv');
  });

  it('captures errors from export service', async () => {
    exportDashboardCsv.mockRejectedValue(new Error('Too many records'));

    const { result } = renderHook(() => useDashboardExport({ filters }));

    await act(async () => {
      await result.current.startExport();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Too many records');
  });

  it('can cancel an in-flight export', async () => {
    let rejectFn: ((error: Error) => void) | null = null;
    exportDashboardCsv.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectFn = reject;
        })
    );

    const { result } = renderHook(() => useDashboardExport({ filters }));

    await act(async () => {
      void result.current.startExport();
    });

    expect(result.current.status).toBe('exporting');

    act(() => {
      result.current.cancelExport();
    });

    expect(result.current.status).toBe('idle');

    await act(async () => {
      rejectFn?.(new Error('Aborted'));
    });
  });
});
