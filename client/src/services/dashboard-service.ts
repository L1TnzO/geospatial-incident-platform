import { apiClient } from './api-client';
import type {
  DashboardExportOptions,
  DashboardExportParams,
  DashboardExportResult,
  DashboardFilterParams,
  DashboardRecentIncidentsParams,
  Last24HoursKpiResponse,
  TypeDistributionResponse,
  SeverityDistributionResponse,
  DailyTrendResponse,
  RecentIncidentsResponse,
} from '../types/api/dashboard';

export class DashboardServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'DashboardServiceError';
  }
}

const mapHttpError = (error: unknown, fallbackMessage: string): DashboardServiceError => {
  if (error instanceof DashboardServiceError) {
    return error;
  }

  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    const message = 'message' in error ? String(error.message) : fallbackMessage;

    switch (status) {
      case 400:
        return new DashboardServiceError(
          message || 'Invalid request parameters',
          'BAD_REQUEST',
          400,
        );
      case 404:
        return new DashboardServiceError(message || 'Resource not found', 'NOT_FOUND', 404);
      case 500:
        return new DashboardServiceError(
          message || 'Internal server error',
          'INTERNAL_SERVER_ERROR',
          500,
        );
      default:
        return new DashboardServiceError(message || fallbackMessage, 'UNKNOWN_ERROR', status);
    }
  }

  return new DashboardServiceError(
    error instanceof Error ? error.message : fallbackMessage,
    'UNKNOWN_ERROR',
  );
};

export const fetchLast24HoursKpi = async (
  filters: DashboardFilterParams = {},
  signal?: AbortSignal,
): Promise<Last24HoursKpiResponse> => {
  try {
    return await apiClient.dashboard.kpiLast24Hours(filters, { signal });
  } catch (error) {
    throw mapHttpError(error, 'Failed to fetch 24-hour KPI data');
  }
};

export const fetchTypeDistribution = async (
  filters: DashboardFilterParams = {},
  signal?: AbortSignal,
): Promise<TypeDistributionResponse> => {
  try {
    return await apiClient.dashboard.typeDistribution(filters, { signal });
  } catch (error) {
    throw mapHttpError(error, 'Failed to fetch type distribution');
  }
};

export const fetchSeverityDistribution = async (
  filters: DashboardFilterParams = {},
  signal?: AbortSignal,
): Promise<SeverityDistributionResponse> => {
  try {
    return await apiClient.dashboard.severityDistribution(filters, { signal });
  } catch (error) {
    throw mapHttpError(error, 'Failed to fetch severity distribution');
  }
};

export const fetchDailyTrend = async (
  filters: DashboardFilterParams = {},
  signal?: AbortSignal,
): Promise<DailyTrendResponse> => {
  try {
    return await apiClient.dashboard.dailyTrend(filters, { signal });
  } catch (error) {
    throw mapHttpError(error, 'Failed to fetch daily trend data');
  }
};

export const fetchRecentIncidents = async (
  filters: DashboardRecentIncidentsParams = {},
  signal?: AbortSignal,
): Promise<RecentIncidentsResponse> => {
  try {
    const { limit = 10, ...restFilters } = filters;
    return await apiClient.dashboard.recentIncidents({ ...restFilters, limit }, { signal });
  } catch (error) {
    throw mapHttpError(error, 'Failed to fetch recent incidents');
  }
};

const parseFilenameFromHeader = (contentDisposition: string | null): string | null => {
  if (!contentDisposition) {
    return null;
  }

  const filenameMatch = /filename[^;=\n]*=["']?([^"'\n;]+)["']?/i.exec(contentDisposition);
  return filenameMatch ? filenameMatch[1] : null;
};

const generateFallbackFilename = (): string => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');

  return `incidents-export-${year}${month}${day}-${hours}${minutes}${seconds}.csv`;
};

export const exportDashboardCsv = async (
  filters: DashboardExportParams = {},
  options: DashboardExportOptions = {},
  signal?: AbortSignal,
): Promise<DashboardExportResult> => {
  try {
    const response = await apiClient.dashboard.export(filters, { signal, raw: true });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new DashboardServiceError(
        errorData.error?.message || `Export failed with status ${response.status}`,
        errorData.error?.code || 'EXPORT_FAILED',
        response.status,
      );
    }

    const contentDisposition = response.headers.get('Content-Disposition');
    const exportTotalHeader = response.headers.get('X-Export-Total');
    const totalRecords = exportTotalHeader ? parseInt(exportTotalHeader, 10) : 0;

    const filename =
      options.filename || parseFilenameFromHeader(contentDisposition) || generateFallbackFilename();

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    return {
      filename,
      blobUrl,
      totalRecords,
    };
  } catch (error) {
    if (error instanceof DashboardServiceError) {
      throw error;
    }
    throw mapHttpError(error, 'Failed to export dashboard data');
  }
};
