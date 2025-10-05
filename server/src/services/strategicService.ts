import { incidentRepository, type GeoJsonPolygon, type IncidentLookupValue } from '../db';
import { incidentService, type IncidentFilterOptions } from './incidentsService';
import { HttpError } from '../errors/httpError';

const STRATEGIC_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MONTH_WINDOW = 12;
const MAX_MONTH_WINDOW = 36;
const DEFAULT_QUARTER_WINDOW = 8;
const MAX_QUARTER_WINDOW = 12;
const HOTSPOT_DEFAULT_RESOLUTION = 4;
const HOTSPOT_MIN_RESOLUTION = 1;
const HOTSPOT_MAX_RESOLUTION = 8;
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const HOTSPOT_CELL_SIZE_BY_RESOLUTION: Record<number, number> = {
  1: 4000,
  2: 2000,
  3: 1000,
  4: 500,
  5: 250,
  6: 125,
  7: 60,
  8: 30,
};

type QueryValue = string | string[] | undefined;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export interface MonthlyTrendPoint {
  month: string;
  label: string;
  start: string;
  end: string;
  count: number;
  previousMonthCount: number | null;
  monthOverMonthDelta: number | null;
  monthOverMonthPercentage: number | null;
  previousYearCount: number | null;
  yearOverYearDelta: number | null;
  yearOverYearPercentage: number | null;
}

export interface MonthlyTrendResponse {
  range: {
    start: string;
    end: string;
    months: number;
  };
  series: MonthlyTrendPoint[];
  totals: {
    currentPeriodTotal: number;
    previousPeriodTotal: number | null;
    periodDelta: number | null;
    periodPercentage: number | null;
  };
}

export interface QuarterlyTrendPoint {
  year: number;
  quarter: number;
  label: string;
  start: string;
  end: string;
  count: number;
  previousQuarterCount: number | null;
  quarterOverQuarterDelta: number | null;
  quarterOverQuarterPercentage: number | null;
  previousYearCount: number | null;
  yearOverYearDelta: number | null;
  yearOverYearPercentage: number | null;
}

export interface QuarterlyTrendResponse {
  range: {
    start: string;
    end: string;
    quarters: number;
  };
  series: QuarterlyTrendPoint[];
  summary: {
    current: QuarterlyTrendPoint | null;
    previous: QuarterlyTrendPoint | null;
    delta: number | null;
    percentage: number | null;
    yearOverYearReference: QuarterlyTrendPoint | null;
    yearOverYearDelta: number | null;
    yearOverYearPercentage: number | null;
  };
}

export interface TypeTimelinePoint {
  month: string;
  start: string;
  end: string;
  count: number;
}

export interface TypeTimelineSeries {
  type: IncidentLookupValue;
  total: number;
  points: TypeTimelinePoint[];
}

export interface TypeTimelineResponse {
  range: {
    start: string;
    end: string;
    months: number;
  };
  totalsByMonth: Array<{
    month: string;
    start: string;
    end: string;
    count: number;
  }>;
  types: TypeTimelineSeries[];
}

export interface HotspotCell {
  cellId: string;
  geometry: GeoJsonPolygon;
  centroid: {
    latitude: number;
    longitude: number;
  };
  incidentCount: number;
  intensity: number;
}

export interface HotspotResponse {
  metadata: {
    resolution: number;
    cellSizeMeters: number;
    cellAreaSquareMeters: number;
    totalIncidents: number;
    maxIncidentCount: number;
    cellCount: number;
    generatedAt: string;
  };
  cells: HotspotCell[];
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
    isActive: typeof filters.isActive === 'boolean' ? filters.isActive : null,
  };

  return `${prefix}:${JSON.stringify({ filters: normalizedFilters, extra })}`;
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

const startOfMonth = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));

const endOfMonth = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));

const addMonths = (date: Date, offset: number): Date => {
  const clone = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
  clone.setUTCMonth(clone.getUTCMonth() + offset);
  return clone;
};

const startOfQuarter = (date: Date): Date => {
  const quarterIndex = Math.floor(date.getUTCMonth() / 3);
  return new Date(Date.UTC(date.getUTCFullYear(), quarterIndex * 3, 1, 0, 0, 0, 0));
};

const endOfQuarter = (date: Date): Date => {
  const start = startOfQuarter(date);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 3, 0, 23, 59, 59, 999));
};

const addQuarters = (date: Date, offset: number): Date => {
  const clone = startOfQuarter(date);
  clone.setUTCMonth(clone.getUTCMonth() + offset * 3);
  return clone;
};

const formatMonthKey = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const formatQuarterKey = (date: Date): string => {
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${date.getUTCFullYear()}-Q${quarter}`;
};

const formatMonthLabel = (date: Date): string =>
  `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;

const formatQuarterLabel = (date: Date): string =>
  `Q${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`;

const parseWindowParam = (
  value: QueryValue,
  field: string,
  { defaultValue, min, max }: { defaultValue: number; min: number; max: number }
): number => {
  if (value === undefined) {
    return defaultValue;
  }

  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined) {
    return defaultValue;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < min) {
    throw HttpError.badRequest(
      `Query parameter '${field}' must be a number greater than or equal to ${min}.`
    );
  }
  if (parsed > max) {
    throw HttpError.badRequest(`Query parameter '${field}' cannot exceed ${max}.`);
  }
  return Math.trunc(parsed);
};

const parseResolutionParam = (value: QueryValue): number => {
  if (value === undefined) {
    return HOTSPOT_DEFAULT_RESOLUTION;
  }

  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === null || raw === '') {
    return HOTSPOT_DEFAULT_RESOLUTION;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    throw HttpError.badRequest("Query parameter 'resolution' must be an integer between 1 and 8.");
  }

  if (parsed < HOTSPOT_MIN_RESOLUTION || parsed > HOTSPOT_MAX_RESOLUTION) {
    throw HttpError.badRequest(
      `Query parameter 'resolution' must be between ${HOTSPOT_MIN_RESOLUTION} and ${HOTSPOT_MAX_RESOLUTION}.`
    );
  }

  const cellSize = HOTSPOT_CELL_SIZE_BY_RESOLUTION[parsed];
  if (!cellSize) {
    throw HttpError.badRequest('Resolution not supported for hotspot grid.');
  }

  return parsed;
};

const getCellSizeMetersForResolution = (resolution: number): number => {
  const cellSize = HOTSPOT_CELL_SIZE_BY_RESOLUTION[resolution];
  if (!cellSize) {
    throw HttpError.badRequest('Resolution not supported for hotspot grid.');
  }
  return cellSize;
};

const parseGeoJson = <T>(input: unknown): T | null => {
  if (input === null || input === undefined) {
    return null;
  }
  if (typeof input === 'string') {
    try {
      return JSON.parse(input) as T;
    } catch {
      return null;
    }
  }
  return input as T;
};

const parseCoordinateArray = (candidate: unknown): [number, number] | null => {
  if (!Array.isArray(candidate) || candidate.length < 2) {
    return null;
  }
  const typedCandidate: readonly unknown[] = candidate;
  const lngCandidate = typedCandidate[0];
  const latCandidate = typedCandidate[1];
  if (typeof lngCandidate === 'number' && typeof latCandidate === 'number') {
    return [lngCandidate, latCandidate];
  }
  return null;
};

const parseCoordinatePair = (value: unknown): [number, number] | null => {
  const fromArray = parseCoordinateArray(value);
  if (fromArray) {
    return fromArray;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parseCoordinateArray(parsed);
    } catch {
      return null;
    }
  }
  return null;
};

const toIsoString = (date: Date): string => date.toISOString();

export class StrategicAnalyticsService {
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
      expiresAt: Date.now() + STRATEGIC_CACHE_TTL_MS,
    });
    return value;
  }

  private async withCache<T>(key: string, resolver: () => Promise<T>): Promise<T> {
    const cached = this.getFromCache<T>(key);
    if (cached !== null) {
      return cached;
    }
    const value = await resolver();
    return this.setCache(key, value);
  }

  public async getMonthlyTrend(
    query: Record<string, QueryValue>,
    now: Date = new Date()
  ): Promise<MonthlyTrendResponse> {
    const filters = this.getFilters(query);
    const months = parseWindowParam(query.months, 'months', {
      defaultValue: DEFAULT_MONTH_WINDOW,
      min: 3,
      max: MAX_MONTH_WINDOW,
    });

    const effectiveEnd = filters.endDate ? new Date(filters.endDate) : now;
    const seriesEnd = endOfMonth(effectiveEnd);
    const computedStart = addMonths(seriesEnd, -(months - 1));
    const filterStart = filters.startDate ? startOfMonth(new Date(filters.startDate)) : null;
    const seriesStart =
      filterStart && filterStart > computedStart ? filterStart : startOfMonth(computedStart);

    const comparisonWindow = Math.max(months, 12);
    let fetchStart = addMonths(seriesStart, -comparisonWindow);
    if (filterStart && filterStart > fetchStart) {
      fetchStart = filterStart;
    }
    const fetchRange = {
      start: toIsoString(startOfMonth(fetchStart)),
      end: toIsoString(endOfMonth(seriesEnd)),
    };

    const cacheKey = buildCacheKey('strategic:monthly', filters, {
      months,
      range: fetchRange,
    });

    return this.withCache(cacheKey, async () => {
      const queryFilters: IncidentFilterOptions = {
        ...filters,
        startDate: filters.startDate ?? fetchRange.start,
        endDate: filters.endDate ?? fetchRange.end,
      };

      const rows = await this.repository.getIncidentCountsByReportedMonth(queryFilters, fetchRange);
      const counts = new Map<string, number>();
      for (const row of rows) {
        const key = formatMonthKey(new Date(row.periodStart));
        counts.set(key, row.count);
      }

      const series: MonthlyTrendPoint[] = [];
      const monthTotals: number[] = [];
      for (let i = 0; ; i += 1) {
        const currentMonth = addMonths(seriesStart, i);
        if (currentMonth.getTime() > seriesEnd.getTime()) {
          break;
        }
        const key = formatMonthKey(currentMonth);
        const count = counts.get(key) ?? 0;
        const previousPoint = series.length > 0 ? series[series.length - 1] : null;
        const yearOverYearKey = formatMonthKey(addMonths(currentMonth, -12));
        const previousYearCount = counts.has(yearOverYearKey) ? counts.get(yearOverYearKey)! : null;

        const previousMonthCount = previousPoint ? previousPoint.count : null;
        const monthOverMonthDelta = previousMonthCount !== null ? count - previousMonthCount : null;
        const monthOverMonthPercentage =
          previousMonthCount !== null && previousMonthCount !== 0
            ? clampPercentage((monthOverMonthDelta! / previousMonthCount) * 100)
            : null;

        const yearOverYearDelta = previousYearCount !== null ? count - previousYearCount : null;
        const yearOverYearPercentage =
          previousYearCount !== null && previousYearCount !== 0
            ? clampPercentage((yearOverYearDelta! / previousYearCount) * 100)
            : null;

        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);

        series.push({
          month: key,
          label: formatMonthLabel(currentMonth),
          start: toIsoString(start),
          end: toIsoString(end),
          count,
          previousMonthCount,
          monthOverMonthDelta,
          monthOverMonthPercentage,
          previousYearCount,
          yearOverYearDelta,
          yearOverYearPercentage,
        });
        monthTotals.push(count);
      }

      const currentPeriodTotal = monthTotals.reduce((sum, value) => sum + value, 0);
      let previousPeriodTotal: number | null = 0;
      for (let i = 1; i <= months; i += 1) {
        const priorKey = formatMonthKey(addMonths(seriesStart, -i));
        previousPeriodTotal += counts.get(priorKey) ?? 0;
      }
      if (fetchStart.getTime() === seriesStart.getTime()) {
        previousPeriodTotal = null;
      }

      const periodDelta =
        previousPeriodTotal === null ? null : currentPeriodTotal - previousPeriodTotal;
      const periodPercentage =
        previousPeriodTotal === null || previousPeriodTotal === 0 || periodDelta === null
          ? null
          : clampPercentage((periodDelta / previousPeriodTotal) * 100);

      return {
        range: {
          start: toIsoString(startOfMonth(seriesStart)),
          end: toIsoString(seriesEnd),
          months,
        },
        series,
        totals: {
          currentPeriodTotal,
          previousPeriodTotal,
          periodDelta,
          periodPercentage,
        },
      } satisfies MonthlyTrendResponse;
    });
  }

  public async getQuarterlyTrends(
    query: Record<string, QueryValue>,
    now: Date = new Date()
  ): Promise<QuarterlyTrendResponse> {
    const filters = this.getFilters(query);
    const quarters = parseWindowParam(query.quarters, 'quarters', {
      defaultValue: DEFAULT_QUARTER_WINDOW,
      min: 2,
      max: MAX_QUARTER_WINDOW,
    });

    const effectiveEnd = filters.endDate ? new Date(filters.endDate) : now;
    const seriesEnd = endOfQuarter(effectiveEnd);
    const computedStart = addQuarters(seriesEnd, -(quarters - 1));
    const filterStart = filters.startDate ? startOfQuarter(new Date(filters.startDate)) : null;
    const seriesStart =
      filterStart && filterStart > computedStart ? filterStart : startOfQuarter(computedStart);

    const comparisonQuarters = Math.max(quarters, 4);
    let fetchStart = addQuarters(seriesStart, -comparisonQuarters);
    if (filterStart && filterStart > fetchStart) {
      fetchStart = filterStart;
    }
    const fetchRange = {
      start: toIsoString(startOfQuarter(fetchStart)),
      end: toIsoString(seriesEnd),
    };

    const cacheKey = buildCacheKey('strategic:quarterly', filters, {
      quarters,
      range: fetchRange,
    });

    return this.withCache(cacheKey, async () => {
      const queryFilters: IncidentFilterOptions = {
        ...filters,
        startDate: filters.startDate ?? fetchRange.start,
        endDate: filters.endDate ?? fetchRange.end,
      };

      const rows = await this.repository.getIncidentCountsByReportedQuarter(
        queryFilters,
        fetchRange
      );
      const counts = new Map<
        string,
        { count: number; year: number; quarter: number; start: string }
      >();
      for (const row of rows) {
        const start = new Date(row.periodStart);
        const key = formatQuarterKey(start);
        counts.set(key, {
          count: row.count,
          year: row.year,
          quarter: row.quarter,
          start: row.periodStart,
        });
      }

      const series: QuarterlyTrendPoint[] = [];
      for (let i = 0; ; i += 1) {
        const currentQuarter = addQuarters(seriesStart, i);
        if (currentQuarter.getTime() > seriesEnd.getTime()) {
          break;
        }
        const key = formatQuarterKey(currentQuarter);
        const entry = counts.get(key);
        const count = entry?.count ?? 0;
        const start = startOfQuarter(currentQuarter);
        const end = endOfQuarter(currentQuarter);

        const previousQuarterKey = formatQuarterKey(addQuarters(currentQuarter, -1));
        const previousQuarterCount = counts.get(previousQuarterKey)?.count ?? null;
        const quarterOverQuarterDelta =
          previousQuarterCount !== null ? count - previousQuarterCount : null;
        const quarterOverQuarterPercentage =
          previousQuarterCount !== null && previousQuarterCount !== 0
            ? clampPercentage((quarterOverQuarterDelta! / previousQuarterCount) * 100)
            : null;

        const previousYearKey = formatQuarterKey(addQuarters(currentQuarter, -4));
        const previousYearCount = counts.get(previousYearKey)?.count ?? null;
        const yearOverYearDelta = previousYearCount !== null ? count - previousYearCount : null;
        const yearOverYearPercentage =
          previousYearCount !== null && previousYearCount !== 0
            ? clampPercentage((yearOverYearDelta! / previousYearCount) * 100)
            : null;

        series.push({
          year: currentQuarter.getUTCFullYear(),
          quarter: Math.floor(currentQuarter.getUTCMonth() / 3) + 1,
          label: formatQuarterLabel(currentQuarter),
          start: toIsoString(start),
          end: toIsoString(end),
          count,
          previousQuarterCount,
          quarterOverQuarterDelta,
          quarterOverQuarterPercentage,
          previousYearCount,
          yearOverYearDelta,
          yearOverYearPercentage,
        });
      }

      const current = series.at(-1) ?? null;
      const previous = series.length > 1 ? series[series.length - 2] : null;
      const yearOverYearReference = series.length > 4 ? series[series.length - 5] : null;
      const delta = current && previous ? current.count - previous.count : null;
      const percentage =
        current && previous && previous.count !== 0
          ? clampPercentage(((current.count - previous.count) / previous.count) * 100)
          : null;
      const yearOverYearDelta =
        current && yearOverYearReference ? current.count - yearOverYearReference.count : null;
      const yearOverYearPercentage =
        current && yearOverYearReference && yearOverYearReference.count !== 0
          ? clampPercentage(
              ((current.count - yearOverYearReference.count) / yearOverYearReference.count) * 100
            )
          : null;

      return {
        range: {
          start: toIsoString(startOfQuarter(seriesStart)),
          end: toIsoString(seriesEnd),
          quarters,
        },
        series,
        summary: {
          current,
          previous,
          delta,
          percentage,
          yearOverYearReference,
          yearOverYearDelta,
          yearOverYearPercentage,
        },
      } satisfies QuarterlyTrendResponse;
    });
  }

  public async getTypeTimeline(
    query: Record<string, QueryValue>,
    now: Date = new Date()
  ): Promise<TypeTimelineResponse> {
    const filters = this.getFilters(query);
    const months = parseWindowParam(query.months, 'months', {
      defaultValue: DEFAULT_MONTH_WINDOW,
      min: 3,
      max: 24,
    });

    const effectiveEnd = filters.endDate ? new Date(filters.endDate) : now;
    const seriesEnd = endOfMonth(effectiveEnd);
    const computedStart = addMonths(seriesEnd, -(months - 1));
    const filterStart = filters.startDate ? startOfMonth(new Date(filters.startDate)) : null;
    const seriesStart =
      filterStart && filterStart > computedStart ? filterStart : startOfMonth(computedStart);

    const fetchRange = {
      start: toIsoString(seriesStart),
      end: toIsoString(seriesEnd),
    };

    const cacheKey = buildCacheKey('strategic:types', filters, {
      months,
      range: fetchRange,
    });

    return this.withCache(cacheKey, async () => {
      const queryFilters: IncidentFilterOptions = {
        ...filters,
        startDate: filters.startDate ?? fetchRange.start,
        endDate: filters.endDate ?? fetchRange.end,
      };

      const rows = await this.repository.getIncidentTypeTimeline(queryFilters, fetchRange);
      const typeSeries = new Map<string, TypeTimelineSeries>();
      const monthTotals = new Map<string, number>();

      for (const row of rows) {
        const monthDate = new Date(row.periodStart);
        const key = formatMonthKey(monthDate);
        monthTotals.set(key, (monthTotals.get(key) ?? 0) + row.count);

        const type = row.type;
        const seriesKey = type.code;
        if (!typeSeries.has(seriesKey)) {
          typeSeries.set(seriesKey, {
            type,
            total: 0,
            points: [],
          });
        }
        const bucket = typeSeries.get(seriesKey)!;
        bucket.total += row.count;
        bucket.points.push({
          month: key,
          start: toIsoString(startOfMonth(monthDate)),
          end: toIsoString(endOfMonth(monthDate)),
          count: row.count,
        });
      }

      // Ensure each type has entries for every month (fill gaps with zero counts)
      const orderedMonths: string[] = [];
      for (let i = 0; ; i += 1) {
        const current = addMonths(seriesStart, i);
        if (current.getTime() > seriesEnd.getTime()) {
          break;
        }
        orderedMonths.push(formatMonthKey(current));
      }

      for (const series of typeSeries.values()) {
        const byMonth = new Map(series.points.map((point) => [point.month, point] as const));
        const filledPoints: TypeTimelinePoint[] = [];
        for (const monthKey of orderedMonths) {
          const existing = byMonth.get(monthKey);
          if (existing) {
            filledPoints.push(existing);
          } else {
            const dateParts = monthKey.split('-').map((part) => Number(part));
            const date = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, 1));
            filledPoints.push({
              month: monthKey,
              start: toIsoString(startOfMonth(date)),
              end: toIsoString(endOfMonth(date)),
              count: 0,
            });
          }
        }
        series.points = filledPoints.sort((a, b) => a.month.localeCompare(b.month));
      }

      const totalsByMonth = orderedMonths.map((monthKey) => {
        const dateParts = monthKey.split('-').map((part) => Number(part));
        const date = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, 1));
        return {
          month: monthKey,
          start: toIsoString(startOfMonth(date)),
          end: toIsoString(endOfMonth(date)),
          count: monthTotals.get(monthKey) ?? 0,
        };
      });

      return {
        range: {
          start: toIsoString(seriesStart),
          end: toIsoString(seriesEnd),
          months,
        },
        totalsByMonth,
        types: Array.from(typeSeries.values()).sort((a, b) => {
          if (a.total === b.total) {
            return a.type.code.localeCompare(b.type.code);
          }
          return b.total - a.total;
        }),
      } satisfies TypeTimelineResponse;
    });
  }

  public async getHotspots(query: Record<string, QueryValue>): Promise<HotspotResponse> {
    const filters = this.getFilters(query);
    const resolution = parseResolutionParam(query.resolution);
    const cellSizeMeters = getCellSizeMetersForResolution(resolution);

    const cacheKey = buildCacheKey('strategic:hotspots', filters, { resolution });

    return this.withCache(cacheKey, async () => {
      const rows = await this.repository.getIncidentHotspotAggregates(filters, {
        cellSizeMeters,
        resolution,
      });

      if (!rows.length) {
        return {
          metadata: {
            resolution,
            cellSizeMeters,
            cellAreaSquareMeters: cellSizeMeters * cellSizeMeters,
            totalIncidents: 0,
            maxIncidentCount: 0,
            cellCount: 0,
            generatedAt: new Date().toISOString(),
          },
          cells: [],
        } satisfies HotspotResponse;
      }

      const totalIncidents = rows.reduce((sum, row) => sum + row.incidentCount, 0);
      const maxIncidentCount = rows.reduce((max, row) => Math.max(max, row.incidentCount), 0);

      const cells: HotspotCell[] = rows.map((row) => {
        const polygonGeometry = parseGeoJson<{
          type: string;
          coordinates: number[][][];
        }>(row.geometry);

        const geometry: GeoJsonPolygon = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: polygonGeometry?.coordinates ?? [],
          },
        };

        const coordinates = parseCoordinatePair(row.centroidCoordinates) ?? [0, 0];
        const [longitude, latitude] = coordinates;
        const intensity = maxIncidentCount > 0 ? row.incidentCount / maxIncidentCount : 0;

        return {
          cellId: row.cellId,
          geometry,
          centroid: {
            latitude,
            longitude,
          },
          incidentCount: row.incidentCount,
          intensity: Number(intensity.toFixed(4)),
        } satisfies HotspotCell;
      });

      return {
        metadata: {
          resolution,
          cellSizeMeters,
          cellAreaSquareMeters: cellSizeMeters * cellSizeMeters,
          totalIncidents,
          maxIncidentCount,
          cellCount: cells.length,
          generatedAt: new Date().toISOString(),
        },
        cells,
      } satisfies HotspotResponse;
    });
  }
}

export const strategicService = new StrategicAnalyticsService();
