import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboardExport } from '../useDashboardExport';
import * as dashboardService from '../../services/dashboard-service';
import type { ReactNode } from 'react';

vi.mock('../../services/dashboard-service', () => ({
  exportDashboardCsv: vi.fn(),
  DashboardServiceError: class DashboardServiceError extends Error {
    constructor(
      message: string,
      public readonly code: string,
      public readonly status?: number,
    ) {
      super(message);
      this.name = 'DashboardServiceError';
    }
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useDashboardExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully exports CSV', async () => {
    const mockResult = {
      filename: 'incidents-export-20251022-120000.csv',
      blobUrl: 'blob:http://localhost/123',
      totalRecords: 42,
    };

    vi.spyOn(dashboardService, 'exportDashboardCsv').mockResolvedValue(mockResult);

    const { result } = renderHook(() => useDashboardExport(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isExporting).toBe(false);
    expect(result.current.exportError).toBeNull();

    const exportPromise = result.current.export({ severityCodes: ['CRITICAL'] });

    await waitFor(() => {
      expect(result.current.isExporting).toBe(true);
    });

    const exportResult = await exportPromise;

    expect(exportResult).toEqual(mockResult);
    expect(result.current.isExporting).toBe(false);
    expect(dashboardService.exportDashboardCsv).toHaveBeenCalledWith(
      { severityCodes: ['CRITICAL'] },
      undefined,
      expect.any(AbortSignal),
    );
  });

  it('handles export errors', async () => {
    const mockError = new dashboardService.DashboardServiceError(
      'Export limit exceeded',
      'EXPORT_LIMIT_EXCEEDED',
      400,
    );

    vi.spyOn(dashboardService, 'exportDashboardCsv').mockRejectedValue(mockError);

    const { result } = renderHook(() => useDashboardExport(), {
      wrapper: createWrapper(),
    });

    const exportPromise = result.current.export({});

    await expect(exportPromise).rejects.toThrow('Export limit exceeded');

    await waitFor(() => {
      expect(result.current.isExporting).toBe(false);
      expect(result.current.exportError).toEqual(mockError);
    });
  });

  it('supports cancellation', async () => {
    type ExportResult = {
      filename: string;
      blobUrl: string;
      totalRecords: number;
    };

    const exportPromise = new Promise<ExportResult>((_, reject) => {
      setTimeout(() => reject(new Error('Cancelled')), 1000);
    });

    vi.spyOn(dashboardService, 'exportDashboardCsv').mockReturnValue(exportPromise);

    const { result } = renderHook(() => useDashboardExport(), {
      wrapper: createWrapper(),
    });

    result.current.export({});

    await waitFor(() => {
      expect(result.current.isExporting).toBe(true);
    });

    result.current.cancelExport();

    await waitFor(() => {
      expect(result.current.isExporting).toBe(false);
    });
  });

  it('resets export state', async () => {
    const mockError = new dashboardService.DashboardServiceError(
      'Export failed',
      'EXPORT_FAILED',
      500,
    );

    vi.spyOn(dashboardService, 'exportDashboardCsv').mockRejectedValue(mockError);

    const { result } = renderHook(() => useDashboardExport(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.export({})).rejects.toThrow();

    await waitFor(() => {
      expect(result.current.exportError).toEqual(mockError);
    });

    result.current.reset();

    expect(result.current.exportError).toBeNull();
    expect(result.current.isExporting).toBe(false);
  });
});
