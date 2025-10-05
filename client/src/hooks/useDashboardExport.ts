import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardFilterParams } from '@/types/dashboard';
import { exportDashboardCsv } from '@/services/dashboardService';
import { useDashboardFilters } from './useDashboardFilters';
import { triggerBrowserDownload } from '@/utils/download';

type ExportStatus = 'idle' | 'exporting' | 'success' | 'error';

interface UseDashboardExportOptions {
  filters?: DashboardFilterParams;
}

interface UseDashboardExportResult {
  status: ExportStatus;
  isExporting: boolean;
  error: string | null;
  filename: string | null;
  completedAt: string | null;
  startExport: () => Promise<void>;
  cancelExport: () => void;
  resetExport: () => void;
  downloadAgain: () => void;
}

export const useDashboardExport = (
  options?: UseDashboardExportOptions
): UseDashboardExportResult => {
  const derivedFilters = useDashboardFilters();
  const filters = useMemo(
    () => options?.filters ?? derivedFilters,
    [options?.filters, derivedFilters]
  );

  const [status, setStatus] = useState<ExportStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const lastBlobRef = useRef<Blob | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const resetExport = useCallback(() => {
    setStatus('idle');
    setError(null);
    setCompletedAt(null);
    setFilename(null);
    lastBlobRef.current = null;
  }, []);

  const cancelExport = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStatus('idle');
    setError(null);
  }, []);

  const downloadAgain = useCallback(() => {
    if (!lastBlobRef.current || !filename) {
      return;
    }
    triggerBrowserDownload(lastBlobRef.current, filename);
  }, [filename]);

  const startExport = useCallback(async () => {
    if (status === 'exporting') {
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStatus('exporting');
    setError(null);

    try {
      const { blob, filename: resolvedFilename } = await exportDashboardCsv(filters, {
        signal: controller.signal,
      });
      lastBlobRef.current = blob;
      setFilename(resolvedFilename);
      setCompletedAt(new Date().toISOString());
      triggerBrowserDownload(blob, resolvedFilename);
      setStatus('success');
      abortControllerRef.current = null;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setStatus('idle');
        abortControllerRef.current = null;
        return;
      }
      setError((error as Error).message || 'Failed to export incidents.');
      setStatus('error');
      abortControllerRef.current = null;
    }
  }, [filters, status]);

  return {
    status,
    isExporting: status === 'exporting',
    error,
    filename,
    completedAt,
    startExport,
    cancelExport,
    resetExport,
    downloadAgain,
  };
};
