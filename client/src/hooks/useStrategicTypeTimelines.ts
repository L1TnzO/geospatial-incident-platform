import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardFilterParams } from '@/types/dashboard';
import type { StrategicTypeTimelinePoint, StrategicTypeTimelineResponse } from '@/types/strategic';
import { fetchTypeTimelines } from '@/services/strategicAnalyticsService';
import { useStrategicQuery, type StrategicQueryState } from './useStrategicQuery';
import { useStrategicFilters } from './useStrategicFilters';
import { useIncidentTableData } from './useIncidentTableData';

const DEFAULT_WINDOWS = [7, 14, 30];
const ALL_TYPES_LABEL = 'All incident types';

interface CachedTypeTrend {
  points: StrategicTypeTrendPoint[];
  movingAverageSeries: StrategicTypeTrendPoint[];
  summary: StrategicTypeTimelineSummary;
  typeName: string;
}

export interface StrategicTypeTimelineOptions {
  months?: number;
  filters?: Partial<DashboardFilterParams>;
  autoRefreshMs?: number | null;
  availableWindows?: number[];
  defaultTypeCode?: string;
  defaultMovingAverageDays?: number;
}

export interface StrategicTypeTrendPoint extends StrategicTypeTimelinePoint {
  movingAverage?: number;
}

export interface StrategicTypeTimelineSummary {
  latestCount: number | null;
  previousCount: number | null;
  change: number | null;
  changePercentage: number | null;
  movingAverage: number | null;
  movingAverageDelta: number | null;
  movingAveragePercentage: number | null;
}

export interface StrategicTypeTimelinesState
  extends StrategicQueryState<StrategicTypeTimelineResponse> {
  availableTypes: Array<{ code: string; name: string }>;
  selectedTypeCode: string | null;
  selectedTypeName: string | null;
  setSelectedTypeCode: (code: string | null) => void;
  availableWindows: number[];
  movingAverageWindow: number;
  setMovingAverageWindow: (days: number) => void;
  selectedSeries: StrategicTypeTrendPoint[];
  movingAverageSeries: StrategicTypeTrendPoint[];
  summary: StrategicTypeTimelineSummary;
}

const getDaysBetween = (startIso: string, endIso: string): number => {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 30;
  }
  const diff = Math.max(0, end - start);
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24))) + 1;
};

const computeWindowSize = (points: StrategicTypeTimelinePoint[], targetDays: number): number => {
  if (points.length === 0) {
    return 1;
  }

  const averageSpan =
    points.reduce((total, point) => total + getDaysBetween(point.start, point.end), 0) /
    points.length;

  const windowPoints = Math.round(targetDays / Math.max(1, averageSpan));
  return Math.max(1, windowPoints);
};

const computeMovingAverageSeries = (
  points: StrategicTypeTimelinePoint[],
  windowSize: number
): StrategicTypeTrendPoint[] => {
  if (points.length === 0) {
    return [];
  }

  const ordered = [...points].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const averages: StrategicTypeTrendPoint[] = ordered.map((point, index) => {
    const startIndex = Math.max(0, index - windowSize + 1);
    const sample = ordered.slice(startIndex, index + 1);
    const sum = sample.reduce((total, item) => total + item.count, 0);
    const movingAverage = sum / sample.length;
    return {
      ...point,
      movingAverage,
    };
  });

  return averages;
};

const buildSummary = (series: StrategicTypeTrendPoint[]): StrategicTypeTimelineSummary => {
  if (series.length === 0) {
    return {
      latestCount: null,
      previousCount: null,
      change: null,
      changePercentage: null,
      movingAverage: null,
      movingAverageDelta: null,
      movingAveragePercentage: null,
    };
  }

  const latest = series[series.length - 1];
  const previous = series.length > 1 ? series[series.length - 2] : null;

  const latestCount = latest.count ?? null;
  const previousCount = previous?.count ?? null;
  const change =
    latestCount !== null && previousCount !== null ? latestCount - previousCount : null;
  const changePercentage =
    change !== null && previousCount && previousCount !== 0
      ? (change / previousCount) * 100
      : change !== null && previousCount === 0
        ? 100
        : null;

  const latestAverage = latest.movingAverage ?? null;
  const previousAverage = previous?.movingAverage ?? null;
  const movingAverageDelta =
    latestAverage !== null && previousAverage !== null ? latestAverage - previousAverage : null;
  const movingAveragePercentage =
    movingAverageDelta !== null && previousAverage && previousAverage !== 0
      ? (movingAverageDelta / previousAverage) * 100
      : movingAverageDelta !== null && previousAverage === 0
        ? 100
        : null;

  return {
    latestCount,
    previousCount,
    change,
    changePercentage,
    movingAverage: latestAverage,
    movingAverageDelta,
    movingAveragePercentage,
  };
};

export const useStrategicTypeTimelines = (
  options: StrategicTypeTimelineOptions = {}
): StrategicTypeTimelinesState => {
  const {
    months,
    filters,
    autoRefreshMs,
    availableWindows = DEFAULT_WINDOWS,
    defaultTypeCode,
    defaultMovingAverageDays,
  } = options;

  const sanitizedWindows = useMemo(() => {
    const unique = Array.from(new Set(availableWindows.filter((window) => window > 0)));
    if (unique.length === 0) {
      return DEFAULT_WINDOWS;
    }
    return unique.sort((a, b) => a - b);
  }, [availableWindows]);

  const queryState = useStrategicQuery(fetchTypeTimelines, {
    filterOverrides: filters,
    requestParams: months ? { months } : undefined,
    ttlMs: autoRefreshMs,
    errorMessage: 'Failed to load strategic incident type timelines',
  });

  const strategicFilters = useStrategicFilters();
  const primaryFilterType = strategicFilters.typeCodes?.[0] ?? null;

  const { setFilters: setTableFilters } = useIncidentTableData();

  const availableTypes = useMemo(() => {
    if (!queryState.data) {
      return [] as Array<{ code: string; name: string }>;
    }
    return queryState.data.types
      .slice()
      .sort((a, b) => b.total - a.total)
      .map(({ type }) => ({ code: type.code, name: type.name ?? type.code }));
  }, [queryState.data]);

  const [selectedTypeCode, setSelectedTypeState] = useState<string | null>(
    primaryFilterType ?? defaultTypeCode ?? null
  );
  const [movingAverageWindow, setMovingAverageWindowState] = useState<number>(() =>
    defaultMovingAverageDays && sanitizedWindows.includes(defaultMovingAverageDays)
      ? defaultMovingAverageDays
      : sanitizedWindows[0]
  );
  const userHasSelectionRef = useRef(false);
  const cacheRef = useRef<Map<string, CachedTypeTrend>>(new Map());

  useEffect(() => {
    if (!sanitizedWindows.includes(movingAverageWindow)) {
      setMovingAverageWindowState(sanitizedWindows[0]);
    }
  }, [movingAverageWindow, sanitizedWindows]);

  useEffect(() => {
    cacheRef.current.clear();
  }, [queryState.lastUpdated]);

  useEffect(() => {
    if (primaryFilterType) {
      userHasSelectionRef.current = true;
      setSelectedTypeState((current) =>
        current === primaryFilterType ? current : primaryFilterType
      );
      return;
    }

    if (!availableTypes.length) {
      return;
    }

    setSelectedTypeState((current) => {
      if (current && availableTypes.some((type) => type.code === current)) {
        return current;
      }

      if (current === null && userHasSelectionRef.current) {
        return null;
      }

      if (userHasSelectionRef.current && current === null) {
        return null;
      }

      const fallback =
        (defaultTypeCode && availableTypes.some((type) => type.code === defaultTypeCode)
          ? defaultTypeCode
          : availableTypes[0]?.code) ?? null;

      return fallback;
    });
  }, [availableTypes, defaultTypeCode, primaryFilterType]);

  const setSelectedTypeCode = useCallback(
    (code: string | null) => {
      userHasSelectionRef.current = true;
      setSelectedTypeState((current) => {
        if (current === code) {
          return current;
        }
        setTableFilters({ typeCodes: code ? [code] : undefined });
        return code;
      });
    },
    [setTableFilters]
  );

  const setMovingAverageWindow = useCallback(
    (days: number) => {
      if (days === movingAverageWindow || !sanitizedWindows.includes(days)) {
        return;
      }
      setMovingAverageWindowState(days);
    },
    [movingAverageWindow, sanitizedWindows]
  );

  const typeData = useMemo(() => {
    if (!queryState.data) {
      return null;
    }

    const dataVersion = queryState.lastUpdated ?? 'initial';
    const cacheKey = `${selectedTypeCode ?? 'ALL'}|${movingAverageWindow}|${dataVersion}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      return cached;
    }

    const buildTrend = (
      points: StrategicTypeTimelinePoint[],
      typeName: string
    ): CachedTypeTrend => {
      const ordered: StrategicTypeTrendPoint[] = [...points]
        .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
        .map((point) => ({ ...point }));
      const windowSize = computeWindowSize(ordered, movingAverageWindow);
      const movingAverageSeries = computeMovingAverageSeries(ordered, windowSize);
      const summary = buildSummary(movingAverageSeries);
      const result: CachedTypeTrend = {
        points: ordered,
        movingAverageSeries,
        summary,
        typeName,
      };
      cacheRef.current.set(cacheKey, result);
      return result;
    };

    if (!selectedTypeCode) {
      return buildTrend(queryState.data.totalsByMonth, ALL_TYPES_LABEL);
    }

    const match = queryState.data.types.find((entry) => entry.type.code === selectedTypeCode);
    if (!match) {
      if (!availableTypes.length) {
        return null;
      }
      return buildTrend(queryState.data.totalsByMonth, ALL_TYPES_LABEL);
    }

    return buildTrend(match.points, match.type.name ?? selectedTypeCode);
  }, [
    availableTypes.length,
    movingAverageWindow,
    queryState.data,
    queryState.lastUpdated,
    selectedTypeCode,
  ]);

  return {
    ...queryState,
    availableTypes,
    selectedTypeCode,
    selectedTypeName: typeData?.typeName ?? (selectedTypeCode ? selectedTypeCode : ALL_TYPES_LABEL),
    setSelectedTypeCode,
    availableWindows: sanitizedWindows,
    movingAverageWindow,
    setMovingAverageWindow,
    selectedSeries: typeData?.points ?? [],
    movingAverageSeries: typeData?.movingAverageSeries ?? [],
    summary: typeData?.summary ?? {
      latestCount: null,
      previousCount: null,
      change: null,
      changePercentage: null,
      movingAverage: null,
      movingAverageDelta: null,
      movingAveragePercentage: null,
    },
  };
};
