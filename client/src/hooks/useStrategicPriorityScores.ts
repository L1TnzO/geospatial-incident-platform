import type { DashboardFilterParams } from '@/types/dashboard';
import type { StrategicPriorityScoreResponse, StrategicGroupBy } from '@/types/strategic';
import { fetchPriorityScores } from '@/services/strategicAnalyticsService';
import { useStrategicQuery, type StrategicQueryState } from './useStrategicQuery';

export interface StrategicPriorityScoresOptions {
  groupBy?: StrategicGroupBy;
  resolution?: number;
  decayHalfLifeDays?: number;
  filters?: Partial<DashboardFilterParams>;
  autoRefreshMs?: number | null;
}

export const useStrategicPriorityScores = (
  options: StrategicPriorityScoresOptions = {}
): StrategicQueryState<StrategicPriorityScoreResponse> => {
  const { groupBy, resolution, decayHalfLifeDays, filters, autoRefreshMs } = options;
  const requestParams: Record<string, unknown> = {};
  if (groupBy) {
    requestParams.groupBy = groupBy;
  }
  if (resolution !== undefined) {
    requestParams.resolution = resolution;
  }
  if (decayHalfLifeDays !== undefined) {
    requestParams.decayHalfLifeDays = decayHalfLifeDays;
  }

  return useStrategicQuery(fetchPriorityScores, {
    filterOverrides: filters,
    requestParams: Object.keys(requestParams).length ? requestParams : undefined,
    ttlMs: autoRefreshMs,
    errorMessage: 'Failed to load strategic priority scores',
  });
};
