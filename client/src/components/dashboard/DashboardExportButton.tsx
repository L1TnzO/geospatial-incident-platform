import { Download } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { useCallback, useEffect } from 'react';
import { useDashboardExport } from '../../hooks/useDashboardExport';
import type { DashboardExportParams } from '../../types/api/dashboard';

interface DashboardExportButtonProps {
  filters: DashboardExportParams;
  disabled?: boolean;
  onSuccess?: (filename: string, totalRecords: number) => void;
  onError?: (error: Error) => void;
}

export function DashboardExportButton({
  filters,
  disabled = false,
  onSuccess,
  onError,
}: DashboardExportButtonProps) {
  const { export: triggerExport, isExporting, exportError, reset } = useDashboardExport();

  const handleExport = useCallback(async () => {
    try {
      reset(); // Clear previous errors
      const result = await triggerExport(filters);

      // Trigger download
      const link = document.createElement('a');
      link.href = result.blobUrl;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL after download
      setTimeout(() => {
        URL.revokeObjectURL(result.blobUrl);
      }, 100);

      // Notify success
      if (onSuccess) {
        onSuccess(result.filename, result.totalRecords);
      }
    } catch (error) {
      // Error is handled by the export hook
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  }, [triggerExport, filters, onSuccess, onError, reset]);

  // Notify parent of errors via callback
  useEffect(() => {
    if (exportError && onError) {
      onError(exportError);
    }
  }, [exportError, onError]);

  return (
    <Button variant="default" size="sm" onClick={handleExport} disabled={disabled || isExporting}>
      <Download className="mr-2 h-4 w-4" />
      {isExporting ? 'Exporting...' : 'Export CSV'}
    </Button>
  );
}

interface DashboardExportErrorBannerProps {
  error: Error | null;
  onRetry: () => void;
  onDismiss: () => void;
}

export function DashboardExportErrorBanner({
  error,
  onRetry,
  onDismiss,
}: DashboardExportErrorBannerProps) {
  if (!error) return null;

  return (
    <Alert variant="destructive">
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-semibold">Export Failed</p>
          <p className="text-sm">{error.message || 'Unable to export incidents'}</p>
          <p className="text-xs mt-1">
            Check your filters or try narrowing the timeframe (exports cap at 5,000 records).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRetry}>
            <Download className="mr-2 h-4 w-4" />
            Retry
          </Button>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
