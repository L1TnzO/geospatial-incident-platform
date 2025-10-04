import {
  incidentRepository,
  type IncidentDailyCount,
  type IncidentSeverityBucket,
  type IncidentTypeBucket,
  type RecentIncidentSummary,
} from '../db';
import { incidentService, type IncidentFilterOptions } from './incidentsService';

const DASHBOARD_CACHE_TTL_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type QueryValue = string | string[] | undefined;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export interface Last24HoursKpi {
  window: {
    start: string;
    end: string;
  };
  previousWindow: {
    start: string;
    end: string;
  };
  currentCount: number;
  previousCount: number;
  delta: number;
  deltaPercentage: number | null;
}

export interface TypeDistributionBucket extends IncidentTypeBucket {
  percentage: number;
}

export interface TypeDistribution {
  total: number;
  buckets: TypeDistributionBucket[];
}

export interface DailyTrend {
  points: IncidentDailyCount[];
  trend: {
    currentTotal: number;
    previousTotal: number;
    change: number;
    percentageChange: number | null;
    direction: 'up' | 'down' | 'flat';
  };
}

export interface SeverityDistributionBucket extends IncidentSeverityBucket {
  percentage: number;
}

export interface SeverityDistribution {
  total: number;
  buckets: SeverityDistributionBucket[];
}

const normalizeArray = (input?: string[]): string[] | undefined => {
  if (!input) {
    return undefined;
  }
  return [...input].map((value) => value.toUpperCase()).sort();
};

const buildCacheKey = (
  prefix: string,
  filters: IncidentFilterOptions,
  extra: Record<string, unknown> = {}
): string => {
  const normalizedFilters = {
    typeCodes: normalizeArray(filters.typeCodes),
    severityCodes: normalizeArray(filters.severityCodes),
    statusCodes: normalizeArray(filters.statusCodes),
    incidentNumber: filters.incidentNumber ?? null,
    startDate: filters.startDate ?? null,
    endDate: filters.endDate ?? null,
    isActive: filters.isActive ?? null,
  };

  return `${prefix}:${JSON.stringify(
    { filters: normalizedFilters, extra },
    Object.keys({
      filters: normalizedFilters,
      extra,
    }).sort()
  )}`;
};

const formatDateOnly = (input: Date): string => {
  const year = input.getUTCFullYear();
  const month = String(input.getUTCMonth() + 1).padStart(2, '0');
  const day = String(input.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const clampPercentage = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const rounded = Math.round(value * 100) / 100;
  if (!Number.isFinite(rounded)) {
    return 0;
  }
  return rounded;
};

export class DashboardService {
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  constructor(
    private readonly repository = incidentRepository,
    private readonly incidentSvc = incidentService
  ) {}

  public clearCaches(): void {
    this.cache.clear();
  }

  private getFilters(query: Record<string, QueryValue>): IncidentFilterOptions {
    return this.incidentSvc.buildFilterOptions(query);
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      return null;
    }
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  private setCache<T>(key: string, value: T): T {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
    });
    return value;
  }

  private async withCache<T>(
    key: string,
    refresh: boolean,
    resolver: () => Promise<T>
  ): Promise<T> {
    if (!refresh) {
      const cached = this.getFromCache<T>(key);
      if (cached !== null) {
        return cached;
      }
    }

    const value = await resolver();
    return this.setCache(key, value);
  }

  public async getLast24HoursKpi(
    query: Record<string, QueryValue>,
    refresh = false,
    now: Date = new Date()
  ): Promise<Last24HoursKpi> {
    const filters = this.getFilters(query);
    const end = now.toISOString();
    const currentStartDate = new Date(now.getTime() - DAY_MS);
    const previousStartDate = new Date(currentStartDate.getTime() - DAY_MS);

    const currentWindow = {
      start: currentStartDate.toISOString(),
      end,
    };
    const previousWindow = {
      start: previousStartDate.toISOString(),
      end: currentStartDate.toISOString(),
    };

    const cacheKey = buildCacheKey('kpi:last24h', filters, {
      window: currentWindow,
      previousWindow,
    });

    return this.withCache(cacheKey, refresh, async () => {
      const [currentCount, previousCount] = await Promise.all([
        this.repository.countIncidentsByReportedRange(filters, currentWindow),
        this.repository.countIncidentsByReportedRange(filters, previousWindow),
      ]);

      const delta = currentCount - previousCount;
      const deltaPercentage =
        previousCount === 0 ? null : clampPercentage((delta / previousCount) * 100);

      return {
        window: currentWindow,
        previousWindow,
        currentCount,
        previousCount,
        delta,
        deltaPercentage,
      } satisfies Last24HoursKpi;
    });
  }

  public async getIncidentsByType(
    query: Record<string, QueryValue>,
    refresh = false,
    now: Date = new Date()
  ): Promise<TypeDistribution> {
    const filters = this.getFilters(query);
    const range = {
      start: new Date(now.getTime() - 7 * DAY_MS).toISOString(),
      end: now.toISOString(),
    };
    const cacheKey = buildCacheKey('incidents:byType', filters, range);

    return this.withCache(cacheKey, refresh, async () => {
      const buckets = await this.repository.getIncidentCountsByType(filters, range);
      const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

      const normalizedBuckets: TypeDistributionBucket[] = buckets.map((bucket) => ({
        ...bucket,
        percentage: total > 0 ? clampPercentage((bucket.count / total) * 100) : 0,
      }));

      return {
        total,
        buckets: normalizedBuckets,
      } satisfies TypeDistribution;
    });
  }

  public async getDailyTrend(
    query: Record<string, QueryValue>,
    refresh = false,
    now: Date = new Date()
  ): Promise<DailyTrend> {
    const filters = this.getFilters(query);
    const endDate = new Date(now);
    const normalizedEnd = new Date(
      Date.UTC(
        endDate.getUTCFullYear(),
        endDate.getUTCMonth(),
        endDate.getUTCDate(),
        23,
        59,
        59,
        999
      )
    );
    const startDate = new Date(normalizedEnd.getTime() - 29 * DAY_MS);
    startDate.setUTCHours(0, 0, 0, 0);

    const range = {
      start: startDate.toISOString(),
      end: normalizedEnd.toISOString(),
    };

    const cacheKey = buildCacheKey('incidents:dailyTrend', filters, range);

    return this.withCache(cacheKey, refresh, async () => {
      const buckets = await this.repository.getIncidentCountsByReportedDay(filters, range);
      const countsByDate = new Map<string, number>();
      for (const bucket of buckets) {
        const dateOnly = formatDateOnly(new Date(bucket.date));
        countsByDate.set(dateOnly, bucket.count);
      }

      const points: IncidentDailyCount[] = [];
      for (let i = 0; i < 30; i += 1) {
        const current = new Date(startDate.getTime() + i * DAY_MS);
        const dateKey = formatDateOnly(current);
        points.push({
          date: new Date(
            Date.UTC(
              current.getUTCFullYear(),
              current.getUTCMonth(),
              current.getUTCDate(),
              0,
              0,
              0,
              0
            )
          ).toISOString(),
          count: countsByDate.get(dateKey) ?? 0,
        });
      }

      const recentSeven = points.slice(-7);
      const previousSeven = points.slice(-14, -7);
      const currentTotal = recentSeven.reduce((sum, point) => sum + point.count, 0);
      const previousTotal = previousSeven.reduce((sum, point) => sum + point.count, 0);
      const change = currentTotal - previousTotal;
      const percentageChange =
        previousTotal === 0 ? null : clampPercentage((change / previousTotal) * 100);
      const direction: 'up' | 'down' | 'flat' = change === 0 ? 'flat' : change > 0 ? 'up' : 'down';

      return {
        points,
        trend: {
          currentTotal,
          previousTotal,
          change,
          percentageChange,
          direction,
        },
      } satisfies DailyTrend;
    });
  }

  public async getSeverityDistribution(
    query: Record<string, QueryValue>,
    refresh = false
  ): Promise<SeverityDistribution> {
    const filters = this.getFilters(query);
    const cacheKey = buildCacheKey('incidents:severityDistribution', filters);

    return this.withCache(cacheKey, refresh, async () => {
      const buckets = await this.repository.getSeverityDistribution(filters);
      const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

      const normalized: SeverityDistributionBucket[] = buckets.map((bucket) => ({
        ...bucket,
        percentage: total > 0 ? clampPercentage((bucket.count / total) * 100) : 0,
      }));

      return {
        total,
        buckets: normalized,
      } satisfies SeverityDistribution;
    });
  }

  public async getRecentIncidents(
    query: Record<string, QueryValue>,
    refresh = false,
    limit = 10
  ): Promise<RecentIncidentSummary[]> {
    const filters = this.getFilters(query);
    const cacheKey = buildCacheKey('incidents:recent', filters, { limit });

    return this.withCache(cacheKey, refresh, async () =>
      this.repository.listRecentIncidents(filters, limit)
    );
  }
}

export const dashboardService = new DashboardService();
