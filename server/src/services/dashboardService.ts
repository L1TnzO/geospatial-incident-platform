import {
  incidentRepository,
  type IncidentDailyCount,
  type IncidentListItem,
  type IncidentSeverityBucket,
  type IncidentTypeBucket,
  type RecentIncidentSummary,
} from '../db';
import { incidentService, type IncidentFilterOptions } from './incidentsService';
import { HttpError } from '../errors/httpError';
import { PassThrough, Transform } from 'stream';

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

export interface IncidentCsvExportMetadata {
  stream: NodeJS.ReadableStream;
  filename: string;
  total: number;
  selectedColumns: ExportColumnDefinition[];
  filters: IncidentFilterOptions;
}

interface ExportColumnDefinition {
  key: string;
  header: string;
  accessor: (item: IncidentListItem) => string;
}

const CSV_NEWLINE = '\r\n';
const MAX_EXPORT_ROWS = 5000;
const EXPORT_THROTTLE_DELAY_MS = 0;

const EXPORT_COLUMN_DEFINITIONS = new Map<string, ExportColumnDefinition>([
  [
    'incidentnumber',
    {
      key: 'incidentNumber',
      header: 'Incident Number',
      accessor: (item) => item.incidentNumber,
    },
  ],
  [
    'title',
    {
      key: 'title',
      header: 'Title',
      accessor: (item) => item.title,
    },
  ],
  [
    'occurrenceat',
    {
      key: 'occurrenceAt',
      header: 'Occurrence At',
      accessor: (item) => item.occurrenceAt,
    },
  ],
  [
    'reportedat',
    {
      key: 'reportedAt',
      header: 'Reported At',
      accessor: (item) => item.reportedAt,
    },
  ],
  [
    'dispatchat',
    {
      key: 'dispatchAt',
      header: 'Dispatch At',
      accessor: (item) => item.dispatchAt ?? '',
    },
  ],
  [
    'arrivalat',
    {
      key: 'arrivalAt',
      header: 'Arrival At',
      accessor: (item) => item.arrivalAt ?? '',
    },
  ],
  [
    'resolvedat',
    {
      key: 'resolvedAt',
      header: 'Resolved At',
      accessor: (item) => item.resolvedAt ?? '',
    },
  ],
  [
    'typecode',
    {
      key: 'typeCode',
      header: 'Type Code',
      accessor: (item) => item.type.code,
    },
  ],
  [
    'typename',
    {
      key: 'typeName',
      header: 'Type Name',
      accessor: (item) => item.type.name,
    },
  ],
  [
    'severitycode',
    {
      key: 'severityCode',
      header: 'Severity Code',
      accessor: (item) => item.severity.code,
    },
  ],
  [
    'severityname',
    {
      key: 'severityName',
      header: 'Severity Name',
      accessor: (item) => item.severity.name,
    },
  ],
  [
    'severitypriority',
    {
      key: 'severityPriority',
      header: 'Severity Priority',
      accessor: (item) => String(item.severity.priority),
    },
  ],
  [
    'statuscode',
    {
      key: 'statusCode',
      header: 'Status Code',
      accessor: (item) => item.status.code,
    },
  ],
  [
    'statusname',
    {
      key: 'statusName',
      header: 'Status Name',
      accessor: (item) => item.status.name,
    },
  ],
  [
    'isactive',
    {
      key: 'isActive',
      header: 'Is Active',
      accessor: (item) => (item.isActive ? 'true' : 'false'),
    },
  ],
  [
    'casualtycount',
    {
      key: 'casualtyCount',
      header: 'Casualty Count',
      accessor: (item) => String(item.casualtyCount),
    },
  ],
  [
    'responderinjuries',
    {
      key: 'responderInjuries',
      header: 'Responder Injuries',
      accessor: (item) => String(item.responderInjuries),
    },
  ],
  [
    'estimateddamage',
    {
      key: 'estimatedDamageAmount',
      header: 'Estimated Damage Amount',
      accessor: (item) => item.estimatedDamageAmount ?? '',
    },
  ],
  [
    'primarystationcode',
    {
      key: 'primaryStationCode',
      header: 'Primary Station Code',
      accessor: (item) => item.primaryStation?.stationCode ?? '',
    },
  ],
  [
    'primarystationname',
    {
      key: 'primaryStationName',
      header: 'Primary Station Name',
      accessor: (item) => item.primaryStation?.name ?? '',
    },
  ],
  [
    'sourcecode',
    {
      key: 'sourceCode',
      header: 'Source Code',
      accessor: (item) => item.source?.code ?? '',
    },
  ],
  [
    'weathercode',
    {
      key: 'weatherCode',
      header: 'Weather Code',
      accessor: (item) => item.weather?.code ?? '',
    },
  ],
  [
    'longitude',
    {
      key: 'longitude',
      header: 'Longitude',
      accessor: (item) => formatCoordinate(item.location.geometry.coordinates?.[0]),
    },
  ],
  [
    'latitude',
    {
      key: 'latitude',
      header: 'Latitude',
      accessor: (item) => formatCoordinate(item.location.geometry.coordinates?.[1]),
    },
  ],
]);

const DEFAULT_EXPORT_COLUMN_KEYS = [
  'incidentnumber',
  'title',
  'occurrenceat',
  'reportedat',
  'typecode',
  'typename',
  'severitycode',
  'severitypriority',
  'statuscode',
  'isactive',
  'latitude',
  'longitude',
  'primarystationcode',
  'primarystationname',
];

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

const formatCoordinate = (value: unknown): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '';
  }
  return value.toFixed(6);
};

type CsvPrimitive = string | number | boolean | null | undefined;

const csvEscape = (value: CsvPrimitive): string => {
  if (value == null) {
    return '';
  }
  const stringValue = String(value);
  if (/[",\r\n]/u.test(stringValue)) {
    return `"${stringValue.replace(/"/gu, '""')}"`;
  }
  return stringValue;
};

const parseIncludeColumns = (value: QueryValue): string[] | undefined => {
  if (value == null) {
    return undefined;
  }

  const raw = Array.isArray(value) ? value : value.split(',');
  const normalized = raw
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return normalized.length ? normalized : undefined;
};

const parseExportLimit = (value: QueryValue): number | undefined => {
  if (value == null) {
    return undefined;
  }
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined) {
    return undefined;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw HttpError.badRequest("Query parameter 'limit' must be a positive integer.");
  }
  if (parsed > MAX_EXPORT_ROWS) {
    throw HttpError.badRequest(`Query parameter 'limit' cannot exceed ${MAX_EXPORT_ROWS}.`);
  }
  return Math.floor(parsed);
};

const formatFilterSummary = (filters: IncidentFilterOptions): string => {
  const segments: string[] = [];
  if (filters.incidentNumber) {
    segments.push(`incidentNumber=${filters.incidentNumber}`);
  }
  if (filters.typeCodes?.length) {
    segments.push(`typeCodes=${filters.typeCodes.join('|')}`);
  }
  if (filters.severityCodes?.length) {
    segments.push(`severityCodes=${filters.severityCodes.join('|')}`);
  }
  if (filters.statusCodes?.length) {
    segments.push(`statusCodes=${filters.statusCodes.join('|')}`);
  }
  if (typeof filters.isActive === 'boolean') {
    segments.push(`isActive=${filters.isActive}`);
  }
  if (filters.startDate) {
    segments.push(`startDate=${filters.startDate}`);
  }
  if (filters.endDate) {
    segments.push(`endDate=${filters.endDate}`);
  }
  return segments.length ? segments.join('; ') : 'none';
};

const formatFilenameTimestamp = (input: Date): string => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${input.getUTCFullYear()}${pad(input.getUTCMonth() + 1)}${pad(input.getUTCDate())}-${pad(input.getUTCHours())}${pad(input.getUTCMinutes())}${pad(input.getUTCSeconds())}`;
};

const createThrottleTransform = (delayMs: number) =>
  new Transform({
    objectMode: true,
    transform(chunk, _encoding, callback) {
      if (delayMs > 0) {
        setTimeout(() => callback(null, chunk), delayMs);
        return;
      }
      setImmediate(() => callback(null, chunk));
    },
  });

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

  private resolveExportColumns(includeColumns: QueryValue): ExportColumnDefinition[] {
    const requestedKeys = parseIncludeColumns(includeColumns) ?? DEFAULT_EXPORT_COLUMN_KEYS;
    const seen = new Set<string>();
    const columns: ExportColumnDefinition[] = [];
    const supported = Array.from(
      new Set(Array.from(EXPORT_COLUMN_DEFINITIONS.values()).map((col) => col.key))
    ).join(', ');

    for (const key of requestedKeys) {
      const normalizedKey = key.toLowerCase();
      const definition = EXPORT_COLUMN_DEFINITIONS.get(normalizedKey);
      if (!definition) {
        throw HttpError.badRequest(`Unknown column '${key}'. Supported columns: ${supported}.`);
      }
      if (!seen.has(definition.key)) {
        columns.push(definition);
        seen.add(definition.key);
      }
    }

    return columns;
  }

  public async prepareIncidentsExport(
    query: Record<string, QueryValue>,
    now: Date = new Date()
  ): Promise<IncidentCsvExportMetadata> {
    const filters = this.getFilters(query);
    const limitParam = parseExportLimit(query.limit);
    const columns = this.resolveExportColumns(query.includeColumns);

    const total = await this.repository.countIncidents(filters);
    const effectiveLimit = Math.min(limitParam ?? MAX_EXPORT_ROWS, MAX_EXPORT_ROWS);

    if (total > effectiveLimit) {
      throw HttpError.badRequest(
        `Filtered export matches ${total} incidents which exceeds the export limit of ${effectiveLimit}. Please refine your filters or request a smaller result set.`
      );
    }

    const exportStream = this.repository.createIncidentExportStream(filters, {
      limit: effectiveLimit,
      sortBy: filters.sortBy,
      sortDirection: filters.sortDirection,
    });

    const throttled = exportStream.pipe(createThrottleTransform(EXPORT_THROTTLE_DELAY_MS));
    const csvStream = new PassThrough();

    const metadataLines = [
      `Generated At: ${now.toISOString()}`,
      `Record Count: ${total}`,
      `Filters: ${formatFilterSummary(filters)}`,
      `Columns: ${columns.map((column) => column.header).join(', ')}`,
    ];

    for (const line of metadataLines) {
      csvStream.write(`# ${line}${CSV_NEWLINE}`);
    }
    csvStream.write(columns.map((column) => csvEscape(column.header)).join(',') + CSV_NEWLINE);

    throttled.on('data', (item: IncidentListItem) => {
      const row = columns.map((column) => csvEscape(column.accessor(item))).join(',');
      if (!csvStream.write(row + CSV_NEWLINE)) {
        throttled.pause();
        csvStream.once('drain', () => throttled.resume());
      }
    });

    throttled.on('end', () => csvStream.end());
    throttled.on('error', (error) => {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      csvStream.destroy(normalizedError);
    });

    const filename = `incidents-export-${formatFilenameTimestamp(now)}.csv`;

    return {
      stream: csvStream,
      filename,
      total,
      selectedColumns: columns,
      filters,
    };
  }
}

export const dashboardService = new DashboardService();
