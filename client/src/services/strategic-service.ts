import { apiClient } from './api-client';
import type {
  MonthlyTrendsParams,
  QuarterlyTrendsParams,
  TypeTimelinesParams,
  HotspotsParams,
  CoverageBuffersParams,
  ResponseMetricsParams,
  PriorityScoresParams,
  StrategicMonthlyTrendResponse,
  StrategicQuarterlyTrendResponse,
  StrategicTypeTimelineResponse,
  StrategicHotspotResponse,
  StrategicCoverageResponse,
  StrategicResponseMetricsResponse,
  StrategicPriorityScoreResponse,
} from '../types/api/strategic';
import type { DailyTrendResponse, DashboardFilterParams } from '../types/api/dashboard';

export class StrategicServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'StrategicServiceError';
  }
}

const mapHttpError = (error: unknown, fallbackMessage: string): StrategicServiceError => {
  if (error instanceof StrategicServiceError) {
    return error;
  }

  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    const message = 'message' in error ? String(error.message) : fallbackMessage;

    switch (status) {
      case 400:
        return new StrategicServiceError(
          message || 'Invalid request parameters',
          'BAD_REQUEST',
          400,
        );
      case 404:
        return new StrategicServiceError(message || 'Resource not found', 'NOT_FOUND', 404);
      case 500:
        return new StrategicServiceError(
          message || 'Internal server error',
          'INTERNAL_SERVER_ERROR',
          500,
        );
      default:
        return new StrategicServiceError(message || fallbackMessage, 'UNKNOWN_ERROR', status);
    }
  }

  return new StrategicServiceError(
    error instanceof Error ? error.message : fallbackMessage,
    'UNKNOWN_ERROR',
  );
};

export const fetchStrategicTrends = async (
  params: MonthlyTrendsParams = {},
  signal?: AbortSignal,
): Promise<StrategicMonthlyTrendResponse> => {
  try {
    return await apiClient.strategic.monthlyTrends(params, { signal });
  } catch (error) {
    throw mapHttpError(error, 'Failed to fetch monthly trends');
  }
};

export const fetchStrategicDailyTrend = async (
  params: DashboardFilterParams = {},
  signal?: AbortSignal,
): Promise<DailyTrendResponse> => {
  try {
    return await apiClient.strategic.dailyTrend(params, { signal });
  } catch (error) {
    throw mapHttpError(error, 'Failed to fetch daily trend');
  }
};

export const fetchStrategicQuarterlyTrends = async (
  params: QuarterlyTrendsParams = {},
  signal?: AbortSignal,
): Promise<StrategicQuarterlyTrendResponse> => {
  try {
    return await apiClient.strategic.quarterlyTrends(params, { signal });
  } catch (error) {
    throw mapHttpError(error, 'Failed to fetch quarterly trends');
  }
};

export const fetchStrategicTypeTimelines = async (
  params: TypeTimelinesParams = {},
  signal?: AbortSignal,
): Promise<StrategicTypeTimelineResponse> => {
  try {
    return await apiClient.strategic.typeTimelines(params, { signal });
  } catch (error) {
    throw mapHttpError(error, 'Failed to fetch type timelines');
  }
};

export const fetchHotspots = async (
  params: HotspotsParams = {},
  signal?: AbortSignal,
): Promise<StrategicHotspotResponse> => {
  try {
    return await apiClient.strategic.hotspots(params, { signal });
  } catch (error) {
    throw mapHttpError(error, 'Failed to fetch hotspot data');
  }
};

export const fetchCoverageAnalysis = async (
  params: CoverageBuffersParams = {},
  signal?: AbortSignal,
): Promise<StrategicCoverageResponse> => {
  try {
    return await apiClient.strategic.coverageBuffers(params, { signal });
  } catch (error) {
    throw mapHttpError(error, 'Failed to fetch coverage analysis');
  }
};

export const fetchResponseTimePatterns = async (
  params: ResponseMetricsParams = {},
  signal?: AbortSignal,
): Promise<StrategicResponseMetricsResponse> => {
  try {
    return await apiClient.strategic.responseMetrics(params, { signal });
  } catch (error) {
    throw mapHttpError(error, 'Failed to fetch response time patterns');
  }
};

export const fetchPriorityZones = async (
  params: PriorityScoresParams = {},
  signal?: AbortSignal,
): Promise<StrategicPriorityScoreResponse> => {
  try {
    return await apiClient.strategic.priorityScores(params, { signal });
  } catch (error) {
    throw mapHttpError(error, 'Failed to fetch priority zones');
  }
};
